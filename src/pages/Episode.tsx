import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import BubbleChart from '../components/charts/BubbleChart';
import SentimentSpider from '../components/charts/SentimentSpider';
import CriticalityCompass from '../components/charts/CriticalityCompass';
import { useSiteData } from '../data/store';
import { useEpisodeAnalysis } from '../data/useEpisodeAnalysis';
import { bestKeywordMatchForTag, keywordHref } from '../data/keywords';
import { collaboratorSlugForName } from '../data/collaborators';
import { useCollaborator } from '../data/useCollaborators';
import { useCollaboratorPopup } from '../lib/collaboratorPopup';
import { ExternalLink, X } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { spotifyEmbedUrl } from '../lib/spotify';
import { SPECTACLE_DOMAIN_BY_CODE } from '../data/spectacle';

const STAT_COLORS = ['#C75B39', '#3B4C8A', '#6F7A33', '#7A3B6E'];

export default function Episode() {
  const { id } = useParams();
  const { open } = useCollaboratorPopup();
  const { data } = useSiteData();
  const episodes = data.episodes;
  const themes = data.themes;
  const e = episodes.find((x) => x.id === id);
  const collaborator = useCollaborator(e?.guest ? collaboratorSlugForName(e.guest) : undefined);
  const A: any = useEpisodeAnalysis(e);
  const [txOpen, setTxOpen] = useState(false);
  const [qFilter, setQFilter] = useState('all');
  const { theme: colorMode } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!e) return <Navigate to="/" replace />;
  const s = themes.find((x) => x.slug === e.season);
  const isDeep = Boolean(e.analysis && A);
  // A draft is reachable by direct link only; carry its id into keyword
  // links so the keyword page can include it.
  const pv = e.status === 'draft' ? e.id : undefined;
  const spDomains: { code: string; bridge: number; partial: boolean; hover: string }[] = (isDeep && A.spectacle?.domains) || [];
  const hasSpectacle = spDomains.length > 0;
  const hasCite = Boolean(isDeep && A.cite);
  const metaBits = isDeep && A.meta ? [A.meta.id, A.meta.date, A.meta.duration, A.meta.lang].filter(Boolean) : [];

  const sideItems = isDeep
    ? [
        { num: '01', label: 'A Reading of the Conversation', href: '#s01' },
        { num: '02', label: 'Lexical Terrain', href: '#s02' },
        { num: '03', label: 'Key Themes Explained', href: '#s03' },
        { num: '04', label: 'Key Phrases & Codes', href: '#s04' },
        { num: '05', label: 'Lived Experience', href: '#s05' },
        { num: '06', label: 'Sentiment Register', href: '#s06' },
        { num: '07', label: 'Criticality Register', href: '#s07' },
        { num: '08', label: 'References', href: '#s08' },
        { num: '09', label: 'Related & materials', href: '#s09' },
        { num: '10', label: 'Collaborators', href: '#s10' },
        ...(hasSpectacle ? [{ num: '11', label: 'SPECTACLE profile', href: '#s11' }] : []),
        ...(hasCite ? [{ num: hasSpectacle ? '12' : '11', label: 'Cite this episode', href: `#s${hasSpectacle ? '12' : '11'}` }] : []),
      ]
    : [
        { num: '01', label: 'This episode', href: '#s01' },
        { num: '02', label: 'Collaborators', href: '#s02' },
      ];

  const embedUrl = spotifyEmbedUrl(e.url);
  const resolveRelated = (r: any): string | null => {
    if (r.id && episodes.some((x) => x.id === r.id)) return r.id;
    const t = String(r.t || '').trim().toLowerCase();
    const hit = t ? episodes.find((x) => x.id !== e.id && x.title.trim().toLowerCase() === t) : undefined;
    return hit ? hit.id : null;
  };

  return (
    <InnerLayout sideItems={sideItems}>
      {isDeep ? (
        <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">{A.eyebrow}</p>
      ) : (
        <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">
          {s ? `${s.no} · Ep. ${e.no}` : `Ep. ${e.no}`}
        </p>
      )}
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">{e.title}</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">
        {e.guest ? `A conversation with ${e.guest}` : 'An episode'}{e.sub ? ` · ${e.sub}` : ''}
      </p>

      {metaBits.length > 0 && (
        <p className="font-head font-semibold text-[.74rem] tracking-[.12em] uppercase text-faint mt-3">{metaBits.join(' · ')}</p>
      )}

      {isDeep && (
        <>
          <div className="bg-card border border-hair border-t-[3px] border-t-red rounded-[10px] px-6.5 py-5.5 mt-7 text-[.99rem] leading-[1.62] shadow-[var(--sh)]">
            {A.bio}
          </div>
          <div className="flex flex-wrap gap-2 mt-4.5">
            {A.tags.map((t: string) => {
              const match = bestKeywordMatchForTag(t, A.keywords);
              const cls = "text-[.74rem] lowercase text-deep bg-[color-mix(in_srgb,var(--red)_9%,transparent)] px-3 py-1.5 rounded-full";
              return match ? (
                <Link key={t} to={keywordHref(match.word, pv)} className={`${cls} hover:bg-[color-mix(in_srgb,var(--red)_16%,transparent)] transition-colors`}>
                  {t}
                </Link>
              ) : (
                <span key={t} className={cls}>{t}</span>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-6">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            loading="lazy"
            title="Spotify player"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="w-full h-[152px] rounded-[10px] shadow-[var(--shs)] border-0"
          />
        ) : /^https?:\/\//i.test(e.url) ? (
          <a href={e.url} target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-head font-bold text-[.82rem] bg-ink text-paper rounded-lg px-5 py-3 hover:bg-deep hover:text-white transition-colors">
            Listen to this episode <ExternalLink size={13} />
          </a>
        ) : null}
      </div>

      {isDeep && (
        <>
          <button onClick={() => setTxOpen(true)} className="mt-3.5 font-head font-bold text-[.82rem] border border-hair rounded-lg px-5 py-3 hover:border-muted hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] transition-colors">
            Read the transcript excerpt
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-8">
            {A.stats.map((st: [string, string], i: number) => (
              <div key={st[1]} className="relative overflow-hidden bg-card border border-hair rounded-[10px] p-4.5 shadow-[var(--shs)]">
                <div className="absolute top-0 left-0 w-10.5 h-1" style={{ background: STAT_COLORS[i % 4] }} />
                <div className="font-num text-[2.4rem] leading-[.9]">{st[0]}</div>
                <div className="font-head font-semibold text-[.62rem] tracking-[.13em] uppercase text-muted mt-3">{st[1]}</div>
              </div>
            ))}
          </div>

          <Section ac="ac1" num="01" title="A Reading of the Conversation">
            <div className="read space-y-4">
              {A.reading.map((p: string, i: number) => <p key={i} dangerouslySetInnerHTML={{ __html: p }} />)}
            </div>
          </Section>

          <Section ac="ac2" num="02" title="Lexical Terrain">
            <p className="text-muted max-w-[62ch] mb-3.5" dangerouslySetInnerHTML={{ __html: A.lexnarr }} />
            <div className="bg-card border border-hair rounded-[10px] p-4 shadow-[var(--shs)]">
              {A.keywords?.length ? <BubbleChart kws={A.keywords} hue={A.hue ?? {}} preview={pv} /> : <p className="text-muted text-sm">No keywords recorded.</p>}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.keys(A.hue ?? {}).map((t) => (
                <span key={t} className="text-[.58rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ color: A.hue[t], background: `color-mix(in srgb, ${A.hue[t]} 14%, transparent)` }}>{t}</span>
              ))}
            </div>
          </Section>

          <Section ac="ac3" num="03" title="Key Themes Explained">
            <div className="space-y-3.5">
              {A.themes.map((t: { t: string; p: string[]; code?: string; band?: string; bridge?: number; excerpts?: { before: string; main: string; after: string }[] }, i: number) => (
                <div key={i} className="grid grid-cols-[54px_1fr] gap-1.5 bg-card border border-hair rounded-[10px] py-4.5 pr-5.5 pl-4.5 shadow-[var(--shs)]">
                  <div className="font-num text-[1.35rem] text-acd pt-0.5">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <h3 className="font-head font-bold text-[1.14rem] leading-[1.35] tracking-tight mb-2">{t.t}</h3>
                    {(t.code || t.band || typeof t.bridge === 'number') && (
                      <div className="flex flex-wrap gap-2 mb-2.5">
                        {t.code && <span className="text-[.6rem] font-semibold uppercase tracking-wide text-ac px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--ac) 12%, transparent)' }}>{t.code}{SPECTACLE_DOMAIN_BY_CODE[t.code.split('.')[0]] ? ` · ${SPECTACLE_DOMAIN_BY_CODE[t.code.split('.')[0]].name}` : ''}</span>}
                        {t.band && <span className="text-[.6rem] font-semibold uppercase tracking-wide text-muted px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]">{t.band}</span>}
                        {typeof t.bridge === 'number' && <span className="text-[.6rem] font-semibold uppercase tracking-wide text-muted px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]">Bridge {t.bridge}</span>}
                      </div>
                    )}
                    {t.p.map((p, j) => <p key={j} className="text-[.99rem] leading-[1.62]">{p}</p>)}
                    {(t.excerpts ?? []).map((x, j) => (
                      <p key={`x${j}`} className="text-[.95rem] leading-[1.6] mt-3 pl-3.5 border-l-2 border-hair">
                        <span className="text-faint">{x.before}</span>
                        <span className="font-medium" style={{ background: 'linear-gradient(transparent 60%, color-mix(in srgb, var(--ac) 26%, transparent) 60%)' }}>{x.main}</span>
                        <span className="text-faint">{x.after}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section ac="ac4" num="04" title="Key Phrases and Verbatim Codes">
            <p className="text-muted max-w-[62ch] mb-4">
              One canonical list of the conversation's verbatim codes; the pills filter it. Highlighted phrases are quoted exactly; the faint text around each is its spoken context. Cards flagged <b className="text-acd">Key phrase</b> carry a short reading.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              <button onClick={() => setQFilter('all')} className={`text-sm font-semibold px-3.5 py-2 rounded-full transition-colors ${qFilter === 'all' ? 'bg-[var(--ac)] text-white' : 'bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] text-muted hover:bg-[color-mix(in_srgb,var(--ac)_13%,transparent)] hover:text-acd'}`}>All</button>
              <button onClick={() => setQFilter('kp')} className={`text-sm font-semibold px-3.5 py-2 rounded-full transition-colors ${qFilter === 'kp' ? 'bg-[var(--ac)] text-white' : 'bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] text-muted hover:bg-[color-mix(in_srgb,var(--ac)_13%,transparent)] hover:text-acd'}`}>Key phrases</button>
              {A.qcats.map((c: string) => (
                <button key={c} onClick={() => setQFilter(c)} className={`text-sm font-semibold px-3.5 py-2 rounded-full transition-colors ${qFilter === c ? 'bg-[var(--ac)] text-white' : 'bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] text-muted hover:bg-[color-mix(in_srgb,var(--ac)_13%,transparent)] hover:text-acd'}`}>{c}</button>
              ))}
            </div>
            <div className="space-y-3">
              {A.quotes
                .filter((q: any) => qFilter === 'all' || (qFilter === 'kp' ? q.kp : q.cat === qFilter))
                .map((q: any, i: number) => (
                  <div key={i} className="bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)]">
                    <p className="text-[1.06rem] leading-[1.6]">
                      <span className="text-faint">{q.ctx1}</span>
                      <span className="font-medium" style={{ background: 'linear-gradient(transparent 60%, color-mix(in srgb, var(--ac) 26%, transparent) 60%)' }}>{q.main}</span>
                      <span className="text-faint">{q.ctx2}</span>
                    </p>
                    {q.kp && q.read && (
                      <div className="mt-3.5 rounded-lg px-4 py-3" style={{ background: 'color-mix(in srgb, var(--ac) 9%, transparent)' }}>
                        <span className="block text-[.6rem] font-semibold uppercase tracking-wide text-acd mb-1">Key phrase</span>
                        <p className="text-[.95rem] text-muted leading-[1.56] m-0">{q.read}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 items-center mt-3">
                      <span className="text-[.58rem] font-semibold uppercase tracking-wide text-ac px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--ac) 12%, transparent)' }}>{q.cat}</span>
                      {q.kp && <span className="text-[.58rem] font-bold uppercase tracking-wide text-white px-2.5 py-1 rounded-full bg-[var(--ac)]">Key phrase</span>}
                    </div>
                  </div>
                ))}
            </div>
          </Section>

          <Section ac="ac5" num="05" title="Lived Experience Analysis">
            <div className="bg-card border border-hair rounded-[10px] px-6.5 py-6 shadow-[var(--sh)]">
              <p className="text-[1.04rem] leading-[1.76] m-0">{A.lived}</p>
            </div>
          </Section>

          <Section ac="ac6" num="06" title="Sentiment Register">
            <p className="text-muted max-w-[62ch] mb-3.5">{A.sentprose}</p>
            <div className="bg-card border border-hair rounded-[10px] p-4 shadow-[var(--shs)]">
              <SentimentSpider sents={A.sentiments} />
            </div>
          </Section>

          <Section ac="ac7" num="07" title="Criticality Register">
            <p className="text-muted max-w-[62ch] mb-3.5">{A.compass.prose}</p>
            <div className="bg-card border border-hair rounded-[10px] p-4 shadow-[var(--shs)] mb-4">
              <CriticalityCompass c={A.compass} />
            </div>
            <div className="overflow-x-auto rounded-[10px] border border-hair shadow-[var(--shs)]">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]">
                    <th className="text-left font-semibold uppercase tracking-wide text-[.6rem] text-muted px-4.5 py-3 border-b border-hair">Indicator</th>
                    <th className="text-left font-semibold uppercase tracking-wide text-[.6rem] text-muted px-4.5 py-3 border-b border-hair w-16">Score</th>
                    <th className="text-left font-semibold uppercase tracking-wide text-[.6rem] text-muted px-4.5 py-3 border-b border-hair">Reading</th>
                  </tr>
                </thead>
                <tbody>
                  {A.compass.indicators.map((row: [string, string, number, string]) => (
                    <tr key={row[0]} className="hover:bg-[color-mix(in_srgb,var(--red)_5%,transparent)]">
                      <td className="px-4.5 py-3 border-t border-hair font-semibold text-deep">{row[1]}</td>
                      <td className="px-4.5 py-3 border-t border-hair">{row[2]}</td>
                      <td className="px-4.5 py-3 border-t border-hair text-muted">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section ac="ac8" num="08" title="References">
            <div className="space-y-6">
              {A.refcats.map((cat: string) => {
                const refs = A.refs.filter((r: any) => r.c === cat);
                if (!refs.length) return null;
                return (
                  <div key={cat}>
                    <h4 className="font-head font-bold text-sm uppercase tracking-wide text-acd mb-2.5">{cat}</h4>
                    <ul className="space-y-2.5 list-none pl-0">
                      {refs.map((r: any) => (
                        <li key={r.n} className="border-b border-hair pb-2.5">
                          <a href={r.u} target="_blank" rel="noopener" className="font-semibold flex items-center gap-1.5 hover:underline">{r.n} <ExternalLink size={11} /></a>
                          <p className="text-sm text-muted m-0 mt-0.5">{r.d}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section ac="ac9" num="09" title="Related & materials">
            <h4 className="font-head font-bold text-sm uppercase tracking-wide text-acd mb-3">More conversations</h4>
            <div className="grid sm:grid-cols-2 gap-3.5 mb-7">
              {A.related.map((r: any, ri: number) => {
                const rid = resolveRelated(r);
                const cls = "flex flex-col gap-1.5 bg-card border border-hair rounded-[10px] px-5 py-4.5 shadow-[var(--shs)]";
                const inner = (
                  <>
                    <span className="text-[.6rem] font-semibold uppercase tracking-wide text-red">{r.g}</span>
                    <span className="font-semibold">{r.t}</span>
                    <span className="text-xs text-muted">{r.d}</span>
                  </>
                );
                return rid ? (
                  <Link key={ri} to={`/episode/${rid}`} className={`${cls} hover:shadow-[var(--sh)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] transition-all`}>{inner}</Link>
                ) : (
                  <div key={ri} className={cls}>{inner}</div>
                );
              })}
            </div>
            <h4 className="font-head font-bold text-sm uppercase tracking-wide text-acd mb-3">Materials</h4>
            <ul className="space-y-2.5 list-none pl-0">
              {A.materials.map((m: any) => {
                const external = m.u.startsWith('http');
                return (
                  <li key={m.t} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hair pb-2.5">
                    {external ? (
                      <a href={m.u} target="_blank" rel="noopener" className="font-medium hover:underline">{m.t}</a>
                    ) : (
                      <Link to={m.u} className="font-medium hover:underline">{m.t}</Link>
                    )}
                    <span className="text-xs text-faint">{m.c}</span>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section ac="ac8" num="10" title="Collaborators">
            {collaborator ? (
              <button
                onClick={() => open(collaborator.slug)}
                className="text-left flex flex-col gap-1 bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] transition-all"
              >
                <span className="font-semibold">{collaborator.name}</span>
                <span className="text-xs text-muted">View collaborator card</span>
              </button>
            ) : (
              <p className="text-muted max-w-[62ch]">No collaborator is linked to this episode.</p>
            )}
          </Section>

          {hasSpectacle && (
            <Section ac="ac1" num="11" title="SPECTACLE profile">
              <p className="text-muted max-w-[62ch] mb-4">How strongly the conversation bridges into each of the nine SPECTACLE domains. Hollow bars mark partial coverage.</p>
              <div className="bg-card border border-hair rounded-[10px] p-5 shadow-[var(--shs)] space-y-3">
                {spDomains.map((d, i) => {
                  const dom = SPECTACLE_DOMAIN_BY_CODE[d.code];
                  const col = dom ? (colorMode === 'dark' ? dom.dark : dom.light) : 'var(--ac)';
                  const pct = Math.max(0, Math.min(100, Number(d.bridge) || 0));
                  return (
                    <div key={`${d.code}-${i}`} title={d.hover}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold">{d.code}{dom ? ` · ${dom.name}` : ''}{d.partial ? ' (partial)' : ''}</span>
                        <span className="font-num text-muted">{pct}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.partial ? `repeating-linear-gradient(45deg, ${col}, ${col} 4px, transparent 4px, transparent 7px)` : col }} />
                      </div>
                      {d.hover && <p className="text-xs text-muted mt-1 mb-0">{d.hover}</p>}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {hasCite && (
            <Section ac="ac2" num={hasSpectacle ? '12' : '11'} title="Cite this episode">
              <div className="bg-card border border-hair rounded-[10px] px-6 py-5 shadow-[var(--shs)]">
                <p className="text-[.98rem] leading-[1.65] m-0">{A.cite}</p>
                <button
                  onClick={() => { try { navigator.clipboard?.writeText(String(A.cite)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ } }}
                  className="mt-3.5 font-head font-bold text-[.78rem] border border-hair rounded-lg px-4 py-2 hover:border-muted transition-colors"
                >
                  {copied ? 'Copied' : 'Copy citation'}
                </button>
              </div>
            </Section>
          )}
        </>
      )}

      {!isDeep && (
        <>
          <Section ac="ac1" num="01" title="This episode">
            <p className="text-muted max-w-[62ch]">
              The full episode is available on Spotify above. A deep analysis record for this conversation hasn't been published yet — the exemplar full record lives on{' '}
              <Link to="/episode/axm-01" className="underline">Ep. 01 · Media as a Mirror</Link>.
            </p>
            <a href={e.url} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-2 font-head font-bold text-[.82rem] bg-ink text-paper rounded-lg px-5 py-3 hover:bg-deep hover:text-white transition-colors">
              Listen on Spotify <ExternalLink size={13} />
            </a>
          </Section>

          <Section ac="ac8" num="02" title="Collaborators">
            {collaborator ? (
              <button
                onClick={() => open(collaborator.slug)}
                className="text-left flex flex-col gap-1 bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] transition-all"
              >
                <span className="font-semibold">{collaborator.name}</span>
                <span className="text-xs text-muted">View collaborator card</span>
              </button>
            ) : (
              <p className="text-muted max-w-[62ch]">No collaborator is linked to this episode.</p>
            )}
          </Section>
        </>
      )}

      <SiteFooter />

      {txOpen && (
        <div className="fixed inset-0 bg-black/60 z-85 p-4 sm:p-8 overflow-auto flex items-start justify-center" onClick={(ev) => { if (ev.target === ev.currentTarget) setTxOpen(false); }}>
          <div className="max-w-[840px] w-full bg-paper border border-hair rounded-[10px] shadow-2xl overflow-hidden mt-6">
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-hair">
              <h2 className="font-head font-bold text-[1.1rem]">Transcript excerpt</h2>
              <button onClick={() => setTxOpen(false)} className="border border-hair rounded-full p-1.5 text-muted hover:text-deep hover:border-deep transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-auto">
              <p className="text-sm text-muted">{A.txnote}</p>
              {A.tx.map((line: [string, string], i: number) => (
                <p key={i} className="text-[.98rem] leading-[1.65]">
                  <b className={line[0] === 'H' ? 'text-red' : 'text-deep'}>{line[0] === 'H' ? 'Host' : 'Guest'}:</b> {line[1]}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </InnerLayout>
  );
}
