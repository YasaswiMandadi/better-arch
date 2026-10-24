import { useMemo, useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { resolveAnalysis } from '../../data/useEpisodeAnalysis';
import { Btn, Panel, PanelNote, PlainInput, VHead } from '../components/ui';

const plain = (h: string) => String(h ?? '').replace(/<[^>]*>/g, '').trim();

/**
 * Reference Repository: a first, read-only view of every reference cited in the episode
 * analyses. The client will specify what this page should become; for now references are
 * still edited in each episode's editor (section "References").
 */
export default function ReferenceRepository() {
  const { go } = useConsole();
  const { data } = useSiteData();
  const [q, setQ] = useState('');

  const all = useMemo(() => {
    const out: { key: string; title: string; desc: string; cat: string; url: string; epId: string; epTitle: string }[] = [];
    for (const e of data.episodes) {
      const a = resolveAnalysis(e);
      (a?.refs ?? []).forEach((r, i) => out.push({
        key: `${e.id}-${i}`, title: plain(r.n) || plain(r.d), desc: plain(r.n) ? plain(r.d) : '', cat: plain(r.c), url: plain(r.u), epId: e.id, epTitle: plain(e.title),
      }));
    }
    return out;
  }, [data]);
  const s = q.trim().toLowerCase();
  const list = s ? all.filter((r) => `${r.title} ${r.desc} ${r.cat} ${r.epTitle} ${r.url}`.toLowerCase().includes(s)) : all;
  const episodesWithRefs = new Set(all.map((r) => r.epId)).size;

  return (
    <div>
      <VHead title="Reference Repository" sub="Every reference cited across the episode analyses, in one place." />
      <Panel>
        <PanelNote>
          First version: a searchable list of {all.length} reference{all.length === 1 ? '' : 's'} from {episodesWithRefs} episode{episodesWithRefs === 1 ? '' : 's'}.
          To change a reference, open its episode (it's edited in the episode's References section). This page will grow once the client specifies what it should do.
        </PanelNote>
        <PlainInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search references, categories or episodes" className="max-w-[420px]" aria-label="Search references" />
      </Panel>

      {list.length === 0 ? (
        <Panel><p className="text-muted text-[14.5px]">{all.length ? 'No references match.' : 'No references yet. They appear here when episode analyses include them.'}</p></Panel>
      ) : (
        <div className="border border-hair rounded-md overflow-x-auto bg-card c-card">
          <table className="w-full text-[13.5px] font-sans">
            <thead>
              <tr className="text-left">
                {['Reference', 'Category', 'Episode', ''].map((h) => (
                  <th key={h} className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted px-3.5 py-2.5 border-b border-hair bg-ink/[0.03]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.key} className="align-top">
                  <td className="px-3.5 py-2.5 border-t border-hair2">
                    {r.url ? <a href={r.url} target="_blank" rel="noopener" className="font-semibold hover:underline">{r.title}</a> : <b className="font-semibold">{r.title}</b>}
                    {r.desc && <span className="block text-[12.5px] text-muted mt-0.5">{r.desc}</span>}
                  </td>
                  <td className="px-3.5 py-2.5 border-t border-hair2 text-muted whitespace-nowrap">{r.cat || '·'}</td>
                  <td className="px-3.5 py-2.5 border-t border-hair2 text-muted">{r.epTitle}</td>
                  <td className="px-3.5 py-2.5 border-t border-hair2 text-right"><Btn size="sm" onClick={() => go('episodeAnalysisEditor', r.epId)}>Open episode</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
