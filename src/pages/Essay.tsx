import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { DB } from '../data/db';
import { getCollaborator, collaboratorSlugForGuest } from '../data/collaborators';
import { keywordHref } from '../data/keywords';

/**
 * One page per essay. There is one sample essay in db.ts right now, to show
 * this template with real content; any other slug falls through to the same
 * home redirect Project/Episode already use for an id that doesn't exist.
 */
export default function Essay() {
  const { slug } = useParams();
  const essays: any[] = DB.essays as any;
  const seasons: any[] = DB.seasons as any;
  const essay = essays.find((x) => x.slug === slug);
  if (!essay) return <Navigate to="/" replace />;

  const s = seasons.find((x) => x.slug === essay.season);
  const authorCollaborator = essay.author ? getCollaborator(collaboratorSlugForGuest(essay.author)) : undefined;
  const keywords: { word: string; freq: number; gloss?: string }[] = essay.keywords ?? [];

  const items = [
    { num: '01', label: 'Essay', href: '#s01' },
    { num: '02', label: 'Keywords', href: '#s02' },
    { num: '03', label: 'Collaborators', href: '#s03' },
  ];

  return (
    <InnerLayout
      sideItems={items}
      sideKicker={s ? `${s.no} · ${s.title}` : 'Essay'}
      sideFoot={[
        { label: '← Home', to: '/' },
        ...(s ? [{ label: s.title, to: `/project/${s.slug}` }] : []),
        { label: 'Contact', to: '/contact' },
      ]}
    >
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">
        {s ? `${s.no} · ${s.title} · Essay` : 'Essay'}
      </p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">{essay.title}</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">
        {essay.author ? (
          authorCollaborator ? (
            <>By <Link to={`/collaborator/${authorCollaborator.slug}`} className="underline">{essay.author}</Link>{essay.sub ? ` · ${essay.sub}` : ''}</>
          ) : (
            <>By {essay.author}{essay.sub ? ` · ${essay.sub}` : ''}</>
          )
        ) : (
          essay.sub || null
        )}
      </p>

      <Section ac="ac4" num="01" title="Essay">
        <div className="read space-y-4">
          {essay.body.map((p: string, i: number) => <p key={i}>{p}</p>)}
        </div>
      </Section>

      <Section ac="ac7" num="02" title="Keywords">
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
          <p className="text-muted max-w-[62ch]">No keywords have been mapped for this essay yet.</p>
        )}
      </Section>

      <Section ac="ac5" num="03" title="Collaborators">
        {essay.author ? (
          authorCollaborator ? (
            <Link to={`/collaborator/${authorCollaborator.slug}`} className="flex flex-col gap-1 bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all max-w-sm">
              <span className="font-semibold">{essay.author}</span>
              <span className="text-xs text-muted">{authorCollaborator.episodeIds.length} episode{authorCollaborator.episodeIds.length === 1 ? '' : 's'} on the site</span>
            </Link>
          ) : (
            <p className="font-semibold">{essay.author}</p>
          )
        ) : (
          <p className="text-muted max-w-[62ch]">No collaborator is linked to this essay.</p>
        )}
      </Section>

      <SiteFooter />
    </InnerLayout>
  );
}
