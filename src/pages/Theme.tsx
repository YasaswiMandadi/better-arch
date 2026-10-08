import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import ExpandableCard from '../components/ExpandableCard';
import { useSiteData } from '../data/store';
import { isEpisodePublished } from '../data/types';
import { useCollaboratorRoster, useCollaboratorsForTheme } from '../data/useCollaborators';
import { keywordHref } from '../data/keywords';
import { useCollaboratorPopup } from '../lib/collaboratorPopup';
import { ExternalLink } from 'lucide-react';

export default function Theme() {
  const { slug } = useParams();
  const { data } = useSiteData();
  const { open } = useCollaboratorPopup();
  const roster = useCollaboratorRoster();
  const collaborators = useCollaboratorsForTheme(slug);

  const t = data.themes.find((x) => x.slug === slug);
  if (!t) return <Navigate to="/themes" replace />;

  const eps = data.episodes.filter((e) => e.season === slug && isEpisodePublished(e));
  const themeEssays = data.essays.filter((e) => e.season === slug);
  const investigators = t.investigatorSlugs.map((s) => roster.find((c) => c.slug === s)).filter(Boolean) as typeof roster;

  const keywordTotals = new Map<string, { word: string; freq: number }>();
  for (const k of t.keywords) keywordTotals.set(k.word, { word: k.word, freq: k.freq });
  for (const st of t.subThemes) {
    for (const k of st.keywords ?? []) {
      const cur = keywordTotals.get(k.word);
      keywordTotals.set(k.word, { word: k.word, freq: (cur?.freq ?? 0) + k.freq });
    }
  }
  for (const es of themeEssays) {
    for (const k of es.keywords ?? []) {
      const cur = keywordTotals.get(k.word);
      keywordTotals.set(k.word, { word: k.word, freq: (cur?.freq ?? 0) + k.freq });
    }
  }
  const topKeywords = Array.from(keywordTotals.values()).sort((a, b) => b.freq - a.freq).slice(0, 30);

  const items = [
    { num: '01', label: 'About this theme', href: '#s01' },
    { num: '02', label: 'Investigator Team', href: '#s02' },
    { num: '03', label: 'Key Concepts', href: '#s03' },
    { num: '04', label: 'Conversations', href: '#s04' },
    { num: '05', label: 'Sub-themes', href: '#s05' },
    { num: '06', label: 'Essays', href: '#s06' },
    { num: '07', label: 'Future Directions', href: '#s07' },
    { num: '08', label: 'Collaborators', href: '#s08' },
    { num: '09', label: 'Keywords', href: '#s09' },
    ...(t.links?.length ? [{ num: '10', label: 'Further reading', href: '#s10' }] : []),
  ];

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">{t.no} · {t.statusLabel} · {t.period}</p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">{t.title}</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">{t.one}</p>

      <Section ac="ac1" num="01" title="About this theme">
        <div className="read space-y-4">
          {t.summary.map((p, i) => <p key={i}>{p}</p>)}
          {t.summary.length === 0 && <p className="text-muted">No long description published yet.</p>}
        </div>
      </Section>

      <Section ac="ac5" num="02" title="Investigator Team">
        {investigators.length ? (
          <div className="grid sm:grid-cols-2 gap-3.5">
            {investigators.map((c) => (
              <button
                key={c!.slug}
                onClick={() => open(c!.slug)}
                className="text-left flex flex-col gap-1 bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] transition-all"
              >
                <span className="font-semibold">{c!.name}</span>
                <span className="text-xs text-muted">View collaborator card</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">No investigators assigned to this theme yet.</p>
        )}
      </Section>

      <Section ac="ac3" num="03" title="Key Concepts">
        {t.keyConcepts.length ? (
          <div className="space-y-3.5">
            {t.keyConcepts.map((kc, i) => (
              <div key={i} className="grid grid-cols-[54px_1fr] gap-1.5 bg-card border border-hair rounded-[10px] py-4.5 pr-5.5 pl-4.5 shadow-[var(--shs)]">
                <div className="font-num text-[1.35rem] text-acd pt-0.5">{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <h3 className="font-head font-bold text-[1.14rem] leading-[1.35] tracking-tight mb-2">{kc.header}</h3>
                  <p className="text-[.99rem] leading-[1.62]">{kc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">No key concepts published yet.</p>
        )}
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
          <p className="text-muted max-w-[62ch]">Episodes will appear here as they are published.</p>
        )}
      </Section>

      <Section ac="ac2" num="05" title="Sub-themes">
        {t.subThemes.length ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {t.subThemes.map((st) => (
              <ExpandableCard
                key={st.slug}
                title={st.title}
                shortDesc={st.shortDesc}
                longDesc={st.longDesc}
                keywords={(st.keywords ?? []).map((k) => k.word)}
                to={`/theme/${t.slug}/subtheme/${st.slug}`}
                darkHex={st.darkHex || t.darkHex}
                lightHex={st.lightHex || t.lightHex}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">No sub-themes yet.</p>
        )}
      </Section>

      <Section ac="ac9" num="06" title="Essays">
        {themeEssays.length ? (
          <div className="space-y-2">
            {themeEssays.map((es) => (
              <Link
                key={es.id}
                to={`/essay/${es.slug}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-card border border-hair rounded-[10px] px-5 py-3.5 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all"
              >
                <span className="flex-1 min-w-[200px]">
                  <span className="block font-semibold">{es.title}</span>
                  {es.author && <span className="block text-sm text-muted">by {es.author}</span>}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted max-w-[62ch]">Essays will appear here as they are published.</p>
        )}
      </Section>

      <Section ac="ac4" num="07" title="Future Directions">
        <p className="text-[.99rem] leading-[1.62] mb-4">{t.future.desc || 'No future directions published yet.'}</p>
        <Link to="/contact#contribute" className="inline-flex items-center gap-2 font-head font-bold text-[.82rem] border border-hair rounded-lg px-5 py-3 hover:border-muted transition-colors">
          How can I contribute?
        </Link>
      </Section>

      <Section ac="ac8" num="08" title="Collaborators">
        {collaborators.length ? (
          <p className="text-[.97rem] leading-[1.8]">
            {collaborators.map((c, i) => (
              <span key={c.slug}>
                <button onClick={() => open(c.slug)} className="font-semibold underline hover:text-red transition-colors">{c.name}</button>
                {i < collaborators.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
        ) : (
          <p className="text-muted max-w-[62ch]">No collaborators linked to this theme yet.</p>
        )}
      </Section>

      <Section ac="ac2" num="09" title="Keywords">
        {topKeywords.length ? (
          <div className="flex flex-wrap gap-2">
            {topKeywords.map((k) => (
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
          <p className="text-muted max-w-[62ch]">No keywords have been mapped to this theme yet.</p>
        )}
      </Section>

      {t.links?.length ? (
        <Section ac="ac8" num="10" title="Further reading">
          <ul className="space-y-3 pl-0 list-none">
            {t.links.map((l) => (
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
