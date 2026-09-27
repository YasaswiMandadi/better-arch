import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import BubbleChart from '../components/charts/BubbleChart';
import SentimentSpider from '../components/charts/SentimentSpider';
import CriticalityCompass from '../components/charts/CriticalityCompass';
import { DB } from '../data/db';
import { getAnalysis } from '../data/analysis';
import { getCollaborator, collaboratorSlugForGuest } from '../data/collaborators';
import { ExternalLink, X } from 'lucide-react';

const STAT_COLORS = ['#C75B39', '#3B4C8A', '#6F7A33', '#7A3B6E'];

export default function Episode() {
  const { id } = useParams();
  const episodes: any[] = DB.episodes as any;
  const seasons: any[] = DB.seasons as any;
  const e = episodes.find((x) => x.id === id);
  const [txOpen, setTxOpen] = useState(false);
  const [qFilter, setQFilter] = useState('all');

  if (!e) return <Navigate to="/" replace />;
  const s = seasons.find((x) => x.slug === e.season);
  const A: any = id ? getAnalysis(id) : undefined;
  const isDeep = Boolean(e.analysis && A);
  const collaborator = e.guest ? getCollaborator(collaboratorSlugForGuest(e.guest)) : undefined;

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
      ]
    : [
        { num: '01', label: 'This episode', href: '#s01' },
        { num: '02', label: 'Collaborators', href: '#s02' },
      ];

  const embedUrl = e.url.replace('/episodes/', '/embed/episodes/');

  return (
    <InnerLayout
      sideItems={sideItems}
      sideKicker={s ? `${s.no} · ${s.title}` : 'Episode'}
      sideFoot={[
        { label: '← Home', to: '/' },
        ...(s ? [{ label: 'Season', to: `/project/${s.slug}` }] : []),
        { label: 'Contact', to: '/contact' },
      ]}
    >
      {isDeep ? (
        <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">{A.eyebrow}</p>
      ) : (
        <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">
          {s ? `${s.no} · Ep. ${e.no}` : `Ep. ${e.no}`}
        </p>
      )}
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">{e.title}</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">
        {e.guest ? (
          <>A conversation with{' '}
            {collaborator ? (
              <Link to={`/collaborator/${collaborator.slug}`} className="text-deep underline decoration-dotted underline-offset-4">{e.guest}</Link>
            ) : e.guest}
          </>
        ) : 'An episode'}{e.sub ? ` · ${e.sub}` : ''}
      </p>

      {isDeep && (
        <>
          <div className="bg-card border border-hair border-t-[3px] border-t-red rounded-[10px] px-6.5 py-5.5 mt-7 text-[.99rem] leading-[1.62] shadow-[var(--sh)]">
            {A.bio}
          </div>
          <div className="flex flex-wrap gap-2 mt-4.5">
            {A.tags.map((t: string) => (
              <span key={t} className="text-[.74rem] lowercase text-deep bg-[color-mix(in_srgb,var(--red)_9%,transparent)] px-3 py-1.5 rounded-full">{t}</span>
            ))}
          </div>
        </>
      )}

      <div className="mt-6">
        <iframe src={embedUrl} loading="lazy" title="Spotify player" className="w-full h-[152px] rounded-[10px] shadow-[var(--shs)] border-0" />
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
              <BubbleChart kws={A.keywords} hue={A.hue} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.keys(A.hue).map((t) => (
                <span key={t} className="text-[.58rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ color: A.hue[t], background: `color-mix(in srgb, ${A.hue[t]} 14%, transparent)` }}>{t}</span>
              ))}
            </div>
          </Section>

          <Section ac="ac3" num="03" title="Key Themes Explained">
            <div className="space-y-3.5">
              {A.themes.map((t: { t: string; p: string[] }, i: number) => (
                <div key={i} className="grid grid-cols-[54px_1fr] gap-1.5 bg-card border border-hair rounded-[10px] py-4.5 pr-5.5 pl-4.5 shadow-[var(--shs)]">
                  <div className="font-num text-[1.35rem] text-acd pt-0.5">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <h3 className="font-head font-bold text-[1.14rem] leading-[1.35] tracking-tight mb-2">{t.t}</h3>
                    {t.p.map((p, j) => <p key={j} className="text-[.99rem] leading-[1.62]">{p}</p>)}
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
              {A.related.map((r: any) => (
                <Link key={r.id} to={`/episode/${r.id}`} className="flex flex-col gap-1.5 bg-card border border-hair rounded-[10px] px-5 py-4.5 shadow-[var(--shs)] hover:shadow-[var(--sh)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] transition-all">
                  <span className="text-[.6rem] font-semibold uppercase tracking-wide text-red">{r.g}</span>
                  <span className="font-semibold">{r.t}</span>
                  <span className="text-xs text-muted">{r.d}</span>
                </Link>
              ))}
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

          <Section ac="ac10" num="10" title="Collaborators">
            {collaborator ? (
              <Link to={`/collaborator/${collaborator.slug}`} className="flex flex-col gap-1 bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all max-w-sm">
                <span className="font-semibold">{collaborator.name}</span>
                <span className="text-xs text-muted">{collaborator.episodeIds.length} episode{collaborator.episodeIds.length === 1 ? '' : 's'} on the site</span>
              </Link>
            ) : (
              <p className="text-muted max-w-[62ch]">No collaborator is linked to this episode.</p>
            )}
          </Section>
        </>
      )}

      {!isDeep && (
        <Section ac="ac1" num="01" title="This episode">
          <p className="text-muted max-w-[62ch]">
            The full episode is available on Spotify above. A deep analysis record for this conversation hasn't been published yet — the exemplar full record lives on{' '}
            <Link to="/episode/axm-01" className="underline">Ep. 01 · Media as a Mirror</Link>.
          </p>
          <a href={e.url} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-2 font-head font-bold text-[.82rem] bg-ink text-paper rounded-lg px-5 py-3 hover:bg-deep hover:text-white transition-colors">
            Listen on Spotify <ExternalLink size={13} />
          </a>
        </Section>
      )}

      {!isDeep && (
        <Section ac="ac10" num="02" title="Collaborators">
          {collaborator ? (
            <Link to={`/collaborator/${collaborator.slug}`} className="flex flex-col gap-1 bg-card border border-hair rounded-[10px] px-5 py-4 shadow-[var(--shs)] hover:border-[color-mix(in_srgb,var(--red)_40%,var(--hair))] hover:-translate-y-0.5 transition-all max-w-sm">
              <span className="font-semibold">{collaborator.name}</span>
              <span className="text-xs text-muted">{collaborator.episodeIds.length} episode{collaborator.episodeIds.length === 1 ? '' : 's'} on the site</span>
            </Link>
          ) : (
            <p className="text-muted max-w-[62ch]">No collaborator is linked to this episode.</p>
          )}
        </Section>
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
