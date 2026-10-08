import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { useSiteData } from '../data/store';
import { keywordHref } from '../data/keywords';
import { collaboratorSlugForName } from '../data/collaborators';
import { useCollaborator } from '../data/useCollaborators';
import { useCollaboratorPopup } from '../lib/collaboratorPopup';

export default function Essay() {
  const { slug } = useParams();
  const { open } = useCollaboratorPopup();
  const { data } = useSiteData();
  const essay = data.essays.find((x) => x.slug === slug);
  const collaborator = useCollaborator(essay?.author ? collaboratorSlugForName(essay.author) : undefined);
  if (!essay) return <Navigate to="/" replace />;
  const s = data.themes.find((x) => x.slug === essay.season);

  const items = [
    { num: '01', label: 'Essay', href: '#s01' },
    { num: '02', label: 'Keywords', href: '#s02' },
    { num: '03', label: 'Collaborators', href: '#s03' },
  ];

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">
        {s ? `${s.no} · Essay` : 'Essay'}
      </p>
      <h1 className="font-head font-extrabold text-[clamp(2.2rem,6.5vw,3.8rem)] leading-[1.02] tracking-tight mb-4">
        {essay.title}
      </h1>
      {(essay.author || essay.sub) && (
        <p className="font-head font-semibold text-[1.1rem] leading-[1.5] text-muted max-w-[56ch]">
          {essay.author ? `By ${essay.author}` : ''}
          {essay.author && essay.sub ? ' · ' : ''}
          {essay.sub || ''}
        </p>
      )}

      <Section ac="ac1" num="01" title="Essay">
        <div className="read space-y-4">
          {essay.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Section>

      <Section ac="ac2" num="02" title="Keywords">
        {essay.keywords?.length ? (
          <div className="flex flex-wrap gap-2">
            {essay.keywords.map((k) => (
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
          <p className="text-muted max-w-[62ch]">No keywords have been mapped to this essay yet.</p>
        )}
      </Section>

      <Section ac="ac8" num="03" title="Collaborators">
        {collaborator ? (
          <button
            onClick={() => open(collaborator.slug)}
            className="text-left flex flex-col gap-1 bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] transition-all"
          >
            <span className="font-semibold">{collaborator.name}</span>
            <span className="text-xs text-muted">View collaborator card</span>
          </button>
        ) : (
          <p className="text-muted max-w-[62ch]">No collaborator is linked to this essay.</p>
        )}
      </Section>

      <SiteFooter />
    </InnerLayout>
  );
}
