import { useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { Btn, Panel, Pill, StatusPill, VHead } from '../components/ui';
import { randId } from '../lib/storage';
import { isEpisodePublished } from '../../data/types';
import { resolveAnalysis } from '../../data/useEpisodeAnalysis';

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

  const list = data.episodes.filter((e) => filter === 'all' || (filter === 'draft' ? !isEpisodePublished(e) : e.season === filter));

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

  const drafts = data.episodes.filter((e) => !isEpisodePublished(e)).length;
  const themeTitle = (slug: string) => (data.themes.find((x) => x.slug === slug)?.title ?? slug).replace(/<[^>]*>/g, '');

  return (
    <div>
      <VHead
        title="Episode Repository"
        sub="Every episode on the site, published and draft. Click a card to edit its details and upload its analysis template; changes go straight to the public episode page."
      >
        <Btn variant="primary" onClick={addEpisode}>+ New episode</Btn>
      </VHead>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>{`All (${data.episodes.length})`}</Pill>
        {drafts > 0 && <Pill active={filter === 'draft'} onClick={() => setFilter('draft')}>{`Drafts (${drafts})`}</Pill>}
        {data.themes.map((t) => {
          const n = data.episodes.filter((e) => e.season === t.slug).length;
          return n ? <Pill key={t.slug} active={filter === t.slug} onClick={() => setFilter(t.slug)}>{`${themeTitle(t.slug)} (${n})`}</Pill> : null;
        })}
      </div>

      {list.length === 0 && (
        <Panel><p className="text-muted text-[14.5px]">No episodes match this filter.</p></Panel>
      )}

      {list.map((e) => {
        const live = isEpisodePublished(e);
        const analysis = e.analysisData ? 'live' : resolveAnalysis(e) ? 'builtin' : e.analysis ? 'missing' : 'none';
        return (
          <Panel key={e.id} className="c-card-hover cursor-pointer">
            <button onClick={() => go('episodeAnalysisEditor', e.id)} className="text-left w-full">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                {e.no && <span className="font-mono text-[13px] font-semibold text-rust bg-rust/[0.08] rounded-full px-2.5 py-1">Ep. {e.no}</span>}
                <b className="font-display italic font-medium text-[17px]">{e.title || '(untitled)'}</b>
                <StatusPill status={live ? 'published' : 'draft'}>{live ? 'Published' : 'Draft'}</StatusPill>
                <StatusPill status={analysis === 'live' || analysis === 'builtin' ? 'published' : analysis === 'missing' ? 'draft' : 'archived'}>
                  {analysis === 'live' ? 'Analysis: live record' : analysis === 'builtin' ? 'Analysis: built-in record' : analysis === 'missing' ? 'Analysis: flagged, no record' : 'No analysis'}
                </StatusPill>
                <span className="flex-1" />
                <span className="text-[12px] text-faint font-mono">{themeTitle(e.season)}</span>
              </div>
              <p className="text-[13.5px] text-muted font-sans">{e.guest ? `with ${e.guest}` : 'No guest named'}{e.sub ? ` · ${e.sub}` : ''}</p>
            </button>
          </Panel>
        );
      })}
    </div>
  );
}
