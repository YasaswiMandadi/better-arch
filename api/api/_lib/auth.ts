import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const TTL_MS = 12 * 60 * 60 * 1000; // an admin session lasts 12 hours

function key(): string {
  const k = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!k) throw new Error('ADMIN_PASSWORD is not set');
  return k;
}

const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('hex');

const digest = (v: string) => createHash('sha256').update(v).digest();

/** Constant-time comparison against the ADMIN_PASSWORD environment variable. */
export function checkPassword(input: unknown): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || typeof input !== 'string' || !input) return false;
  return timingSafeEqual(digest(input), digest(pw));
}

/** Stateless session token: `<expiry-ms>.<hmac>`. */
export function issueToken(now = Date.now()): { token: string; expiresAt: number } {
  const expiresAt = now + TTL_MS;
  return { token: `${expiresAt}.${sign(`admin.${expiresAt}`)}`, expiresAt };
}

export function verifyToken(token: unknown, now = Date.now()): boolean {
  if (typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || exp < now) return false;
  const given = Buffer.from(token.slice(dot + 1));
  const want = Buffer.from(sign(`admin.${exp}`));
  return given.length === want.length && timingSafeEqual(given, want);
}

export function bearer(header: unknown): string | null {
  const h = Array.isArray(header) ? header[0] : header;
  if (typeof h !== 'string') return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1] : null;
}
