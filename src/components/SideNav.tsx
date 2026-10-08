import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Mail, PanelsTopLeft, Search, X } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useSiteData } from '../data/store';
import { useSiteSearch } from '../data/useSiteSearch';
import { useCollaboratorPopup } from '../lib/collaboratorPopup';

export interface SideItem { num: string; label: string; href: string }

function apaCitation(): string {
  const year = new Date().getFullYear();
  const title = document.title.split('·')[0].trim() || document.title;
  return `The Better Architecture Project. (${year}). ${title}. BetterArch.org. Retrieved from ${window.location.href}`;
}

function UpperBox({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle: () => void; onNavigate?: () => void }) {
  const { theme, toggle } = useTheme();
  const { data } = useSiteData();
  const [email, setEmail] = useState('');
  const [signedUp, setSignedUp] = useState(false);
  const [cited, setCited] = useState(false);
  const [q, setQ] = useState('');
  const results = useSiteSearch(q);
  const navigate = useNavigate();
  const { open: openCollaborator } = useCollaboratorPopup();
  const groups = Array.from(new Set(results.map((r) => r.group)));

  function goToResult(href: string) {
    if (href.startsWith('#collaborator:')) {
      openCollaborator(href.slice('#collaborator:'.length));
    } else {
      navigate(href);
    }
    setQ('');
    onNavigate?.();
  }

  function signUp() {
    const addr = email.trim();
    if (!addr || !addr.includes('@')) return;
    try {
      const list = JSON.parse(localStorage.getItem('ba-newsletter-signups') || '[]');
      list.push({ email: addr, ts: new Date().toISOString() });
      localStorage.setItem('ba-newsletter-signups', JSON.stringify(list));
    } catch {
      /* best-effort */
    }
    setSignedUp(true);
    setEmail('');
  }

  async function citeThis() {
    try {
      await navigator.clipboard.writeText(apaCitation());
      setCited(true);
      setTimeout(() => setCited(false), 1800);
    } catch {
      /* clipboard may be unavailable; silently no-op */
    }
  }

  return (
    <div className="border-b border-hair">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3.5 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <span className="font-head font-bold text-[11px] tracking-[.14em] uppercase text-faint">Site tools</span>
        <ChevronDown size={14} className="text-faint transition-transform" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
      </button>
      {!collapsed && (
        <div className="px-3.5 pb-4 space-y-4">
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-faint mb-1.5">Search</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Themes, episodes, essays, keywords…"
                className="w-full bg-card border border-hair rounded-md pl-8 pr-2.5 py-2 text-[12px] outline-none focus:border-red"
              />
            </div>
            {q.trim() && (
              <div className="mt-1.5 max-h-[280px] overflow-auto bg-card border border-hair rounded-md">
                {results.length === 0 && <p className="text-[11.5px] text-faint px-2.5 py-2.5">No matches.</p>}
                {groups.map((g) => (
                  <div key={g} className="py-1">
                    <span className="block text-[9.5px] font-semibold uppercase tracking-wide text-faint px-2.5 py-1">{g}</span>
                    {results.filter((r) => r.group === g).map((r) => (
                      <button
                        key={r.group + r.label + r.href}
                        onClick={() => goToResult(r.href)}
                        className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] transition-colors"
                      >
                        <span className="block font-medium">{r.label}</span>
                        {r.sub && <span className="block text-[10.5px] text-muted">{r.sub}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 font-mono text-[10.5px]">
            {data.site.socials.map((s) => (
              <a key={s[0]} href={s[1]} target="_blank" rel="noopener" className="text-muted hover:text-deep uppercase">{s[0]}</a>
            ))}
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-faint mb-1.5">Newsletter</label>
            {signedUp ? (
              <p className="text-[12px] text-muted">Thanks — you're on the list.</p>
            ) : (
              <div className="flex gap-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 min-w-0 bg-card border border-hair rounded-md px-2.5 py-2 text-[12px] outline-none focus:border-red"
                />
                <button onClick={signUp} className="shrink-0 bg-ink text-paper rounded-md px-2.5 text-[11px] font-semibold flex items-center gap-1">
                  <Mail size={11} /> Join
                </button>
              </div>
            )}
          </div>

          <button
            onClick={toggle}
            className="w-full flex items-center justify-center gap-2 font-head font-semibold text-[11px] tracking-[.05em] uppercase bg-card text-ink border border-hair rounded-lg px-3 py-2.5"
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>

          <button
            onClick={citeThis}
            className="w-full font-head font-semibold text-[11px] tracking-[.05em] uppercase border border-hair rounded-lg px-3 py-2.5 hover:border-muted transition-colors"
          >
            {cited ? 'Citation copied!' : 'Cite this page'}
          </button>
        </div>
      )}
    </div>
  );
}

function LowerBox({ items, collapsed, onToggle, onNavigate }: { items: SideItem[]; collapsed: boolean; onToggle: () => void; onNavigate?: () => void }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3.5 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <span className="font-head font-bold text-[11px] tracking-[.14em] uppercase text-faint">On this page</span>
        <ChevronDown size={14} className="text-faint transition-transform" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
      </button>
      {!collapsed && (
        <div className="pb-3">
          {items.map((it) => (
            <a
              key={it.num}
              href={it.href}
              onClick={onNavigate}
              className="flex items-start gap-2.5 px-3.5 py-2 text-muted hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-ink transition-colors"
            >
              <span className="font-num text-[13px] text-faint w-5 shrink-0">{it.num}</span>
              <span className="font-medium text-[12.5px]">{it.label}</span>
            </a>
          ))}
          {items.length === 0 && <p className="px-3.5 text-[12px] text-faint">No sections on this page.</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Universal Side Panel, per the doc: an Upper Box that's constant across
 * the site (its own search box feeding the same index as the header's,
 * plus social links, newsletter sign-up, dark/light toggle, "Cite This")
 * and a Lower Box that's a section navigator
 * for whatever page you're on. Both boxes carry their own chevron to fold
 * to just their header. Desktop: a fixed left-hand panel, open by default.
 * Mobile: the client's doc says they're still deciding this, so this picks
 * a reasonable default — a bottom-sheet drawer opened from a floating button.
 */
export default function SideNav({ items }: { items: SideItem[] }) {
  const [upperCollapsed, setUpperCollapsed] = useState(false);
  const [lowerCollapsed, setLowerCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    function onEscape(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [mobileOpen]);

  const panelBody = (onNavigate?: () => void) => (
    <>
      <UpperBox collapsed={upperCollapsed} onToggle={() => setUpperCollapsed((v) => !v)} onNavigate={onNavigate} />
      <LowerBox items={items} collapsed={lowerCollapsed} onToggle={() => setLowerCollapsed((v) => !v)} onNavigate={onNavigate} />
    </>
  );

  return (
    <>
      {/* Desktop panel */}
      <nav
        ref={panelRef}
        className="hidden lg:block fixed top-[54px] left-0 w-[268px] h-[calc(100vh-54px)] overflow-auto
          border-r border-hair bg-[color-mix(in_srgb,var(--paper)_55%,transparent)] z-60"
        aria-label="Universal side panel"
      >
        {panelBody()}
      </nav>

      {/* Mobile floating trigger + drawer */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-5 right-5 z-80 flex items-center gap-2 bg-ink text-paper rounded-full px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,.35)] font-head font-semibold text-[11px] tracking-wide uppercase"
        aria-label="Open sections panel"
      >
        <PanelsTopLeft size={14} /> Sections
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-90 bg-black/50" onClick={(ev) => { if (ev.target === ev.currentTarget) setMobileOpen(false); }}>
          <div className="absolute bottom-0 inset-x-0 max-h-[80vh] overflow-auto bg-paper border-t border-hair rounded-t-2xl">
            <div className="flex justify-between items-center px-4 py-3 border-b border-hair sticky top-0 bg-paper">
              <span className="font-head font-bold text-[12px] uppercase tracking-wide">Site tools &amp; sections</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close" className="border border-hair rounded-full p-1.5 text-muted">
                <X size={14} />
              </button>
            </div>
            {panelBody(() => setMobileOpen(false))}
          </div>
        </div>
      )}
    </>
  );
}
