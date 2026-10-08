import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { useSiteData } from '../data/store';
import { keywordHref } from '../data/keywords';
import { useCollaboratorsForTheme } from '../data/useCollaborators';
import { useCollaboratorPopup } from '../lib/collaboratorPopup';

export default function SubTheme() {
  const { slug, subSlug } = useParams();
  const { data } = useSiteData();
  const { open } = useCollaboratorPopup();
  const collaborators = useCollaboratorsForTheme(slug);

  const t = data.themes.find((x) => x.slug === slug);
  if (!t) return <Navigate to="/themes" replace />;
  const st = t.subThemes.find((x) => x.slug === subSlug);
  if (!st) return <Navigate to={`/theme/${slug}`} replace />;

  // Episodes/essays are not yet individually mapped to sub-themes (only to
  // their parent theme), so these sections stay honestly empty for now.
  const mappedEpisodes: typeof data.episodes = [];
  const mappedEssays: typeof data.essays = [];

  const items = [
    { num: '01', label: 'About this sub-theme', href: '#s01' },
    { num: '02', label: 'Episodes', href: '#s02' },
    { num: '03', label: 'Essays', href: '#s03' },
    { num: '04', label: 'Keywords', href: '#s04' },
    { num: '05', label: 'Collaborators', href: '#s05' },
    ...(st.tertiaryThemes?.length ? [{ num: '06', label: 'Tertiary themes', href: '#s06' }] : []),
  ];

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">
        {t.no} · {t.title} · Sub-theme
      </p>
      <h1 className="font-head font-extrabold text-[clamp(2.2rem,6.5vw,3.8rem)] leading-[1.02] tracking-tight mb-4">
        {st.title}
      </h1>
      <p className="font-head font-semibold text-[1.1rem] leading-[1.5] text-muted max-w-[56ch]">{st.shortDesc}</p>

      <Section ac="ac1" num="01" title="About this sub-theme">
        <p className="text-[.99rem] leading-[1.62]">{st.longDesc || st.shortDesc}</p>
      </Section>

      <Section ac="ac6" num="02" title="Episodes">
        {mappedEpisodes.length ? (
          <div className="space-y-2" />
        ) : (
          <p className="text-muted max-w-[62ch]">
            Episodes have not yet been mapped to this sub-theme in the console. They will appear here once that
            mapping is done.
          </p>
        )}
      </Section>

      <Section ac="ac5" num="03" title="Essays">
        {mappedEssays.length ? (
          <div className="space-y-2" />
        ) : (
          <p className="text-muted max-w-[62ch]">
            Essays have not yet been mapped to this sub-theme in the console. They will appear here once that
            mapping is done.
          </p>
        )}
      </Section>

      <Section ac="ac2" num="04" title="Keywords">
        {st.keywords?.length ? (
          <div className="flex flex-wrap gap-2">
            {st.keywords.map((k) => (
              <Link
                key={k.word}
                to={keywordHref(k.word)}
                className="text-[.8rem] lowercase text-deep bg-[color-mix(in_srgb,var(--red)_9%,transparent)] px-3 py-1.5 rounded-full hover:bg-[color-mix(in_srgb,var(--red)_16%,transparent)] transition-colors"
              >
                {k.word} · {k.freq}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">No keywords have been mapped to this sub-theme yet.</p>
        )}
      </Section>

      <Section ac="ac8" num="05" title="Collaborators">
        {collaborators.length ? (
          <div className="grid sm:grid-cols-2 gap-3.5">
            {collaborators.map((c) => (
              <button
                key={c.slug}
                onClick={() => open(c.slug)}
                className="text-left flex flex-col gap-1 bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] transition-all"
              >
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-muted">View collaborator card</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">No collaborators are linked to this theme yet.</p>
        )}
      </Section>

      {st.tertiaryThemes?.length ? (
        <Section ac="ac3" num="06" title="Tertiary themes">
          <div className="space-y-3">
            {st.tertiaryThemes.map((tier) => (
              <div key={tier.slug} className="bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)]">
                <h4 className="font-head font-bold text-[.98rem] mb-1">{tier.title}</h4>
                <p className="text-sm text-muted">{tier.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <SiteFooter />
    </InnerLayout>
  );
}
