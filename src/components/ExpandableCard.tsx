import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../lib/theme';

export interface ExpandableCardProps {
  title: string;
  shortDesc: string;
  longDesc?: string;
  meta?: string;
  keywords?: string[];
  to: string;
  darkHex?: string;
  lightHex?: string;
}

/**
 * The two-card-state design the doc specifies for Theme and Sub-theme cards:
 * compact (title + short description only) and expanded (adds long
 * description, run status, keywords). Clicking the expanded card's title
 * takes you to the individual page; clicking elsewhere toggles the state.
 */
export default function ExpandableCard({ title, shortDesc, longDesc, meta, keywords, to, darkHex, lightHex }: ExpandableCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const accent = theme === 'dark' ? darkHex : lightHex;

  return (
    <div
      className="bg-card border border-hair rounded-[10px] shadow-[var(--shs)] overflow-hidden transition-all"
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left px-5 py-4.5 flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-head font-bold text-[1.05rem] leading-[1.3] tracking-tight mb-1.5">{title}</h3>
          <p className="text-[.92rem] text-muted leading-[1.55] line-clamp-3">{shortDesc || 'No description yet.'}</p>
        </div>
        <ChevronDown size={18} className="shrink-0 text-faint transition-transform mt-1" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-0.5 border-t border-hair">
          {longDesc && <p className="text-[.94rem] leading-[1.6] text-ink/90 mt-3.5">{longDesc}</p>}
          {meta && <p className="text-xs text-faint mt-2.5">{meta}</p>}
          {keywords && keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {keywords.slice(0, 5).map((k) => (
                <span key={k} className="text-[.68rem] lowercase text-deep bg-[color-mix(in_srgb,var(--red)_9%,transparent)] px-2.5 py-1 rounded-full">{k}</span>
              ))}
            </div>
          )}
          <Link
            to={to}
            className="mt-4 inline-flex items-center gap-1.5 font-head font-bold text-[.78rem] bg-ink text-paper rounded-lg px-4 py-2.5 hover:bg-deep transition-colors"
          >
            Open page →
          </Link>
        </div>
      )}
    </div>
  );
}
