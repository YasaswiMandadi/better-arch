import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from '../lib/theme';

/**
 * "Designed & developed by PTG" — the developer credit at the end of every footer.
 * Deliberately not editable in the console. The logo is a button that opens a small card
 * with PTG's Instagram and email.
 */

const PTG = {
  name: 'Pinnacle Tech Group',
  instagram: 'https://www.instagram.com/ptgsaay/',
  email: 'ptgsaay@gmail.com',
};

/** tone "site" follows the site's light/dark mode; "dark" is for always-dark surfaces (the home page). */
export default function PtgCredit({ tone = 'site', className = '' }: { tone?: 'site' | 'dark'; className?: string }) {
  const { theme } = useTheme();
  const dark = tone === 'dark' || theme === 'dark';
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const card = dark
    ? 'bg-[#141416] text-[#E4E7EA] border-white/10'
    : 'bg-card text-ink border-hair';
  const sub = dark ? 'text-[#8e9398]' : 'text-muted';
  const row = dark ? 'hover:bg-white/[.07]' : 'hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]';

  return (
    <span ref={wrap} className={`ptg-credit relative inline-flex items-center gap-2 whitespace-nowrap ${className}`}>
      <span>Designed &amp; developed by</span>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        title={`Designed & developed by ${PTG.name}`}
        aria-label={`${PTG.name} (PTG): contact the developers`}
        className={`inline-flex items-center rounded-[4px] p-0.5 -m-0.5 opacity-90 hover:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 ${dark ? 'focus-visible:outline-white/50' : 'focus-visible:outline-[var(--muted)]'}`}
      >
        <img
          src={dark ? '/brand/ptg-logo-on-dark.png' : '/brand/ptg-logo-on-light.png'}
          alt="PTG"
          width={26}
          height={18}
          className="block h-[18px] w-auto select-none"
          draggable={false}
        />
      </button>
      {open && (
        <span
          id={id}
          role="dialog"
          aria-label={PTG.name}
          className={`absolute bottom-full right-0 mb-2.5 z-50 w-[228px] rounded-lg border shadow-[0_12px_32px_-12px_rgba(0,0,0,.45)] p-3 normal-case tracking-normal whitespace-normal text-left font-sans ${card}`}
        >
          <span className={`block text-[10px] uppercase tracking-[.14em] ${sub}`}>Designed &amp; developed by</span>
          <span className="flex items-center gap-2.5 mt-1.5 mb-2.5">
            <img src={dark ? '/brand/ptg-logo-on-dark.png' : '/brand/ptg-logo-on-light.png'} alt="" width={35} height={24} className="h-6 w-auto" />
            <span className="text-[13.5px] font-semibold leading-tight">{PTG.name}</span>
          </span>
          <a href={PTG.instagram} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[12.5px] no-underline ${row}`} style={{ color: 'inherit' }}>
            Instagram <span aria-hidden className={sub}>↗</span>
          </a>
          <a href={`mailto:${PTG.email}`} className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[12.5px] no-underline ${row}`} style={{ color: 'inherit' }}>
            Email PTG <span className={`text-[11px] ${sub}`}>{PTG.email}</span>
          </a>
        </span>
      )}
    </span>
  );
}
