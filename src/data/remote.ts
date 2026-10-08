// Browser-side client for the serverless API (api/*) that stores the site's
// content in MongoDB. Everything here is inert unless the app was built with
// VITE_REMOTE=1 — otherwise the site keeps using localStorage exactly as before.
import type { ItemDoc } from './remoteModel';

export const REMOTE_ENABLED = import.meta.env.VITE_REMOTE === '1';

const TOKEN_KEY = 'ba-admin-token';

export function getToken(): string | null {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return null;
    if (!(Number(t.split('.')[0]) > Date.now())) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
}
export function setToken(t: string) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode: session-only */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

async function readJson(r: Response): Promise<any | null> {
  if (!(r.headers.get('content-type') || '').includes('json')) return null; // e.g. an HTML 404 when no API exists
  try { return await r.json(); } catch { return null; }
}

/** All content pages from the API; null when the API is missing or erroring. */
export async function fetchRemote(token: string | null): Promise<{ items: ItemDoc[]; admin: boolean } | null> {
  const items: ItemDoc[] = [];
  let admin = false;
  let offset = 0;
  for (let page = 0; page < 500; page++) {
    let r: Response;
    try {
      r = await fetch(`/api/site?offset=${offset}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
    } catch {
      return null;
    }
    const j = await readJson(r);
    if (!r.ok || !j?.ok || !Array.isArray(j.items)) return null;
    items.push(...j.items);
    admin = Boolean(j.admin);
    if (j.next == null) return { items, admin };
    offset = Number(j.next);
  }
  return null;
}

export type PushResult = 'ok' | 'unauthorized' | 'error';

const MAX_BATCH_DOCS = 100;
const MAX_BATCH_BYTES = 3_000_000;

async function put(token: string, body: unknown): Promise<PushResult> {
  try {
    const r = await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (r.status === 401) return 'unauthorized';
    const j = await readJson(r);
    return r.ok && j?.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

/** Saves changed items in size-limited batches, then removals. */
export async function pushChanges(token: string | null, upserts: ItemDoc[], deletes: string[]): Promise<PushResult> {
  if (!token) return 'unauthorized';
  let batch: { kind: string; key: string; order: number; data: unknown }[] = [];
  let bytes = 0;
  const flush = async () => {
    if (!batch.length) return 'ok' as PushResult;
    const r = await put(token, { upserts: batch, deletes: [] });
    batch = []; bytes = 0;
    return r;
  };
  for (const d of upserts) {
    const item = { kind: d.kind, key: d.key, order: d.order, data: d.data };
    const size = JSON.stringify(item).length;
    if (batch.length && (batch.length >= MAX_BATCH_DOCS || bytes + size > MAX_BATCH_BYTES)) {
      const r = await flush();
      if (r !== 'ok') return r;
    }
    batch.push(item); bytes += size;
  }
  const r = await flush();
  if (r !== 'ok') return r;
  for (let i = 0; i < deletes.length; i += 500) {
    const res = await put(token, { upserts: [], deletes: deletes.slice(i, i + 500) });
    if (res !== 'ok') return res;
  }
  return 'ok';
}

export async function loginRequest(password: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const j = await readJson(r);
    if (r.ok && j?.ok && typeof j.token === 'string') return { ok: true, token: j.token };
    return { ok: false, error: j?.error || 'Could not sign in.' };
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
}
