import { bearer, verifyToken } from './_lib/auth.js';
import { mongoDb } from './_lib/mongo.js';
import { MESSAGE_TYPES, type MessageDoc } from './_lib/messages.js';
import type { Req, Res } from './_lib/http.js';

/**
 * Contact-page messages for the console Dashboard. Admin only (signed-in console).
 *   GET    /api/messages[?before=<cursor>&limit=N&email=<address>&type=<form>&unread=1]
 *            newest messages first, in full. The first page (no `before`) also carries `stats`:
 *            every message's date/type/state (for the charts) and the people who wrote.
 *   PATCH  /api/messages   { ids: string[], read: boolean }  or  { all: true, read: true }
 *   DELETE /api/messages?id=<id>
 * Messages are saved by /api/contact (the Contact page) — nothing to set up.
 */

const PAGE_DEFAULT = 50;
const PAGE_MAX = 200;
const STATS_MAX = 20000;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
function reply(res: Res, code: number, body: Record<string, unknown>) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).json(body);
}

const toItem = (d: MessageDoc) => ({
  id: d._id,
  type: d.type,
  name: d.name,
  email: d.email,
  org: d.org || '',
  subject: d.subject || '',
  guest: d.guest || '',
  topic: d.topic || '',
  msg: d.msg,
  flags: Array.isArray(d.flags) ? d.flags : [],
  createdAt: new Date(d.createdAt).toISOString(),
  read: !!d.read,
  emailed: !!d.emailed,
});

export default async function handler(req: Req, res: Res) {
  try {
    if (!verifyToken(bearer(req.headers.authorization))) return reply(res, 401, { ok: false, error: 'Sign in again to see messages.' });
    const col = (await mongoDb()).collection<MessageDoc>('messages');

    if (req.method === 'GET') {
      // cursor = "<ISO date>~<id>" of the last message already shown (ties on the date are broken by id)
      const cursor = first(req.query?.before) ?? '';
      const [beforeIso, beforeId = ''] = cursor.split('~');
      const before = cursor ? new Date(beforeIso) : null;
      if (before && Number.isNaN(before.getTime())) return reply(res, 400, { ok: false, error: 'Malformed cursor.' });
      const limit = Math.min(PAGE_MAX, Math.max(1, Number.parseInt(first(req.query?.limit) ?? '', 10) || PAGE_DEFAULT));
      const where: Record<string, unknown>[] = [];
      if (before) where.push({ $or: [{ createdAt: { $lt: before } }, { createdAt: before, _id: { $lt: beforeId } }] });
      const email = (first(req.query?.email) ?? '').trim().toLowerCase();
      if (email) where.push({ emailKey: email.slice(0, 200) });
      const type = first(req.query?.type) ?? '';
      if (type) where.push({ type: (MESSAGE_TYPES as readonly string[]).includes(type) ? type : '-' });
      if (first(req.query?.unread) === '1') where.push({ read: false });
      const docs = await col
        .find(where.length ? { $and: where } : {})
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .toArray();
      const more = docs.length > limit;
      const items = docs.slice(0, limit).map(toItem);
      const last = items[items.length - 1];
      const next = more && last ? `${last.createdAt}~${last.id}` : null;

      let stats: unknown = undefined;
      if (!before) {
        const light = await col
          .find({}, { projection: { _id: 1, type: 1, name: 1, email: 1, createdAt: 1, read: 1, flags: 1 } })
          .sort({ createdAt: -1 })
          .limit(STATS_MAX)
          .toArray();
        // events: [time (ms), type index, unread (1/0), flagged (1/0)] — compact, for the charts
        const events = light.map((d) => [
          new Date(d.createdAt).getTime(),
          Math.max(0, (MESSAGE_TYPES as readonly string[]).indexOf(d.type)),
          d.read ? 0 : 1,
          Array.isArray(d.flags) && d.flags.length ? 1 : 0,
        ]);
        const people = new Map<string, { name: string; email: string; count: number; unread: number; last: number }>();
        for (const d of light) {
          const key = String(d.email || '').trim().toLowerCase();
          if (!key) continue;
          const t = new Date(d.createdAt).getTime();
          const p = people.get(key) ?? { name: d.name, email: d.email, count: 0, unread: 0, last: 0 };
          p.count++;
          if (!d.read) p.unread++;
          if (t > p.last) { p.last = t; p.name = d.name || p.name; }
          people.set(key, p);
        }
        const senders = Array.from(people.values())
          .sort((a, b) => b.last - a.last)
          .slice(0, 300)
          .map((p) => ({ ...p, last: new Date(p.last).toISOString() }));
        stats = { total: light.length, capped: light.length >= STATS_MAX, events, senders, people: people.size };
      }
      return reply(res, 200, { ok: true, items, next, stats });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (typeof body?.read !== 'boolean') return reply(res, 400, { ok: false, error: 'Malformed request.' });
      if (body.all === true) {
        const r = await col.updateMany({ read: !body.read }, { $set: { read: body.read } });
        return reply(res, 200, { ok: true, changed: r.modifiedCount });
      }
      const ids: unknown = body.ids;
      if (!Array.isArray(ids) || !ids.length || ids.length > 500 || ids.some((i) => typeof i !== 'string' || !i || i.length > 100)) {
        return reply(res, 400, { ok: false, error: 'Malformed request.' });
      }
      const r = await col.updateMany({ _id: { $in: ids as string[] } }, { $set: { read: body.read } });
      return reply(res, 200, { ok: true, changed: r.modifiedCount });
    }

    if (req.method === 'DELETE') {
      const id = first(req.query?.id);
      if (!id || id.length > 100) return reply(res, 400, { ok: false, error: 'Which message?' });
      const r = await col.deleteOne({ _id: id });
      return reply(res, r.deletedCount ? 200 : 404, r.deletedCount ? { ok: true } : { ok: false, error: 'That message was already deleted.' });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return reply(res, 405, { ok: false, error: 'Method not allowed.' });
  } catch (e: any) {
    console.error('[api/messages]', e?.message || e);
    return reply(res, 500, { ok: false, error: 'The database is not reachable right now.' });
  }
}
