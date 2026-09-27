import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { DB } from '../data/db';
import { keywordHref } from '../data/keywords';

/**
 * One page per sub-theme (the "Key themes" list on a category page), matching
 * the page-architecture note that every Category / Sub-theme / Episode / Essay
 * page is template based: this is that template, filled in with whichever
 * sub-theme's slug is in the URL.
 *
 * Episodes and Essays are not yet tagged to an individual sub-theme (only to
 * their parent category), so those two sections show an honest "not mapped
 * yet" state rather than guessing. Once the console can attach a sub-theme to
 * an episode or essay, this page starts listing them with no further changes
 * needed here. Keywords are different: a sub-theme carries its own keyword
 * list directly (see db.ts), so that section renders real, linkable data
 * wherever a sub-theme has been given any.
 */
export default function SubTheme() {
  const { slug, themeSlug } = useParams();
  const seasons: any[] = DB.seasons as any;
  const s = seasons.find((x) => x.slug === slug);
  if (!s) return <Navigate to="/" replace />;
  const theme = s.themes.find((t: any) => t.slug === themeSlug);
  if (!theme) return <Navigate to={`/project/${slug}`} replace />;
  const keywords: { word: string; freq: number; gloss?: string }[] = theme.keywords ?? [];

  const items = [
    { num: '01', label: 'About this sub-theme', href: '#s01' },
    { num: '02', label: 'Episodes', href: '#s02' },
    { num: '03', label: 'Essays', href: '#s03' },
    { num: '04', label: 'Keywords', href: '#s04' },
    { num: '05', label: 'Collaborators', href: '#s05' },
  ];

  const notMapped = (kind: string) => (
    <p className="text-muted max-w-[62ch]">
      {kind} aren't tagged to individual sub-themes yet, only to {s.title} as a whole. Once that mapping is added
      in the console, matching {kind.toLowerCase()} will appear here automatically.
    </p>
  );

  return (
    <InnerLayout
      sideItems={items}
      sideKicker={`${s.no} · ${s.title}`}
      sideFoot={[
        { label: '← Home', to: '/' },
        { label: s.title, to: `/project/${s.slug}` },
        { label: 'Contact', to: '/contact' },
      ]}
    >
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">
        <Link to={`/project/${s.slug}`} className="hover:underline">{s.no} · {s.title}</Link> · Sub-theme
      </p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">{theme.title}</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">{theme.desc}</p>

      <Section ac="ac2" num="01" title="About this sub-theme">
        <p className="max-w-[62ch]">{theme.desc}</p>
      </Section>

      <Section ac="ac6" num="02" title="Episodes">
        {notMapped('Episodes')}
      </Section>

      <Section ac="ac4" num="03" title="Essays">
        {notMapped('Essays')}
      </Section>

      <Section ac="ac7" num="04" title="Keywords">
        {keywords.length ? (
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <Link
                key={k.word}
                to={keywordHref(k.word)}
                title={k.gloss}
                className="text-[.8rem] text-deep bg-[color-mix(in_srgb,var(--red)_9%,transparent)] px-3 py-1.5 rounded-full hover:bg-[color-mix(in_srgb,var(--red)_16%,transparent)] transition-colors"
              >
                {k.word} <span className="text-faint">· {k.freq}</span>
              </Link>
            ))}
          </div>
        ) : (
          notMapped('Keywords')
        )}
      </Section>

      <Section ac="ac5" num="05" title="Collaborators">
        {notMapped('Collaborators')}
      </Section>

      <SiteFooter />
    </InnerLayout>
  );
}
