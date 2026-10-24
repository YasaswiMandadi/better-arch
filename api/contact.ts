import { randomUUID } from 'node:crypto';
import type { Req, Res } from './_lib/http.js';
import { mongoDb } from './_lib/mongo.js';
import type { MessageDoc } from './_lib/messages.js';

/**
 * POST /api/contact — sends a Contact-page message by email (via Resend, https://resend.com).
 *
 * Vercel → Project → Settings → Environment Variables:
 *   RESEND_API_KEY  (required)  the API key from resend.com → API Keys
 *   CONTACT_TO      (optional)  where messages go; defaults to ptgsaay@gmail.com (testing)
 *   CONTACT_FROM    (optional)  sender; defaults to Resend's test sender, which works without a domain
 *
 * Every message is also saved in the database (MongoDB collection "messages"), so the console's
 * Dashboard can list it even if the email fails. A message counts as received when either the
 * database or the email accepted it.
 *
 * Note: until a domain is verified in Resend, its free account can only deliver to the email
 * address the Resend account was created with — so sign up with the CONTACT_TO address.
 */

const TO = () => process.env.CONTACT_TO || 'ptgsaay@gmail.com';
const FROM = () => process.env.CONTACT_FROM || 'BetterArch Contact <onboarding@resend.dev>';

const TYPES: Record<string, string> = {
  general: 'Enquiry',
  episode: 'Episode request',
  propose: 'Project proposal',
  contribute: 'Contribution',
};

const LIMITS = { name: 120, email: 200, org: 200, subject: 200, guest: 200, topic: 300, msg: 8000 };

// Best-effort flood guard (per warm server instance): 5 messages per IP per 10 minutes.
const hits = new Map<string, number[]>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ');

function send(res: Res, code: number, body: Record<string, unknown>) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).json(body);
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'Method not allowed.' });
  }
  let body: any;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return send(res, 400, { ok: false, error: 'Malformed request.' });
  }
  if (!body || typeof body !== 'object') return send(res, 400, { ok: false, error: 'Malformed request.' });

  // Spam signals never drop a message (phone autofill can fill hidden fields, and a lost real
  // message is worse than a spam one). A suspicious message is still saved and emailed, marked as possible spam.
  const flags: string[] = [];
  if (clean(body.ba_check, 200) || clean(body.website, 200)) flags.push('hidden spam-trap field was filled');
  const elapsed = Number(body.elapsed);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 2500) flags.push(`sent ${Math.round(elapsed / 100) / 10}s after the page opened`);

  const f = {
    name: clean(body.name, LIMITS.name),
    email: clean(body.email, LIMITS.email),
    org: clean(body.org, LIMITS.org),
    subject: clean(body.subject, LIMITS.subject),
    guest: clean(body.guest, LIMITS.guest),
    topic: clean(body.topic, LIMITS.topic),
    msg: clean(body.msg, LIMITS.msg),
  };
  const type = TYPES[String(body.type)] ? String(body.type) : 'general';
  if (!f.name || !f.email || !f.msg) return send(res, 400, { ok: false, error: 'Name, email and message are needed.' });
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(f.email)) return send(res, 400, { ok: false, error: 'Please check the email address.' });

  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return send(res, 429, { ok: false, error: 'Too many messages in a short time. Please try again in a few minutes.' });

  const label = TYPES[type];
  const subject = oneLine(`${flags.length ? '[Possible spam] ' : ''}[BetterArch · ${label}] ${f.subject || `Message from ${f.name}`}`).slice(0, 250);
  const rows: [string, string][] = [
    ['Type', label],
    ['Name', f.name],
    ['Email', f.email],
    ...(f.org ? ([['Organisation', f.org]] as [string, string][]) : []),
    ...(f.subject ? ([['Subject', f.subject]] as [string, string][]) : []),
    ...(f.guest ? ([['Proposed guest', f.guest]] as [string, string][]) : []),
    ...(f.topic ? ([['Topic', f.topic]] as [string, string][]) : []),
    ...(flags.length ? ([['Spam check', flags.join('; ')]] as [string, string][]) : []),
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${f.msg}\n\n— Sent from the BetterArch.org contact form`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#111">
<table style="border-collapse:collapse;margin-bottom:16px">${rows
    .map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:3px 0"><b>${esc(v)}</b></td></tr>`)
    .join('')}</table>
<div style="white-space:pre-wrap;border-left:3px solid #E0825C;padding:4px 0 4px 14px">${esc(f.msg)}</div>
<p style="color:#888;font-size:12px;margin-top:20px">Sent from the BetterArch.org contact form · reply to this email to answer ${esc(f.name)} directly.</p></div>`;

  const stored = await saveMessage({ type, ...f, flags });
  const emailed = await sendEmail({ subject, text, html, replyTo: f.email });
  if (stored) await markEmailed(stored, emailed);
  if (!stored && !emailed && !process.env.MONGODB_URI && !process.env.RESEND_API_KEY) return send(res, 503, { ok: false, error: 'The contact form is not set up yet.' });
  if (!stored && !emailed) return send(res, 502, { ok: false, error: 'The message could not be sent right now.' });
  console.log('[api/contact] received', stored ? `saved ${stored}` : 'NOT saved', emailed ? 'emailed' : 'NOT emailed', flags.length ? `(flagged: ${flags.join('; ')})` : '');
  return send(res, 200, { ok: true });
}

/** Saves the message; resolves to its id, or null when the database isn't reachable. */
// (The sender's IP address is only used for the flood guard above; it is never stored.)
async function saveMessage(m: Omit<MessageDoc, '_id' | 'emailKey' | 'createdAt' | 'read' | 'emailed'>): Promise<string | null> {
  if (!process.env.MONGODB_URI) return null;
  try {
    const doc: MessageDoc = { _id: randomUUID(), ...m, emailKey: m.email.toLowerCase(), createdAt: new Date(), read: false, emailed: false };
    await (await mongoDb()).collection<MessageDoc>('messages').insertOne(doc);
    return doc._id;
  } catch (e: any) {
    console.error('[api/contact] could not save the message', e?.message || e);
    return null;
  }
}

async function markEmailed(id: string, emailed: boolean) {
  if (!emailed) return;
  try {
    await (await mongoDb()).collection<MessageDoc>('messages').updateOne({ _id: id }, { $set: { emailed: true } });
  } catch { /* the message itself is saved; this flag is informational */ }
}

/** Sends the notification email through Resend; resolves to whether it was accepted. */
async function sendEmail(e: { subject: string; text: string; html: string; replyTo: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('[api/contact] RESEND_API_KEY is not set');
    return false;
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM(), to: [TO()], reply_to: e.replyTo, subject: e.subject, text: e.text, html: e.html }),
    });
    if (!r.ok) {
      console.error('[api/contact] Resend error', r.status, (await r.text()).slice(0, 500));
      return false;
    }
    const sent = await r.json().catch(() => ({}));
    console.log('[api/contact] emailed', (sent as any)?.id ?? '');
    return true;
  } catch (err: any) {
    console.error('[api/contact]', err?.message || err);
    return false;
  }
}
