import { Binary } from 'mongodb';
import { bearer, verifyToken } from './_lib/auth.js';
import { mongoDb } from './_lib/mongo.js';

/**
 * The homepage eye video, uploaded from the console (console → Home page).
 *   GET    /api/eye-video?v=<id>   the video bytes (public; cached for a year when <id> matches)
 *   PUT    /api/eye-video          admin: { id, mime, data: base64 } — replaces the video
 *   DELETE /api/eye-video          admin: removes it (the site falls back to the built-in eye)
 * The browser converts the client's file to a small greyscale loop before uploading, so the
 * stored file stays small (limit below) and well under Vercel's 4.5 MB request limit.
 */

const MAX_BYTES = 3 * 1024 * 1024; // keep in step with EYE_MAX_STORED_MB in src/data/homeEye.ts
const DOC_ID = 'eye-video';

interface Req { method?: string; headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[] | undefined>; body?: any }
interface Res { status(code: number): Res; json(body: unknown): void; setHeader(name: string, value: string): void; end(chunk?: any): void }
interface MediaDoc { _id: string; id: string; mime: string; size: number; data: Binary; updatedAt: Date }

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
function fail(res: Res, code: number, error: string) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).json({ ok: false, error });
}

export default async function handler(req: Req, res: Res) {
  try {
    const col = (await mongoDb()).collection<MediaDoc>('media');

    if (req.method === 'GET') {
      const doc = await col.findOne({ _id: DOC_ID });
      if (!doc) return fail(res, 404, 'No uploaded eye video.');
      const asked = first(req.query?.v);
      res.setHeader('Content-Type', doc.mime);
      res.setHeader('Content-Length', String(doc.data.buffer.byteLength));
      // versioned URL → safe to cache for a long time; otherwise always re-check
      res.setHeader('Cache-Control', asked === doc.id ? 'public, max-age=31536000, immutable' : 'no-cache');
      res.status(200);
      res.end(Buffer.from(doc.data.buffer));
      return;
    }

    const admin = verifyToken(bearer(req.headers.authorization));
    if (req.method === 'PUT') {
      if (!admin) return fail(res, 401, 'Sign in again to upload.');
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = String(body?.id ?? '');
      const mime = String(body?.mime ?? '').split(';')[0];
      if (!/^[a-z0-9-]{6,64}$/i.test(id)) return fail(res, 400, 'Malformed video id.');
      if (mime !== 'video/webm' && mime !== 'video/mp4') return fail(res, 415, 'Only WebM or MP4 videos can be stored.');
      if (typeof body?.data !== 'string' || !body.data) return fail(res, 400, 'No video data.');
      const bytes = Buffer.from(body.data, 'base64');
      if (!bytes.length) return fail(res, 400, 'No video data.');
      if (bytes.length > MAX_BYTES) return fail(res, 413, `The converted video is ${(bytes.length / 1048576).toFixed(1)} MB; the limit is 3 MB. Trim it shorter or lower the quality.`);
      await col.replaceOne(
        { _id: DOC_ID },
        { _id: DOC_ID, id, mime, size: bytes.length, data: new Binary(bytes), updatedAt: new Date() },
        { upsert: true },
      );
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ ok: true, id, size: bytes.length });
      return;
    }

    if (req.method === 'DELETE') {
      if (!admin) return fail(res, 401, 'Sign in again to change the video.');
      await col.deleteOne({ _id: DOC_ID });
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return fail(res, 405, 'Method not allowed.');
  } catch (e: any) {
    console.error('[api/eye-video]', e?.message || e);
    return fail(res, 500, 'The database is not reachable right now.');
  }
}
