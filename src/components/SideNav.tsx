import { Link } from 'react-router-dom';

export interface SideItem { num: string; label: string; href: string }

export default function SideNav({
  items, kicker, footLinks,
}: { items: SideItem[]; kicker: string; footLinks: { label: string; to: string }[] }) {
  return (
    <nav
      className="hidden lg:block fixed top-[54px] left-0 w-[268px] h-[calc(100vh-54px)] overflow-auto
        px-3.5 pt-4.5 pb-8 border-r border-hair bg-[color-mix(in_srgb,var(--paper)_55%,transparent)] z-60"
      aria-label="Section navigation"
    >
      <div className="px-2.5 pb-3.5 mb-2 border-b border-hair">
        <span className="block font-head font-bold text-[12px] tracking-[.16em] uppercase">
          BETTERARCH<b className="text-red">.ORG</b>
        </span>
        <span className="block mt-1.5 font-mono text-[10.5px] text-faint">{kicker}</span>
      </div>
      {items.map((it) => (
        <a
          key={it.num}
          href={it.href}
          className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-muted hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-ink transition-colors"
        >
          <span className="font-num text-[13px] text-faint w-5 shrink-0">{it.num}</span>
          <span className="font-medium text-[12.5px]">{it.label}</span>
        </a>
      ))}
      <div className="mt-4.5 mx-3 pt-3.5 border-t border-hair font-mono text-[10.5px] leading-[1.8] text-faint">
        {footLinks.map((f) => (
          <Link key={f.to} to={f.to} className="block text-muted hover:text-deep">{f.label}</Link>
        ))}
      </div>
    </nav>
  );
}
