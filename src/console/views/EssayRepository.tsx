import { useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { isEssayPublished } from '../../data/types';
import { Btn, Panel, Pill, StatusPill, VHead } from '../components/ui';
import { createEssay } from '../lib/create';

/** Every essay, published and draft. Click one to edit it; "+ Add Essay" starts a new draft. */
export default function EssayRepository() {
  const { go } = useConsole();
  const { data, update } = useSiteData();
  const [filter, setFilter] = useState('all');
  const themeTitle = (slug: string) => (data.themes.find((t) => t.slug === slug)?.title ?? '').replace(/<[^>]*>/g, '');
  const list = data.essays.filter((e) =>
    filter === 'all' ? true : filter === 'draft' ? !isEssayPublished(e) : filter === 'none' ? !data.themes.some((t) => t.slug === e.season) : e.season === filter,
  );
  const drafts = data.essays.filter((e) => !isEssayPublished(e)).length;

  function addEssay() {
    const id = createEssay(data, update, filter !== 'all' && filter !== 'draft' && filter !== 'none' ? filter : undefined);
    go('essayEditor', id);
  }

  return (
    <div>
      <VHead
        title="Essay Repository"
        sub="Every essay on the site, published and draft. Click a card to edit it. Published essays appear on /essays, on their theme's page and on their keyword pages."
      >
        <div className="flex flex-wrap gap-2.5">
          <Btn onClick={() => go('essaysPage')} title="Edit the text visitors see on the /essays page">Edit Essays page</Btn>
          <Btn variant="primary" onClick={addEssay}>+ Add Essay</Btn>
        </div>
      </VHead>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All ({data.essays.length})</Pill>
        {drafts > 0 && <Pill active={filter === 'draft'} onClick={() => setFilter('draft')}>Drafts ({drafts})</Pill>}
        {data.themes.map((t) => {
          const n = data.essays.filter((e) => e.season === t.slug).length;
          return n ? <Pill key={t.slug} active={filter === t.slug} onClick={() => setFilter(t.slug)}>{`${themeTitle(t.slug)} (${n})`}</Pill> : null;
        })}
      </div>

      {list.length === 0 && (
        <Panel><p className="text-muted text-[14.5px]">{data.essays.length ? 'No essays match this filter.' : 'No essays yet. Add one to get started.'}</p></Panel>
      )}

      {list.map((e) => {
        const live = isEssayPublished(e);
        const words = e.body.join(' ').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
        return (
          <Panel key={e.id} className="c-card-hover cursor-pointer">
            <button onClick={() => go('essayEditor', e.id)} className="text-left w-full">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <b className="font-display italic font-medium text-[17px]">{e.title || 'Untitled essay'}</b>
                <StatusPill status={live ? 'published' : 'draft'}>{live ? 'Published' : 'Draft'}</StatusPill>
                <span className="flex-1" />
                <span className="text-[12px] text-faint font-mono">{words.toLocaleString('en-US')} words · {e.keywords?.length ?? 0} keywords</span>
              </div>
              <p className="text-[13.5px] text-muted font-sans">
                {e.author ? `By ${e.author}` : 'No author yet'}
                {' · '}
                {themeTitle(e.season) || 'No theme'}
                {e.sub ? ` · ${e.sub}` : ''}
              </p>
            </button>
          </Panel>
        );
      })}
    </div>
  );
}
