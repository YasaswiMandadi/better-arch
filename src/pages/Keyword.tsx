import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { getKeyword, type KeywordOccurrenceType } from '../data/keywords';

/**
 * One page per keyword, a hashtag page: every episode, essay, and sub-theme
 * that carries this word links out from here. Like collaborators, this list
 * is derived automatically (see src/data/keywords.ts), there's nothing to
 * hand-maintain, tag a fourth episode with "criticality" and it appears here
 * with no further changes.
 */
const GROUP_ORDER: { type: KeywordOccurrenceType; title: string }[] = [
  { type: 'episode', title: 'Episodes' },
  { type: 'essay', title: 'Essays' },
  { type: 'subtheme', title: 'Sub-themes' },
];

export default function Keyword() {
  const { slug } = useParams();
  const k = slug ? getKeyword(slug) : undefined;
  if (!k) return <Navigate to="/" replace />;

  const items = [{ num: '01', label: 'Where this appears', href: '#s01' }];

  return (
    <InnerLayout
      sideItems={items}
      sideKicker="Keyword"
      sideFoot={[{ label: '← Home', to: '/' }, { label: 'Contact', to: '/contact' }]}
    >
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">Keyword</p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">#{k.word}</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">
        Appears in {k.occurrences.length} place{k.occurrences.length === 1 ? '' : 's'} across the site.
      </p>

      <Section ac="ac7" num="01" title="Where this appears">
        <div className="space-y-7">
          {GROUP_ORDER.map((g) => {
            const items = k.occurrences.filter((o) => o.type === g.type);
            if (!items.length) return null;
            return (
              <div key={g.type}>
                <h4 className="font-head font-bold text-sm uppercase tracking-wide text-acd mb-3">{g.title}</h4>
                <div className="space-y-2">
                  {items.map((o, i) => (
                    <Link
                      key={i}
                      to={o.href}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-card border border-hair rounded-[10px] px-5 py-3.5 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all"
                    >
                      <span className="flex-1 min-w-[200px]">
                        <span className="block font-semibold">{o.label}</span>
                        {o.context && <span className="block text-sm text-muted">{o.context}</span>}
                        {o.gloss && <span className="block text-xs text-faint mt-0.5">{o.gloss}</span>}
                      </span>
                      {o.freq != null && <span className="text-xs text-faint whitespace-nowrap">mentioned {o.freq}×</span>}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <SiteFooter />
    </InnerLayout>
  );
}
