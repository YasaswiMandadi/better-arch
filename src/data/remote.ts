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

/** Uploads the converted homepage eye video (admin). Resolves to an error message, or null on success. */
export async function uploadEyeVideo(token: string | null, video: { id: string; mime: string; base64: string }): Promise<string | null> {
  if (!token) return 'Sign in again to upload.';
  try {
    const r = await fetch('/api/eye-video', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: video.id, mime: video.mime, data: video.base64 }),
    });
    const j = await readJson(r);
    if (r.ok && j?.ok) return null;
    return j?.error || `Upload failed (${r.status}).`;
  } catch {
    return 'Could not reach the server.';
  }
}

/** Removes the uploaded eye video (admin); the homepage falls back to the built-in eye. */
export async function deleteEyeVideo(token: string | null): Promise<string | null> {
  if (!token) return 'Sign in again to change the video.';
  try {
    const r = await fetch('/api/eye-video', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const j = await readJson(r);
    return r.ok && j?.ok ? null : j?.error || `Request failed (${r.status}).`;
  } catch {
    return 'Could not reach the server.';
  }
}

// ---------------------------------------------------------------- Contact messages (console)

/** The four Contact-page forms, in the order the API's stats use. */
export const MESSAGE_TYPES = ['general', 'episode', 'propose', 'contribute'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export interface ContactMessage {
  id: string;
  type: string;
  name: string;
  email: string;
  org: string;
  subject: string;
  guest: string;
  topic: string;
  msg: string;
  flags: string[];
  createdAt: string;
  read: boolean;
  emailed: boolean;
}

export interface MessageStats {
  total: number;
  /** true when there are more messages than the charts include (20,000+) */
  capped: boolean;
  /** one per message: [time ms, type index (MESSAGE_TYPES), unread 1/0, flagged 1/0] */
  events: [number, number, number, number][];
  /** distinct people (by email address) */
  people: number;
  /** the most recent 300 people who wrote */
  senders: { name: string; email: string; count: number; unread: number; last: string }[];
}

export type MessagesPage = { ok: true; items: ContactMessage[]; next: string | null; stats?: MessageStats } | { ok: false; error: string; status: number };

export interface MessageFilter { email?: string; type?: string; unread?: boolean; /** page size (default 50, max 200) */ limit?: number }

/** Lists Contact-page messages, newest first (admin). The first page (no `before`) also carries the stats. */
export async function fetchMessages(token: string | null, before?: string | null, filter: MessageFilter = {}): Promise<MessagesPage> {
  if (!token) return { ok: false, error: 'Sign in again to see messages.', status: 401 };
  try {
    const p = new URLSearchParams();
    if (before) p.set('before', before);
    if (filter.email) p.set('email', filter.email);
    if (filter.type) p.set('type', filter.type);
    if (filter.unread) p.set('unread', '1');
    if (filter.limit) p.set('limit', String(filter.limit));
    const q = p.toString() ? `?${p}` : '';
    const r = await fetch(`/api/messages${q}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const j = await readJson(r);
    if (r.ok && j?.ok && Array.isArray(j.items)) return { ok: true, items: j.items, next: j.next ?? null, stats: j.stats };
    return { ok: false, error: j?.error || `Could not load messages (${r.status}).`, status: r.status };
  } catch {
    return { ok: false, error: 'Could not reach the server.', status: 0 };
  }
}

/** Marks messages read/unread (admin); `ids: 'all'` marks every message. Resolves to an error, or null. */
export async function markMessages(token: string | null, ids: string[] | 'all', read: boolean): Promise<string | null> {
  if (!token) return 'Sign in again.';
  try {
    const r = await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(ids === 'all' ? { all: true, read } : { ids, read }),
    });
    const j = await readJson(r);
    return r.ok && j?.ok ? null : j?.error || `Request failed (${r.status}).`;
  } catch {
    return 'Could not reach the server.';
  }
}

/** Deletes one message for good (admin). Resolves to an error, or null. */
export async function deleteMessage(token: string | null, id: string): Promise<string | null> {
  if (!token) return 'Sign in again.';
  try {
    const r = await fetch(`/api/messages?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const j = await readJson(r);
    return r.ok && j?.ok ? null : j?.error || `Request failed (${r.status}).`;
  } catch {
    return 'Could not reach the server.';
  }
}
