import { bearer, checkPassword, issueToken, verifyToken } from './auth.js';
import { isDraftData, isKind, itemId, type ItemDoc } from '../../src/data/remoteModel.js';

export interface ItemsStore {
  /** Documents sorted by (kind, order, _id), `limit` of them starting at `offset`. */
  page(offset: number, limit: number): Promise<ItemDoc[]>;
  apply(upserts: ItemDoc[], deletes: string[]): Promise<void>;
}

// Minimal request/response shapes (what Vercel's Node runtime provides).
export interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: any;
}
export interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

const PAGE_BYTES = 3_000_000; // stay well under Vercel's 4.5 MB response limit
const PAGE_DOCS = 60;
const MAX_UPSERTS = 200;
const MAX_DELETES = 1000;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function fail(res: Res, code: number, error: string) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).json({ ok: false, error });
}

/** GET /api/site?offset=N — a page of content. PUT /api/site — save changes (admin only). */
export function makeSiteHandler(getStore: () => Promise<ItemsStore>) {
  return async function handler(req: Req, res: Res) {
    try {
      const admin = verifyToken(bearer(req.headers.authorization));

      if (req.method === 'GET') {
        const store = await getStore();
        const offset = Math.max(0, Number.parseInt(first(req.query?.offset) ?? '0', 10) || 0);
        const docs = await store.page(offset, PAGE_DOCS);
        const items: ItemDoc[] = [];
        let bytes = 0;
        let consumed = 0;
        for (const d of docs) {
          // The public never sees drafts — only a signed-in admin does.
          const visible = admin || !isDraftData(d.data);
          const size = visible ? JSON.stringify(d).length : 0;
          if (visible && items.length > 0 && bytes + size > PAGE_BYTES) break;
          consumed++;
          if (visible) { items.push(d); bytes += size; }
        }
        const next = docs.length === PAGE_DOCS || consumed < docs.length ? offset + consumed : null;
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ ok: true, admin, items, next });
        return;
      }

      if (req.method === 'PUT') {
        if (!admin) return fail(res, 401, 'Sign in again to save changes.');
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const upserts: unknown = body?.upserts ?? [];
        const deletes: unknown = body?.deletes ?? [];
        if (!Array.isArray(upserts) || !Array.isArray(deletes)) return fail(res, 400, 'Malformed request.');
        if (upserts.length > MAX_UPSERTS || deletes.length > MAX_DELETES) return fail(res, 413, 'Too many changes in one request.');
        const docs: ItemDoc[] = [];
        for (const u of upserts as any[]) {
          if (!u || !isKind(u.kind) || typeof u.key !== 'string' || !u.key || u.key.length > 300) return fail(res, 400, 'Malformed item.');
          if (u.data === null || typeof u.data !== 'object') return fail(res, 400, 'Malformed item data.');
          const order = Number.isInteger(u.order) && u.order >= 0 ? u.order : 0;
          docs.push({ _id: itemId(u.kind, u.key), kind: u.kind, key: u.key, order, data: u.data });
        }
        const ids: string[] = [];
        for (const id of deletes as unknown[]) {
          if (typeof id !== 'string' || !id.includes(':') || id.length > 400) return fail(res, 400, 'Malformed delete.');
          if (id === 'site:site') return fail(res, 400, 'The site settings cannot be deleted.');
          ids.push(id);
        }
        const store = await getStore();
        await store.apply(docs, ids);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ ok: true, saved: docs.length, deleted: ids.length });
        return;
      }

      res.setHeader('Allow', 'GET, PUT');
      return fail(res, 405, 'Method not allowed.');
    } catch (e: any) {
      console.error('[api/site]', e?.message || e);
      return fail(res, 500, 'The database is not reachable right now.');
    }
  };
}

/** POST /api/login {password} → {token, expiresAt}. */
export function makeLoginHandler() {
  return async function handler(req: Req, res: Res) {
    try {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return fail(res, 405, 'Method not allowed.');
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!process.env.ADMIN_PASSWORD) return fail(res, 503, 'Admin login is not configured on the server (ADMIN_PASSWORD).');
      if (!checkPassword(body?.password)) {
        await new Promise((r) => setTimeout(r, 600)); // slow down guessing
        return fail(res, 401, 'Incorrect password.');
      }
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ ok: true, ...issueToken() });
    } catch (e: any) {
      console.error('[api/login]', e?.message || e);
      return fail(res, 400, 'Malformed request.');
    }
  };
}
