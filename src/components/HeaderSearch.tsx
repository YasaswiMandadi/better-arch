import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useSiteSearch } from '../data/useSiteSearch';
import { useCollaboratorPopup } from '../lib/collaboratorPopup';

/** The header's search icon → feeds the keyword/collaborator/theme/episode/
 * essay index (doc: "Search Box (Feeds into Keywords, collaborators index
 * etc)"). Works the same from the dark Home header and the light inner-page
 * Topbar. */
export default function HeaderSearch({ variant }: { variant: 'dark' | 'light' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const results = useSiteSearch(q);
  const navigate = useNavigate();
  const { open: openCollaborator } = useCollaboratorPopup();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onOutside(ev: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(ev.target as Node)) setOpen(false);
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

  function go(href: string) {
    if (href.startsWith('#collaborator:')) {
      openCollaborator(href.slice('#collaborator:'.length));
    } else {
      navigate(href);
    }
    setOpen(false);
    setQ('');
  }

  const iconCls =
    variant === 'dark'
      ? 'text-[#7A7F84] hover:text-[#E4E7EA] transition-colors'
      : 'text-muted hover:text-ink transition-colors';

  const groups = Array.from(new Set(results.map((r) => r.group)));

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Search" className={iconCls}>
        {open ? <X size={16} /> : <Search size={16} />}
      </button>
      {open && (
        <div
          className={`absolute top-full right-0 mt-3 w-[min(90vw,380px)] rounded-[10px] p-3 shadow-[0_26px_70px_rgba(0,0,0,.35)] ${
            variant === 'dark'
              ? 'bg-[rgba(10,10,11,.95)] backdrop-blur-md border border-white/10'
              : 'bg-card border border-hair'
          }`}
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search themes, episodes, essays, keywords, collaborators…"
            className={`w-full text-sm rounded-lg px-3 py-2.5 outline-none ${
              variant === 'dark'
                ? 'bg-white/[.06] text-[#E4E7EA] placeholder:text-[#6b6f73] border border-white/10 focus:border-white/30'
                : 'bg-paper text-ink placeholder:text-faint border border-hair focus:border-red'
            }`}
          />
          {q.trim() && (
            <div className="mt-2 max-h-[340px] overflow-auto">
              {results.length === 0 && (
                <p className={`text-xs px-2 py-3 ${variant === 'dark' ? 'text-[#6b6f73]' : 'text-faint'}`}>No matches.</p>
              )}
              {groups.map((g) => (
                <div key={g} className="mb-2">
                  <span className={`block text-[10px] font-semibold uppercase tracking-wide px-2 py-1 ${variant === 'dark' ? 'text-[#6b6f73]' : 'text-faint'}`}>
                    {g}
                  </span>
                  {results.filter((r) => r.group === g).map((r) => (
                    <button
                      key={r.group + r.label + r.href}
                      onClick={() => go(r.href)}
                      className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors ${
                        variant === 'dark' ? 'text-[#E4E7EA] hover:bg-white/[.07]' : 'text-ink hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]'
                      }`}
                    >
                      <span className="block font-medium">{r.label}</span>
                      {r.sub && <span className={`block text-xs ${variant === 'dark' ? 'text-[#7A7F84]' : 'text-muted'}`}>{r.sub}</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
