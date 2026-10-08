import { useEffect, useLayoutEffect } from 'react';
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
const flag = import.meta.env.VITE_PROTECT as string | undefined;
export const PROTECTION_ENABLED = flag === '1' ? true : flag === '0' ? false : import.meta.env.PROD;

const root = () => document.documentElement;
const active = () => root().dataset.protect === 'on';

function isEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !('closest' in el)) return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
}

let shieldTimer: ReturnType<typeof setTimeout> | undefined;
function shield(on: boolean, forMs?: number) {
  if (shieldTimer) { clearTimeout(shieldTimer); shieldTimer = undefined; }
  if (on) root().dataset.shield = 'on'; else delete root().dataset.shield;
  if (on && forMs) shieldTimer = setTimeout(() => shield(false), forMs);
}

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
      // Print, save, view-source: blocked everywhere on public pages.
      if (mod && (k === 's' || k === 'p' || k === 'u')) { ev.preventDefault(); return; }
      // Copy / cut / select-all: blocked except inside text fields.
      if (mod && !editable && (k === 'c' || k === 'x' || k === 'a')) { ev.preventDefault(); return; }
      // Developer-tools shortcuts (a deterrent only).
      if (ev.key === 'F12' || (mod && ev.shiftKey && (k === 'i' || k === 'j' || k === 'c'))) ev.preventDefault();
    }

    function onKeyUp(ev: KeyboardEvent) {
      if (!active() || ev.key !== 'PrintScreen') return;
      shield(true, 1500);
      try { void navigator.clipboard?.writeText(''); } catch { /* clipboard unavailable */ }
    }

    // Snipping tools and screen recorders take focus away from the page:
    // hide the content while the window is not focused. Clicking into the
    // Spotify player (an iframe) also blurs the window, so that case is ignored.
    function onBlur() {
      if (!active()) return;
      if (document.activeElement?.tagName === 'IFRAME') return;
      shield(true);
    }
    const onFocus = () => shield(false);
    function onVisibility() {
      if (!active()) return;
      if (document.visibilityState === 'hidden') shield(true);
      else if (document.hasFocus()) shield(false);
    }

    const opts = { capture: true } as const;
    const blockers = ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'] as const;
    blockers.forEach((t) => document.addEventListener(t, block, opts));
    document.addEventListener('keydown', onKeyDown, opts);
    document.addEventListener('keyup', onKeyUp, opts);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      blockers.forEach((t) => document.removeEventListener(t, block, opts));
      document.removeEventListener('keydown', onKeyDown, opts);
      document.removeEventListener('keyup', onKeyUp, opts);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
