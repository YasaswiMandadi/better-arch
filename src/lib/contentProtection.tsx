import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Deterrents against casual copying, printing and screenshots on the PUBLIC
 * site. A web page cannot truly prevent any of these — see DEPLOY.md /
 * the hand-over notes — so this raises the effort, it is not DRM.
 *
 * - Active on production builds only (so `npm run dev` stays comfortable).
 *   Force on/off with VITE_PROTECT=1 / VITE_PROTECT=0 at build time.
 * - Never active on /console, and never inside text fields, so admins and
 *   visitors can still type, paste and use search / newsletter / contact forms.
 * - The built-in "Cite this page" and "Copy citation" buttons keep working
 *   (they write to the clipboard programmatically).
 */
/** Where visitors are sent when they want to use content from the site. */
export const CONTENT_REQUEST_EMAIL = 'ar.shubhayan.m@gmail.com';
const flag = import.meta.env.VITE_PROTECT as string | undefined;
export const PROTECTION_ENABLED = flag === '1' ? true : flag === '0' ? false : import.meta.env.PROD;

const root = () => document.documentElement;
const active = () => root().dataset.protect === 'on';

function isEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !('closest' in el)) return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
}

// While "shielded" the whole viewport is covered by the notice below (shown
// purely by CSS, so it appears the instant the attribute is set). The shield is
// raised the moment a capture shortcut starts (or the window loses focus) and
// stays up until the visitor chooses "Continue reading", so it cannot vanish
// between pressing the shortcut and the capture actually happening.
function shield(on: boolean) {
  if (on) {
    root().dataset.shield = 'on';
    document.getElementById('capture-continue')?.focus({ preventScroll: true });
  } else delete root().dataset.shield;
}
const shielded = () => root().dataset.shield === 'on';

export default function ContentProtection() {
  const { pathname } = useLocation();

  // Switch protection on for public pages, off for the console.
  useLayoutEffect(() => {
    if (!PROTECTION_ENABLED) return;
    if (pathname.startsWith('/console')) { root().dataset.protect = 'off'; shield(false); }
    else root().dataset.protect = 'on';
  }, [pathname]);

  useEffect(() => {
    if (!PROTECTION_ENABLED) return;

    const block = (ev: Event) => { if (active() && !isEditable(ev.target)) ev.preventDefault(); };

    function onKeyDown(ev: KeyboardEvent) {
      if (!active()) return;
      const mod = ev.ctrlKey || ev.metaKey;
      const k = ev.key.toLowerCase();
      const editable = isEditable(ev.target);

      // Screenshot / screen-recording shortcuts start with Win/Cmd + Shift (Win+Shift+S,
      // Cmd+Shift+3/4/5), Win+Alt+R (Game Bar) or Win+PrintScreen. Cover the page on the
      // modifier press, before the final key of the shortcut completes.
      if (
        ev.key === 'PrintScreen' ||
        (ev.metaKey && (ev.shiftKey || ev.altKey)) ||
        (ev.key === 'Meta' && (ev.shiftKey || ev.altKey))
      ) {
        shield(true);
      } else if (shielded() && ev.key === 'Escape') {
        shield(false);
      }

      // Print, save, view-source: blocked everywhere on public pages.
      if (mod && (k === 's' || k === 'p' || k === 'u')) { ev.preventDefault(); return; }
      // Copy / cut / select-all: blocked except inside text fields.
      if (mod && !editable && (k === 'c' || k === 'x' || k === 'a')) { ev.preventDefault(); return; }
      // Developer-tools shortcuts (a deterrent only).
      if (ev.key === 'F12' || (mod && ev.shiftKey && (k === 'i' || k === 'j' || k === 'c'))) ev.preventDefault();
    }

    function onKeyUp(ev: KeyboardEvent) {
      if (!active() || ev.key !== 'PrintScreen') return;
      shield(true);
      // Replace whatever PrintScreen put on the clipboard.
      try { void navigator.clipboard?.writeText(''); } catch { /* clipboard unavailable */ }
    }

    // Snipping tools and screen recorders take focus away from the page.
    // Clicking into the Spotify player (an iframe) also blurs the window; ignore that.
    function onBlur() {
      if (!active()) return;
      if (document.activeElement?.tagName === 'IFRAME') return;
      shield(true);
    }
    function onVisibility() {
      if (active() && document.visibilityState === 'hidden') shield(true);
    }

    const opts = { capture: true } as const;
    const blockers = ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'] as const;
    blockers.forEach((t) => document.addEventListener(t, block, opts));
    document.addEventListener('keydown', onKeyDown, opts);
    document.addEventListener('keyup', onKeyUp, opts);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      blockers.forEach((t) => document.removeEventListener(t, block, opts));
      document.removeEventListener('keydown', onKeyDown, opts);
      document.removeEventListener('keyup', onKeyUp, opts);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!PROTECTION_ENABLED) return null;
  return <CaptureNotice />;
}

/** Full-screen notice shown while the shield is up (hidden by CSS otherwise). */
function CaptureNotice() {
  const { pathname } = useLocation();
  const [copied, setCopied] = useState(false);
  const subject = `Content request: ${document.title || 'BetterArch.org'}`;
  const body = `Hello,\n\nI would like to request some content from this page:\n${window.location.origin}${pathname}\n\nWhat I need:\n\nHow I plan to use it:\n\nThank you.`;
  const mailto = `mailto:${CONTENT_REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  async function copy() {
    try { await navigator.clipboard.writeText(CONTENT_REQUEST_EMAIL); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
  }

  return (
    <div id="capture-notice" role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <div className="capture-card">
        <h2 id="capture-title">Need something from this site?</h2>
        <p>
          This content is protected, so the page is hidden while it might be captured. If you would like to
          use any of it, for research, teaching or citation, please write to us and we will be glad to help.
        </p>
        <p className="capture-mail">{CONTENT_REQUEST_EMAIL}</p>
        <div className="capture-actions">
          <a className="capture-btn capture-btn-primary" href={mailto}>Email us</a>
          <button type="button" className="capture-btn" onClick={copy}>{copied ? 'Address copied' : 'Copy address'}</button>
          <button type="button" id="capture-continue" className="capture-btn" onClick={() => shield(false)}>Continue reading</button>
        </div>
      </div>
    </div>
  );
}
