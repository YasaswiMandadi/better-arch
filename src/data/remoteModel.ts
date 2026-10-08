// Shared by the browser (src/data/store.tsx) and the serverless API (api/*).
// Pure functions only — no browser or Node globals — so both sides agree on
// exactly how the site's content is split into MongoDB documents and put
// back together. Keep this file free of runtime imports.

/** Structural twin of SiteDB (src/data/types.ts), kept local so this file has no imports. */
export interface SiteLike {
  site: any;
  themes: any[];
  episodes: any[];
  essays: any[];
  collaborators: any[];
}

export const KINDS = ['site', 'themes', 'episodes', 'essays', 'collaborators'] as const;
export type Kind = (typeof KINDS)[number];

/** One MongoDB document = one piece of content (the site settings, one
 * theme, one episode, one essay, one collaborator). */
export interface ItemDoc {
  _id: string; // `${kind}:${key}`
  kind: Kind;
  key: string;
  order: number; // position inside its array, so ordering survives a round trip
  data: any;
}

export const isKind = (v: unknown): v is Kind => typeof v === 'string' && (KINDS as readonly string[]).includes(v);
export const itemId = (kind: Kind, key: string) => `${kind}:${key}`;

function keyOf(kind: Kind, data: any): string {
  if (kind === 'site') return 'site';
  if (kind === 'episodes') return String(data?.id ?? '');
  return String(data?.slug ?? data?.id ?? '');
}

/** Splits the whole SiteDB into per-item documents. */
export function splitDb(db: SiteLike): ItemDoc[] {
  const out: ItemDoc[] = [{ _id: itemId('site', 'site'), kind: 'site', key: 'site', order: 0, data: db.site }];
  for (const kind of ['themes', 'episodes', 'essays', 'collaborators'] as const) {
    const seen = new Set<string>();
    (db[kind] as any[]).forEach((data, order) => {
      let key = keyOf(kind, data) || `item-${order}`;
      while (seen.has(key)) key = `${key}~${order}`; // never let two items share one document
      seen.add(key);
      out.push({ _id: itemId(kind, key), kind, key, order, data });
    });
  }
  return out;
}

/** Rebuilds a SiteDB from documents; null when the site-settings document is missing. */
export function assembleDb(items: Pick<ItemDoc, 'kind' | 'order' | 'data'>[]): SiteLike | null {
  const site = items.find((i) => i.kind === 'site');
  if (!site) return null;
  const list = (kind: Kind) => items.filter((i) => i.kind === kind).sort((a, b) => a.order - b.order).map((i) => i.data);
  return {
    site: site.data,
    themes: list('themes'),
    episodes: list('episodes'),
    essays: list('essays'),
    collaborators: list('collaborators'),
  };
}

export const isDraftData = (data: any): boolean => Boolean(data) && data.status === 'draft';

/** Content fingerprint used to work out what changed since the last sync. */
export const signature = (doc: Pick<ItemDoc, 'order' | 'data'>): string => `${doc.order}|${JSON.stringify(doc.data)}`;

export function diffItems(prev: Map<string, string>, next: ItemDoc[]): { upserts: ItemDoc[]; deletes: string[]; sigs: Map<string, string> } {
  const sigs = new Map<string, string>();
  const upserts: ItemDoc[] = [];
  for (const doc of next) {
    const sig = signature(doc);
    sigs.set(doc._id, sig);
    if (prev.get(doc._id) !== sig) upserts.push(doc);
  }
  const deletes: string[] = [];
  for (const id of prev.keys()) if (!sigs.has(id)) deletes.push(id);
  return { upserts, deletes, sigs };
}
