import { useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { Btn, Pill, StatusPill, VHead } from '../components/ui';
import { randId } from '../lib/storage';
import { isEpisodePublished } from '../../data/types';

/**
 * Lists every live episode (from the shared SiteDataProvider store — the
 * same one the Theme Repository reads/writes) with its analysis status,
 * and lets you add a brand-new episode record to attach analysis to.
 * This is the live-wired counterpart to the old console's own Episodes
 * view: edits here reflect immediately on the public Episode page.
 */
export default function EpisodeAnalysisRepository() {
  const { go, toast } = useConsole();
  const { data, update } = useSiteData();
  const [filter, setFilter] = useState('all');

  const list = data.episodes.filter((e) => filter === 'all' || e.season === filter);

  function addEpisode() {
    const id = randId('axm');
    update((d) => {
      d.episodes.unshift({
        id,
        season: d.themes[0]?.slug ?? '',
        no: '',
        title: 'New episode',
        guest: '',
        sub: '',
        url: '',
        analysis: false,
        status: 'draft',
      });
    });
    toast('New episode created as a draft — fill in its details, add analysis, then publish when ready.');
    go('episodeAnalysisEditor', id);
  }

  return (
    <div>
      <VHead
        title="Episode Analysis"
        sub="Every episode in the live store. Open a row to edit its metadata and upload its deep-analysis JSON — this writes straight to the public Episode page, the same way Theme edits do."
      >
        <Btn variant="primary" onClick={addEpisode}>+ New episode</Btn>
      </VHead>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
        {data.themes.map((t) => (
          <Pill key={t.slug} active={filter === t.slug} onClick={() => setFilter(t.slug)}>{t.title}</Pill>
        ))}
      </div>

      <div className="bg-card border border-hair rounded overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-left">
              {['Ep', 'Title', 'Guest', 'Theme', 'Analysis', 'Status', ''].map((h) => (
                <th key={h} className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted px-3.5 py-2.5 border-b border-hair bg-ink/[0.02]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length ? list.map((e) => {
              const t = data.themes.find((x) => x.slug === e.season);
              return (
                <tr key={e.id} className="hover:bg-rust/[0.04] cursor-pointer" onClick={() => go('episodeAnalysisEditor', e.id)}>
                  <td className="px-3.5 py-2.5 border-t border-hair2">{e.no}</td>
                  <td className="px-3.5 py-2.5 border-t border-hair2"><b>{e.title || '(untitled)'}</b></td>
                  <td className="px-3.5 py-2.5 border-t border-hair2">{e.guest}</td>
                  <td className="px-3.5 py-2.5 border-t border-hair2">{t?.title ?? e.season}</td>
                  <td className="px-3.5 py-2.5 border-t border-hair2">
                    <StatusPill status={e.analysisData ? 'published' : e.analysis ? 'draft' : 'archived'}>
                      {e.analysisData ? 'Live record' : e.analysis ? 'Flagged, no record' : 'None'}
                    </StatusPill>
                  </td>
                  <td className="px-3.5 py-2.5 border-t border-hair2">
                    <StatusPill status={isEpisodePublished(e) ? 'published' : 'draft'}>
                      {isEpisodePublished(e) ? 'Published' : 'Draft'}
                    </StatusPill>
                  </td>
                  <td className="px-3.5 py-2.5 border-t border-hair2" />
                </tr>
              );
            }) : (
              <tr><td colSpan={7} className="text-center py-10 text-faint">
                <b className="block font-display text-[16px] text-muted mb-1">No episodes in this theme yet.</b>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
