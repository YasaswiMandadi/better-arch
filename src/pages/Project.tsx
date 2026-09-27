import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { DB } from '../data/db';
import { getAnalysis } from '../data/analysis';
import { collaboratorsForSeason } from '../data/collaborators';
import { keywordHref } from '../data/keywords';
import { ExternalLink } from 'lucide-react';

export default function Project() {
  const { slug } = useParams();
  const seasons: any[] = DB.seasons as any;
  const episodes: any[] = DB.episodes as any;
  const essays: any[] = DB.essays as any;
  const s = seasons.find((x) => x.slug === slug);
  if (!s) return <Navigate to="/" replace />;
  const eps = episodes.filter((e) => e.season === slug);
  const categoryEssays = essays.filter((es) => es.season === slug);
  const contributors = slug ? collaboratorsForSeason(slug) : [];

  const keywordTotals = new Map<string, number>();
  for (const e of eps) {
    if (!e.analysis) continue;
    const a = getAnalysis(e.id);
    if (!a) continue;
    for (const k of a.keywords) keywordTotals.set(k.word, (keywordTotals.get(k.word) ?? 0) + k.freq);
  }
  for (const es of categoryEssays) {
    for (const k of es.keywords ?? []) keywordTotals.set(k.word, (keywordTotals.get(k.word) ?? 0) + k.freq);
  }
  for (const t of s.themes) {
    for (const k of t.keywords ?? []) keywordTotals.set(k.word, (keywordTotals.get(k.word) ?? 0) + k.freq);
  }
  const keywords = Array.from(keywordTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  const items = [
    { num: '01', label: 'About the project', href: '#s01' },
    { num: '02', label: 'Key themes', href: '#s02' },
    { num: '03', label: 'Future directions', href: '#s03' },
    { num: '04', label: 'Conversations', href: '#s04' },
    { num: '05', label: 'Essays', href: '#s05' },
    { num: '06', label: 'Keywords', href: '#s06' },
    { num: '07', label: 'Contributors', href: '#s07' },
    ...(s.links?.length ? [{ num: '08', label: 'Further reading', href: '#s08' }] : []),
  ];

  return (
    <InnerLayout
      sideItems={items}
      sideKicker={`${s.no} · ${s.title}`}
      sideFoot={[{ label: '← Home', to: '/' }, { label: 'All episodes', to: '/episodes' }, { label: 'About', to: '/about' }, { label: 'Contact', to: '/contact' }]}
    >
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">{s.no} · {s.status} · {s.period}</p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">{s.title}</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">{s.one}</p>

      <Section ac="ac1" num="01" title="About the project">
        <div className="read space-y-4">
          {s.summary.map((p: string, i: number) => <p key={i}>{p}</p>)}
        </div>
      </Section>

      <Section ac="ac2" num="02" title="Key themes">
        <div className="space-y-3.5">
          {s.themes.map((t: { slug: string; title: string; desc: string }, i: number) => (
            <Link
              key={t.slug}
              to={`/project/${s.slug}/theme/${t.slug}`}
              className="grid grid-cols-[54px_1fr] gap-1.5 bg-card border border-hair rounded-[10px] py-4.5 pr-5.5 pl-4.5 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all"
            >
              <div className="font-num text-[1.35rem] text-acd pt-0.5">{String(i + 1).padStart(2, '0')}</div>
              <div>
                <h3 className="font-head font-bold text-[1.14rem] leading-[1.35] tracking-tight mb-2">{t.title}</h3>
                <p className="text-[.99rem] leading-[1.62]">{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section ac="ac9" num="03" title="Future directions">
        <p>{s.future}</p>
      </Section>

      <Section ac="ac6" num="04" title="Conversations">
        {eps.length ? (
          <div className="space-y-2">
            {eps.map((e) => {
              const rowClass = "flex flex-wrap items-center gap-x-3 gap-y-1 bg-card border border-hair rounded-[10px] px-5 py-3.5 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all";
              const inner = (
                <>
                  <span className="font-num text-lg text-acd w-8 shrink-0">{e.no}</span>
                  <span className="flex-1 min-w-[200px]">
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
        ) : (
          <p className="text-muted max-w-[62ch]">Episodes will appear here as they are published. Each will carry its own analysis record built through the BetterArch Console.</p>
        )}
      </Section>

      <Section ac="ac4" num="05" title="Essays">
        {categoryEssays.length ? (
          <div className="space-y-2">
            {categoryEssays.map((es) => (
              <Link key={es.id} to={`/essay/${es.slug}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-card border border-hair rounded-[10px] px-5 py-3.5 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all">
                <span className="flex-1 min-w-[200px]">
                  <span className="block font-semibold">{es.title}</span>
                  {es.author && <span className="block text-sm text-muted">by {es.author}</span>}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">No essays have been published for this category yet.</p>
        )}
      </Section>

      <Section ac="ac7" num="06" title="Keywords">
        {keywords.length ? (
          <div className="flex flex-wrap gap-2">
            {keywords.map(([word, freq]) => (
              <Link
                key={word}
                to={keywordHref(word)}
                className="text-[.8rem] text-deep bg-[color-mix(in_srgb,var(--red)_9%,transparent)] px-3 py-1.5 rounded-full hover:bg-[color-mix(in_srgb,var(--red)_16%,transparent)] transition-colors"
              >
                {word} <span className="text-faint">· {freq}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">Keywords are rolled up from this category's analysed episodes, essays and sub-themes; none carry any yet.</p>
        )}
      </Section>

      <Section ac="ac5" num="07" title="Contributors">
        {contributors.length ? (
          <div className="grid sm:grid-cols-2 gap-3.5">
            {contributors.map((c) => (
              <Link key={c.slug} to={`/collaborator/${c.slug}`} className="flex flex-col gap-1 bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all">
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-muted">{c.episodeIds.length} episode{c.episodeIds.length === 1 ? '' : 's'} in this category</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">No collaborators are linked to this category yet.</p>
        )}
      </Section>

      {s.links?.length ? (
        <Section ac="ac8" num="08" title="Further reading">
          <ul className="space-y-3 pl-0 list-none">
            {s.links.map((l: [string, string]) => (
              <li key={l[1]} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hair pb-3">
                <a href={l[1]} target="_blank" rel="noopener" className="font-medium flex items-center gap-1.5 hover:underline">
                  {l[0]} <ExternalLink size={12} />
                </a>
                <span className="text-xs text-faint">{l[1].replace(/^https?:\/\//, '').split('/')[0]}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <SiteFooter />
    </InnerLayout>
  );
}
