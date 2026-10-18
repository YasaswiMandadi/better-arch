import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
import HeaderSearch from './HeaderSearch';

/**
 * Global header, constant across every page: Home / Themes / Essays /
 * Contact Us / Search icon, per the client's doc ("HEADER MENU: Home.
 * Themes. Essays. Contact Us. Search icon."). The per-page section
 * navigator now lives in the Universal Side Panel (SideNav.tsx), not here.
 */
export default function Topbar() {
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const navOn = (path: string) => loc.pathname.startsWith(path);

  const linkCls = (active: boolean) =>
    `font-head font-semibold text-[11.5px] tracking-[.09em] uppercase px-3 py-2.5 rounded-md transition-colors ${
      active ? 'text-deep bg-[color-mix(in_srgb,var(--red)_10%,transparent)]' : 'text-muted hover:text-ink hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]'
    }`;

  // Phones/small tablets (< 768px): the menu links get their own second row so all four
  // are always visible (InnerLayout and Section offsets match: 54px + 40px).
  const mobileLinkCls = (active: boolean) =>
    `font-head font-semibold text-[11px] tracking-[.08em] uppercase px-2 py-2 rounded-md transition-colors whitespace-nowrap ${
      active ? 'text-deep bg-[color-mix(in_srgb,var(--red)_10%,transparent)]' : 'text-muted hover:text-ink'
    }`;

  return (
    <header
      className="fixed inset-x-0 top-0 z-70
      bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] backdrop-blur-md border-b border-hair"
      style={{ zIndex: 70 }}
    >
      <div className="h-[54px] flex items-center gap-4 px-5">
      <Link to="/" className="font-head font-bold text-[13px] tracking-[.15em] uppercase whitespace-nowrap">
        BETTERARCH<b className="text-red">.ORG</b>
      </Link>

      <nav className="hidden md:flex items-center gap-1 ml-2">
        <Link to="/" className={linkCls(loc.pathname === '/')}>Home</Link>
        <Link to="/themes" className={linkCls(navOn('/themes') || navOn('/theme/'))}>Themes</Link>
        <Link to="/essays" className={linkCls(navOn('/essays') || navOn('/essay/'))}>Essays</Link>
        <Link to="/contact" className={linkCls(navOn('/contact'))}>Contact Us</Link>
      </nav>

      <span className="flex-1" />

      <HeaderSearch variant="light" />

      <button
        onClick={toggle}
        className="inline-flex items-center gap-2 font-head font-semibold text-[11px] tracking-[.05em] uppercase
          bg-card text-ink border border-hair rounded-lg px-3 py-2.5 shadow-[var(--shs)] transition-transform hover:-translate-y-0.5"
      >
        {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        <span className="hidden xs:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
      </div>

      <nav className="md:hidden h-[40px] flex items-center justify-between gap-1 px-3 border-t border-hair" aria-label="Main menu">
        <Link to="/" className={mobileLinkCls(loc.pathname === '/')}>Home</Link>
        <Link to="/themes" className={mobileLinkCls(navOn('/themes') || navOn('/theme/'))}>Themes</Link>
        <Link to="/essays" className={mobileLinkCls(navOn('/essays') || navOn('/essay/'))}>Essays</Link>
        <Link to="/contact" className={mobileLinkCls(navOn('/contact'))}>Contact Us</Link>
      </nav>
    </header>
  );
}
