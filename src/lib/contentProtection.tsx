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
/** Minimum time the cover stays up before a click / key press may lift it. */
const RELEASE_AFTER_MS = 400;
const flag = import.meta.env.VITE_PROTECT as string | undefined;
export const PROTECTION_ENABLED = flag === '1' ? true : flag === '0' ? false : import.meta.env.PROD;

const root = () => document.documentElement;
const active = () => root().dataset.protect === 'on';

function isEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !('closest' in el)) return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
}

// While "shielded" the whole viewport is covered (see index.css). The shield is
// raised the moment a capture shortcut starts (or the window loses focus) and
// stays up until the visitor interacts with the page again, so it cannot
// vanish between pressing the shortcut and the capture actually happening.
let armedAt = 0;
function shield(on: boolean) {
  if (on) { armedAt = Date.now(); root().dataset.shield = 'on'; }
  else delete root().dataset.shield;
}
const shielded = () => root().dataset.shield === 'on';
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock']);

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
      } else if (shielded() && !MODIFIER_KEYS.has(ev.key) && Date.now() - armedAt > RELEASE_AFTER_MS && document.hasFocus()) {
        shield(false); // a real key press after the shield went up lifts it
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
    function onPointer() {
      if (shielded() && Date.now() - armedAt > RELEASE_AFTER_MS && document.hasFocus()) shield(false);
    }

    const opts = { capture: true } as const;
    const blockers = ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'] as const;
    blockers.forEach((t) => document.addEventListener(t, block, opts));
    document.addEventListener('keydown', onKeyDown, opts);
    document.addEventListener('keyup', onKeyUp, opts);
    document.addEventListener('pointerdown', onPointer, opts);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      blockers.forEach((t) => document.removeEventListener(t, block, opts));
      document.removeEventListener('keydown', onKeyDown, opts);
      document.removeEventListener('keyup', onKeyUp, opts);
      document.removeEventListener('pointerdown', onPointer, opts);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
