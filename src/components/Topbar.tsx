import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, ChevronDown } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { DB } from '../data/db';

export default function Topbar() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const ddRef = useRef<HTMLDivElement>(null);

  const navOn = (path: string) => loc.pathname.startsWith(path);

  useEffect(() => {
    if (!open) return;
    function onOutside(ev: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(ev.target as Node)) setOpen(false);
    }
    function onEscape(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 h-[54px] z-70 flex items-center gap-4 px-5
      bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] backdrop-blur-md border-b border-hair"
      style={{ zIndex: 70 }}>
      <Link to="/" className="font-head font-bold text-[13px] tracking-[.15em] uppercase whitespace-nowrap">
        BETTERARCH<b className="text-red">.ORG</b>
      </Link>

      <nav className="hidden sm:flex items-center gap-1 ml-2">
        <div className="relative" ref={ddRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={`font-head font-semibold text-[11.5px] tracking-[.09em] uppercase px-3 py-2.5 rounded-md transition-colors
              ${navOn('/project') ? 'text-deep bg-[color-mix(in_srgb,var(--red)_10%,transparent)]' : 'text-muted hover:text-ink hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]'}`}
          >
            Categories <ChevronDown size={12} className="inline -mt-0.5" />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-2.5 min-w-[270px] bg-card border border-hair rounded-[10px] shadow-[var(--sh)] p-2 z-75">
              {DB.seasons.map((s, i) => (
                <Link
                  key={s.slug}
                  to={`/project/${s.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 items-baseline px-3 py-2.5 rounded-lg text-muted hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink transition-colors text-sm"
                >
                  <span className="font-num text-[15px] text-faint w-5 shrink-0">0{i + 1}</span>
                  <span className="font-medium">{s.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Link
          to="/contact"
          className={`font-head font-semibold text-[11.5px] tracking-[.09em] uppercase px-3 py-2.5 rounded-md transition-colors
            ${navOn('/contact') ? 'text-deep bg-[color-mix(in_srgb,var(--red)_10%,transparent)]' : 'text-muted hover:text-ink hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]'}`}
        >
          Contact Us
        </Link>
      </nav>

      <span className="flex-1" />

      <button
        onClick={toggle}
        className="inline-flex items-center gap-2 font-head font-semibold text-[11px] tracking-[.05em] uppercase
          bg-card text-ink border border-hair rounded-lg px-3 py-2.5 shadow-[var(--shs)] transition-transform hover:-translate-y-0.5"
      >
        {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        <span className="hidden xs:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    </header>
  );
}
