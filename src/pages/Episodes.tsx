import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import SiteFooter from '../components/SiteFooter';
import { useSiteData } from '../data/store';
import { isEpisodePublished } from '../data/types';

export default function Episodes() {
  const { data } = useSiteData();
  const seasons = data.themes;
  const episodes = data.episodes.filter(isEpisodePublished);
  const [filter, setFilter] = useState<string>('all');

  const seasonBySlug = useMemo(() => {
    const m: Record<string, any> = {};
    seasons.forEach((s) => { m[s.slug] = s; });
    return m;
  }, [seasons]);

  const shown = filter === 'all' ? episodes : episodes.filter((e) => e.season === filter);

  const items = [
    { num: '00', label: 'All episodes', href: '#top' },
    ...seasons.map((s, i) => ({ num: String(i + 1).padStart(2, '0'), label: s.title, href: `/theme/${s.slug}` })),
  ];

  return (
    <InnerLayout sideItems={items}>
      <p id="top" className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">Episodes</p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">Every conversation, in one place.</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">
        {episodes.length} episodes across {seasons.length} seasons. Filter by season, or open a conversation directly.
      </p>

      <div className="flex flex-wrap gap-2 mt-8 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`text-sm font-semibold px-4 py-2.5 rounded-full transition-colors ${filter === 'all' ? 'bg-ink text-paper' : 'bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-muted hover:text-ink'}`}
        >
          All ({episodes.length})
        </button>
        {seasons.map((s) => {
          const count = episodes.filter((e) => e.season === s.slug).length;
          return (
            <button
              key={s.slug}
              onClick={() => setFilter(s.slug)}
              className={`text-sm font-semibold px-4 py-2.5 rounded-full transition-colors ${filter === s.slug ? 'bg-ink text-paper' : 'bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-muted hover:text-ink'}`}
            >
              {s.title} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {shown.map((e) => {
          const s = seasonBySlug[e.season];
          const rowClass = "flex flex-wrap items-center gap-x-3 gap-y-1 bg-card border border-hair rounded-[10px] px-5 py-3.5 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all";
          const inner = (
            <>
              <span className="font-num text-lg text-acd w-8 shrink-0">{e.no}</span>
              <span className="flex-1 min-w-[220px]">
                <span className="block text-[.68rem] font-semibold uppercase tracking-wide text-red mb-0.5">{s?.title ?? e.season}</span>
                <span className="block font-semibold">{e.title}</span>
                {e.guest && <span className="block text-sm text-muted">with {e.guest}</span>}
                {e.sub && <span className="block text-sm text-muted">{e.sub}</span>}
              </span>
              <span className={`text-[.68rem] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full ${e.analysis ? 'bg-[color-mix(in_srgb,var(--red)_14%,transparent)] text-deep' : 'bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-muted'}`}>
                {e.analysis ? 'analysis live' : 'listen on spotify'}
              </span>
            </>
          );
          return e.analysis ? (
            <Link key={e.id} to={`/episode/${e.id}`} className={rowClass}>{inner}</Link>
          ) : (
            <a key={e.id} href={e.url} target="_blank" rel="noopener" className={rowClass}>{inner}</a>
          );
        })}
      </div>

      <SiteFooter />
    </InnerLayout>
  );
}
