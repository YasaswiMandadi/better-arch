import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSiteData } from '../../data/store';

/** Shown instead of the console when the site runs on the shared database
 * and no admin session is active. */
export default function ConsoleLogin() {
  const { login, remote } = useSiteData();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setErr('');
    const e = await login(pw);
    setBusy(false);
    if (e) setErr(e);
  }

  return (
    <div className="consoleApp min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-[380px] bg-card border border-hair border-l-[3px] border-l-rust/60 rounded-sm p-7">
        <h1 className="font-display italic font-semibold text-[22px] tracking-tight mb-1">BetterArch Console</h1>
        <p className="text-[14px] text-muted mb-5">Sign in to edit the site. Visitors only see published content.</p>
        {remote.status === 'readonly' && remote.message && <p className="text-[13px] text-rust mb-3">{remote.message}</p>}
        <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1.5" htmlFor="admin-password">Admin password</label>
        <input
          id="admin-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full bg-paper text-ink border border-hair rounded px-3 py-2.5 text-[14px] font-sans focus:outline-none focus:border-rust"
        />
        {err && <p role="alert" className="text-[13px] text-rust mt-2">{err}</p>}
        <button
          type="submit"
          disabled={busy || !pw}
          className="mt-5 w-full font-sans font-semibold text-[14px] bg-rust text-white rounded px-4 py-2.5 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <Link to="/" className="block text-center text-[13px] text-muted mt-4 hover:text-ink">← Back to the site</Link>
      </form>
    </div>
  );
}
