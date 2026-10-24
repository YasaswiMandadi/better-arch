import { useMemo, useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { buildCollaboratorRoster } from '../../data/collaborators';
import { isEpisodePublished, isEssayPublished } from '../../data/types';
import { slugify } from '../../lib/slug';
import { Btn, Field, Grid2, Panel, PanelNote, PanelTitle, PlainArea, PlainInput, Select, StatusPill, VHead } from '../components/ui';
import { deleteCollaborator, ensureRecord, renameCollaborator } from '../lib/collab';

const plain = (h: string) => h.replace(/<[^>]*>/g, '');

/** One collaborator: their public card (name, role, bio) and where they're credited. */
export default function CollaboratorEditor() {
  const { editId, go, toast } = useConsole();
  const { data, update } = useSiteData();
  const roster = useMemo(() => buildCollaboratorRoster(data, { includeDrafts: true }), [data]);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [pickEp, setPickEp] = useState('');
  const [pickEs, setPickEs] = useState('');

  const c = roster.find((x) => x.slug === editId);
  if (!c) {
    return <Panel><p className="text-muted">This collaborator no longer exists. <button onClick={() => go('collaborators')} className="underline">Back to Collaborator Repository</button></p></Panel>;
  }
  const slug = c.slug;
  const rec = data.collaborators.find((x) => x.slug === slug);

  // ---- name (rename updates every guest/author/investigator link) ----
  const nameShown = nameDraft ?? c.name;
  const nameChanged = nameDraft !== null && nameDraft.trim() !== c.name;
  const newSlug = slugify(nameShown.trim());
  const nameErr = !nameChanged ? null
    : !nameShown.trim() ? "The name can't be empty."
    : !newSlug ? 'Use letters or numbers in the name.'
    : newSlug !== slug && roster.some((x) => x.slug === newSlug) ? `"${roster.find((x) => x.slug === newSlug)!.name}" already exists. Two collaborators can't share a name.`
    : null;
  function saveName() {
    if (!nameChanged || nameErr) return;
    const n = nameShown.trim().replace(/\s+/g, ' ');
    update((d) => { renameCollaborator(d, slug, c!.name, n); });
    setNameDraft(null);
    go('collaboratorEditor', slugify(n));
    toast(`Renamed to ${n}; every episode, essay and theme link was updated.`);
  }

  const setField = (key: 'designation' | 'bio', v: string) => update((d) => { ensureRecord(d, slug, c!.name)[key] = v; });

  // ---- attachments ----
  const myEpisodes = data.episodes.filter((e) => e.guest && slugify(e.guest) === slug);
  const myEssays = data.essays.filter((e) => e.author && slugify(e.author) === slug);
  const otherEpisodes = data.episodes.filter((e) => !(e.guest && slugify(e.guest) === slug));
  const otherEssays = data.essays.filter((e) => !(e.author && slugify(e.author) === slug));

  function attachEpisode() {
    const ep = data.episodes.find((e) => e.id === pickEp);
    if (!ep) return;
    if (ep.guest && !window.confirm(`"${plain(ep.title)}" already has ${ep.guest} as its guest. Replace them with ${c!.name}?`)) return;
    update((d) => { const e = d.episodes.find((x) => x.id === pickEp); if (e) e.guest = c!.name; ensureRecord(d, slug, c!.name); });
    setPickEp(''); toast('Attached to the episode.');
  }
  function attachEssay() {
    const es = data.essays.find((e) => e.id === pickEs);
    if (!es) return;
    if (es.author && !window.confirm(`"${es.title}" is already by ${es.author}. Replace them with ${c!.name}?`)) return;
    update((d) => { const e = d.essays.find((x) => x.id === pickEs); if (e) e.author = c!.name; ensureRecord(d, slug, c!.name); });
    setPickEs(''); toast('Attached to the essay.');
  }
  const detachEpisode = (id: string) => update((d) => { const e = d.episodes.find((x) => x.id === id); if (e) e.guest = ''; });
  const detachEssay = (id: string) => update((d) => { const e = d.essays.find((x) => x.id === id); if (e) e.author = ''; });
  const toggleTheme = (tslug: string, on: boolean) => update((d) => {
    const t = d.themes.find((x) => x.slug === tslug);
    if (!t) return;
    t.investigatorSlugs = on ? Array.from(new Set([...t.investigatorSlugs, slug])) : t.investigatorSlugs.filter((s) => s !== slug);
    if (on) ensureRecord(d, slug, c!.name);
  });

  function remove() {
    const links = myEpisodes.length + myEssays.length;
    if (!window.confirm(`Delete ${c!.name}?${links ? ` They will be removed as guest/author from ${links} item${links === 1 ? '' : 's'}.` : ''} This can't be undone.`)) return;
    update((d) => deleteCollaborator(d, slug));
    toast('Collaborator deleted.');
    go('collaborators');
  }

  const row = 'flex items-center gap-3 px-3.5 py-2.5 border-b border-hair2 last:border-none bg-card';
  return (
    <div>
      <VHead
        title={<>Collaborator: {c.name}</>}
        sub="This is the card visitors see when they open a collaborator, and the list of places they're credited. Changes save instantly."
      >
        <Btn onClick={() => go('collaborators')}>← Collaborator Repository</Btn>
      </VHead>

      <Panel>
        <PanelTitle num="01" title="Card details" />
        {!rec && <PanelNote>This person is only named on content so far. Editing anything below gives them their own card.</PanelNote>}
        <Field label="Full name" hint="Renaming updates every episode, essay and theme that credits them.">
          <div className="flex flex-wrap gap-2">
            <PlainInput
              value={nameShown}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } if (e.key === 'Escape') setNameDraft(null); }}
              className={`flex-1 min-w-[200px] ${nameErr ? 'border-danger' : ''}`}
              aria-invalid={!!nameErr}
            />
            {nameChanged && (
              <>
                <Btn size="sm" variant="primary" onClick={saveName} disabled={!!nameErr} className="disabled:opacity-50 disabled:cursor-not-allowed">Save name</Btn>
                <Btn size="sm" onClick={() => setNameDraft(null)}>Cancel</Btn>
              </>
            )}
          </div>
          {nameErr && <p role="alert" className="text-danger text-[13px] font-semibold mt-1.5">{nameErr}</p>}
        </Field>
        <Field label="Role / designation" hint="e.g. Architect, educator and filmmaker">
          <PlainInput value={c.designation ?? ''} onChange={(e) => setField('designation', e.target.value)} />
        </Field>
        <Field label="Bio" hint="Shown on their collaborator card.">
          <PlainArea value={c.bio} onChange={(e) => setField('bio', e.target.value)} />
        </Field>
      </Panel>

      <Panel>
        <PanelTitle num="02" title={`Guest on episodes (${myEpisodes.length})`} />
        {myEpisodes.length > 0 && (
          <ul className="border border-hair rounded-md overflow-hidden mb-3">
            {myEpisodes.map((e) => (
              <li key={e.id} className={row}>
                <span className="flex-1 min-w-0 truncate"><b className="font-sans text-[14px]">{plain(e.title)}</b> <span className="text-faint text-[12px] font-mono">{e.no && `Ep. ${e.no}`}</span></span>
                <StatusPill status={isEpisodePublished(e) ? 'published' : 'draft'}>{isEpisodePublished(e) ? 'Published' : 'Draft'}</StatusPill>
                <Btn size="sm" onClick={() => go('episodeAnalysisEditor', e.id)}>Open</Btn>
                <Btn size="sm" variant="danger" onClick={() => detachEpisode(e.id)}>Remove</Btn>
              </li>
            ))}
          </ul>
        )}
        <Grid2>
          <Select value={pickEp} onChange={(e) => setPickEp(e.target.value)} aria-label="Episode to attach">
            <option value="">Attach to an episode…</option>
            {otherEpisodes.map((e) => <option key={e.id} value={e.id}>{`${e.no ? `Ep. ${e.no} · ` : ''}${plain(e.title)}${e.guest ? ` (guest: ${e.guest})` : ''}`}</option>)}
          </Select>
          <div><Btn onClick={attachEpisode} disabled={!pickEp} className="disabled:opacity-50">Attach as guest</Btn></div>
        </Grid2>
      </Panel>

      <Panel>
        <PanelTitle num="03" title={`Author of essays (${myEssays.length})`} />
        {myEssays.length > 0 && (
          <ul className="border border-hair rounded-md overflow-hidden mb-3">
            {myEssays.map((e) => (
              <li key={e.id} className={row}>
                <b className="flex-1 min-w-0 truncate font-sans text-[14px]">{e.title}</b>
                <StatusPill status={isEssayPublished(e) ? 'published' : 'draft'}>{isEssayPublished(e) ? 'Published' : 'Draft'}</StatusPill>
                <Btn size="sm" onClick={() => go('essayEditor', e.id)}>Open</Btn>
                <Btn size="sm" variant="danger" onClick={() => detachEssay(e.id)}>Remove</Btn>
              </li>
            ))}
          </ul>
        )}
        <Grid2>
          <Select value={pickEs} onChange={(e) => setPickEs(e.target.value)} aria-label="Essay to attach">
            <option value="">Attach to an essay…</option>
            {otherEssays.map((e) => <option key={e.id} value={e.id}>{`${e.title}${e.author ? ` (by ${e.author})` : ''}`}</option>)}
          </Select>
          <div><Btn onClick={attachEssay} disabled={!pickEs} className="disabled:opacity-50">Attach as author</Btn></div>
        </Grid2>
      </Panel>

      <Panel>
        <PanelTitle num="04" title="Investigator on themes" />
        <PanelNote>Investigators are listed on the theme's page.</PanelNote>
        <div className="flex flex-wrap gap-2">
          {data.themes.map((t) => {
            const on = t.investigatorSlugs.includes(slug);
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => toggleTheme(t.slug, !on)}
                aria-pressed={on}
                className={`font-sans text-[13px] font-semibold px-3.5 py-2 rounded-full border transition-colors ${on ? 'bg-rust text-white border-rust' : 'bg-card text-muted border-hair hover:text-ink hover:border-rust'}`}
              >
                {on ? '✓ ' : '+ '}{`${t.no} · ${plain(t.title)}`}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <PanelTitle num="05" title="Delete" />
        <PanelNote>Removes their card and un-credits them everywhere (guest and author fields are emptied).</PanelNote>
        <Btn variant="danger" onClick={remove}>Delete {c.name}</Btn>
      </Panel>
    </div>
  );
}
