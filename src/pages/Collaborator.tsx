import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { DB } from '../data/db';
import { getCollaborator } from '../data/collaborators';

/**
 * One page per collaborator. The roster itself is derived automatically from
 * episode guest names (see src/data/collaborators.ts), so this page never
 * needs its own seed data to stay accurate, it just renders whichever
 * collaborator's slug is in the URL, plus every episode they're linked to.
 *
 * Bios are intentionally blank until a real one is written for this person;
 * this template does not invent biographical text.
 */
export default function CollaboratorPage() {
  const { slug } = useParams();
  const c = slug ? getCollaborator(slug) : undefined;
  if (!c) return <Navigate to="/" replace />;

  const episodes: any[] = DB.episodes as any;
  const seasons: any[] = DB.seasons as any;
  const eps = episodes.filter((e) => c.episodeIds.includes(e.id));

  const items = [
    { num: '01', label: 'Episodes', href: '#s01' },
  ];

  return (
    <InnerLayout
      sideItems={items}
      sideKicker="Collaborator"
      sideFoot={[{ label: '← Home', to: '/' }, { label: 'All episodes', to: '/episodes' }, { label: 'Contact', to: '/contact' }]}
    >
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">Collaborator</p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">{c.name}</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">
        {c.bio || 'A biography for this collaborator hasn\u2019t been added yet.'}
      </p>

      <Section ac="ac6" num="01" title="Episodes">
        {eps.length ? (
          <div className="space-y-2">
            {eps.map((e) => {
              const s = seasons.find((x) => x.slug === e.season);
              const rowClass = "flex flex-wrap items-center gap-x-3 gap-y-1 bg-card border border-hair rounded-[10px] px-5 py-3.5 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all";
              return (
                <Link key={e.id} to={`/episode/${e.id}`} className={rowClass}>
                  <span className="font-num text-lg text-acd w-8 shrink-0">{e.no}</span>
                  <span className="flex-1 min-w-[200px]">
                    <span className="block font-semibold">{e.title}</span>
                    {s && <span className="block text-sm text-muted">{s.title}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">No episodes linked yet.</p>
        )}
      </Section>

      <SiteFooter />
    </InnerLayout>
  );
}
