import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import type { Essay } from '../../data/types';
import { isEssayPublished } from '../../data/types';
import { useCollaboratorRoster } from '../../data/useCollaborators';
import { Btn, Field, Grid2, Panel, PanelNote, PanelTitle, PlainArea, PlainInput, Select, StatusPill, TextArea, VHead } from '../components/ui';
import SlugField from '../components/SlugField';
import KeywordListEditor from '../components/KeywordListEditor';
import { htmlToReading, readingToHtml } from '../lib/readingHtml';

/** Backend for one essay: everything the public essay page (/essay/<slug>) and its card show. */
export default function EssayEditor() {
  const { editId, go, toast } = useConsole();
  const { data, update } = useSiteData();
  const roster = useCollaboratorRoster();
  const essay = data.essays.find((e) => e.id === editId);

  if (!essay) {
    return (
      <Panel>
        <p className="text-muted">This essay no longer exists. <button onClick={() => go('essays')} className="underline">Back to Essay Repository</button></p>
      </Panel>
    );
  }
  const live = isEssayPublished(essay);

  function patch(fn: (e: Essay) => void) {
    update((d) => {
      const e = d.essays.find((x) => x.id === editId);
      if (e) fn(e);
    });
  }

  function publish() {
    if (!essay!.title.trim()) { toast('Give the essay a title before publishing.'); return; }
    if (!essay!.body.length) { toast('Add the essay text before publishing.'); return; }
    patch((e) => { e.status = 'published'; });
    toast('Published: the essay is now on the site.');
  }
  function toDraft() {
    patch((e) => { e.status = 'draft'; });
    toast('Moved to draft: hidden from the public site.');
  }
  function remove() {
    if (!window.confirm(`Delete "${essay!.title}" permanently? This can't be undone.`)) return;
    update((d) => { d.essays = d.essays.filter((x) => x.id !== editId); });
    toast('Essay deleted.');
    go('essays');
  }

  return (
    <div>
      <VHead
        title={<>Essay: {essay.title || 'Untitled'}</>}
        sub="Everything here appears on the public essay page and its card on /essays. Changes save instantly; drafts stay hidden from visitors."
      >
        <div className="flex flex-wrap gap-2.5 items-center">
          <StatusPill status={live ? 'published' : 'draft'}>{live ? 'Published' : 'Draft'}</StatusPill>
          {live ? <Btn onClick={toDraft}>Move to draft</Btn> : <Btn variant="primary" onClick={publish}>Publish</Btn>}
          {live && <a href={`/essay/${essay.slug}`} target="_blank" rel="noopener" className="font-sans font-semibold text-[13px] text-rust underline">View ↗</a>}
          <Btn onClick={() => go('essays')}>← Essay Repository</Btn>
        </div>
      </VHead>

      <Panel>
        <PanelTitle num="01" title="Title and details" />
        <Field label="Title"><PlainInput value={essay.title} onChange={(e) => patch((x) => { x.title = e.target.value; })} /></Field>
        <Field label="Slug (URL)">
          <SlugField
            value={essay.slug}
            prefix="/essay/"
            fromTitle={essay.title}
            takenBy={(s) => { const o = data.essays.find((x) => x.slug === s && x.id !== essay.id); return o ? o.title || o.slug : null; }}
            onSave={(next) => { patch((x) => { x.slug = next; }); toast(`Slug changed to "${next}"`); }}
            warning={live ? 'This essay is published: its address will change and links to the old address will stop working.' : undefined}
          />
        </Field>
        <Grid2>
          <Field label="Theme" hint="The essay is listed on this theme's page.">
            <Select value={essay.season} onChange={(e) => patch((x) => { x.season = e.target.value; })}>
              <option value="">No theme</option>
              {data.themes.map((t) => <option key={t.slug} value={t.slug}>{`${t.no} · ${t.title.replace(/<[^>]*>/g, '')}`}</option>)}
            </Select>
          </Field>
          <Field label="Author" hint="Pick a collaborator or type a new name; it links to their collaborator card.">
            <PlainInput list="essay-authors" value={essay.author} onChange={(e) => patch((x) => { x.author = e.target.value; })} placeholder="e.g. Rohan Shivkumar" />
            <datalist id="essay-authors">{roster.map((c) => <option key={c.slug} value={c.name} />)}</datalist>
          </Field>
        </Grid2>
        <Field label="Short description" hint="One or two lines: shown under the title and on the essay's card.">
          <PlainArea className="min-h-[70px]" value={essay.sub} onChange={(e) => patch((x) => { x.sub = e.target.value; })} />
        </Field>
      </Panel>

      <Panel>
        <PanelTitle num="02" title={`Essay text (${essay.body.length} paragraph${essay.body.length === 1 ? '' : 's'})`} />
        <PanelNote>Write or paste the whole essay here. Press Enter for a new paragraph; bold, italics and links are kept.</PanelNote>
        <TextArea
          style={{ minHeight: 360 }}
          value={readingToHtml(essay.body)}
          onChange={(e) => { const paras = htmlToReading((e.target as any).value); patch((x) => { x.body = paras; }); }}
        />
      </Panel>

      <Panel>
        <PanelTitle num="03" title={`Keywords (${essay.keywords?.length ?? 0})`} />
        <PanelNote>Each keyword links to its keyword page, which lists every episode, essay and sub-theme using it.</PanelNote>
        <KeywordListEditor listId="essay-kw" items={essay.keywords ?? []} onChange={(next) => patch((x) => { x.keywords = next; })} />
      </Panel>

      <Panel>
        <PanelTitle num="04" title="Delete" />
        <PanelNote>Removes the essay from the site and the console for good.</PanelNote>
        <Btn variant="danger" onClick={remove}>Delete this essay</Btn>
      </Panel>
    </div>
  );
}
