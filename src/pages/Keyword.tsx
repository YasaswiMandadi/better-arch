import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { type KeywordOccurrenceType } from '../data/keywords';
import { useKeyword } from '../data/useKeywords';

const GROUP_ORDER: { type: KeywordOccurrenceType; label: string }[] = [
  { type: 'episode', label: 'Episodes' },
  { type: 'essay', label: 'Essays' },
  { type: 'subtheme', label: 'Sub-themes' },
];

export default function Keyword() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const preview = sp.get('preview') || undefined;
  const entry = useKeyword(slug, preview);
  if (!entry) return <Navigate to="/" replace />;

  const items = GROUP_ORDER.filter((g) => entry.occurrences.some((o) => o.type === g.type)).map((g, i) => ({
    num: String(i + 1).padStart(2, '0'),
    label: g.label,
    href: `#s${String(i + 1).padStart(2, '0')}`,
  }));

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">Keyword</p>
      <h1 className="font-head font-extrabold text-[clamp(2.2rem,6.5vw,3.8rem)] leading-[1.02] tracking-tight mb-4">
        {entry.word}
      </h1>
      <p className="font-head font-semibold text-[1.1rem] leading-[1.5] text-muted max-w-[56ch]">
        Every episode, essay and sub-theme carrying this word, like a hashtag across the site.
      </p>

      {GROUP_ORDER.filter((g) => entry.occurrences.some((o) => o.type === g.type)).map((g, i) => {
        const occs = entry.occurrences.filter((o) => o.type === g.type);
        return (
          <Section key={g.type} ac={`ac${i + 1}`} num={String(i + 1).padStart(2, '0')} title={g.label}>
            <div className="space-y-2">
              {occs.map((o) => (
                <Link
                  key={o.href}
                  to={o.href}
                  className="flex flex-wrap items-center justify-between gap-2 bg-card border border-hair rounded-[10px] px-5 py-3.5 shadow-[var(--shs)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] transition-all"
                >
                  <span>
                    <span className="block font-semibold">{o.label}</span>
                    {o.context && <span className="block text-sm text-muted">{o.context}</span>}
                    {o.gloss && <span className="block text-sm text-muted mt-0.5">{o.gloss}</span>}
                  </span>
                  {typeof o.freq === 'number' && (
                    <span className="text-[.68rem] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--red)_14%,transparent)] text-deep shrink-0">
                      {o.freq}×
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </Section>
        );
      })}

      <SiteFooter />
    </InnerLayout>
  );
}
