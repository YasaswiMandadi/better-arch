import { useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { useCollaboratorRoster } from '../../data/useCollaborators';
import { Btn, Chip, Field, Grid2, Grid3, Panel, Select, TextArea, TextInput, Toggle, VHead } from '../components/ui';
import { slugify } from '../../lib/slug';
import type { SubTheme, Theme } from '../../data/types';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ThemeEditor() {
  const { editId, go, toast } = useConsole();
  const { data, update } = useSiteData();
  const roster = useCollaboratorRoster();
  const [investigatorInput, setInvestigatorInput] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const theme = data.themes.find((t) => t.slug === editId);
  if (!theme) {
    return (
      <Panel>
        <p className="text-muted">This theme no longer exists. <button onClick={() => go('themes')} className="underline">Back to Theme Repository</button></p>
      </Panel>
    );
  }

  function patch(fn: (t: Theme) => void) {
    update((d) => {
      const t = d.themes.find((x) => x.slug === editId);
      if (t) fn(t);
    });
  }

  function addInvestigator() {
    const name = investigatorInput.trim();
    if (!name) return;
    const slug = slugify(name);
    const exists = roster.some((c) => c.slug === slug);
    update((d) => {
      if (!exists) d.collaborators.push({ slug, name, bio: '' });
      const t = d.themes.find((x) => x.slug === editId);
      if (t && !t.investigatorSlugs.includes(slug)) t.investigatorSlugs.push(slug);
    });
    setInvestigatorInput('');
  }

  function removeInvestigator(slug: string) {
    patch((t) => { t.investigatorSlugs = t.investigatorSlugs.filter((s) => s !== slug); });
  }

  function addKeyConcept() {
    patch((t) => t.keyConcepts.push({ header: 'New concept', desc: '' }));
  }
  function removeKeyConcept(i: number) {
    patch((t) => t.keyConcepts.splice(i, 1));
  }

  function assignEpisode(id: string) {
    if (!id) return;
    update((d) => {
      const ep = d.episodes.find((e) => e.id === id);
      if (ep) ep.season = editId!;
    });
  }
  function unassignEpisode(id: string) {
    update((d) => {
      const ep = d.episodes.find((e) => e.id === id);
      if (ep) ep.season = '';
    });
  }

  function assignEssay(id: string) {
    if (!id) return;
    update((d) => {
      const es = d.essays.find((e) => e.id === id);
      if (es) es.season = editId!;
    });
  }
  function unassignEssay(id: string) {
    update((d) => {
      const es = d.essays.find((e) => e.id === id);
      if (es) es.season = '';
    });
  }

  function addSubTheme() {
    patch((t) => {
      const n = t.subThemes.length + 1;
      const title = `New Sub-theme ${n}`;
      const sub: SubTheme = { slug: slugify(`${title}-${Date.now().toString(36)}`), title, shortDesc: '', longDesc: '' };
      t.subThemes.push(sub);
    });
  }
  function updateSubTheme(i: number, fn: (s: SubTheme) => void) {
    patch((t) => fn(t.subThemes[i]));
  }
  function removeSubTheme(i: number) {
    if (!confirm('Delete this sub-theme?')) return;
    patch((t) => t.subThemes.splice(i, 1));
  }

  function addTertiary(subIdx: number) {
    patch((t) => {
      const s = t.subThemes[subIdx];
      s.tertiaryThemes = s.tertiaryThemes || [];
      s.tertiaryThemes.push({ slug: slugify(`tier-${Date.now().toString(36)}`), title: 'New Tertiary Theme', desc: '' });
    });
  }
  function removeTertiary(subIdx: number, tierIdx: number) {
    patch((t) => t.subThemes[subIdx].tertiaryThemes?.splice(tierIdx, 1));
  }

  function addKeyword() {
    const w = newKeyword.trim();
    if (!w) return;
    patch((t) => t.keywords.push({ word: w, freq: 1 }));
    setNewKeyword('');
  }
  function removeKeyword(i: number) {
    patch((t) => t.keywords.splice(i, 1));
  }

  async function onPoster(kind: 'posterSquareUrl' | 'posterRectUrl', file: File | undefined) {
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast('Keep poster images under 1.5MB — this console stores them directly in the browser.');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    patch((t) => { (t as any)[kind] = dataUrl; });
  }

  const themeEpisodes = data.episodes.filter((e) => e.season === theme.slug);
  const unassignedEpisodes = data.episodes.filter((e) => e.season !== theme.slug);
  const themeEssays = data.essays.filter((e) => e.season === theme.slug);
  const unassignedEssays = data.essays.filter((e) => e.season !== theme.slug);

  return (
    <div>
      <VHead
        title={<>Theme: <Rich>{theme.title || 'Untitled'}</Rich></>}
        sub="Everything here renders live on the public Themes Masterpage and this theme's individual page — saves are instant."
      >
        <Btn onClick={() => go('themes')}>← Theme Repository</Btn>
      </VHead>

      <Panel>
        <Grid2>
          <Field label="Theme name"><TextInput value={theme.title} onChange={(e) => patch((t) => { t.title = (e.target as any).value; })} /></Field>
          <Field label="Slug (URL)"><TextInput value={theme.slug} disabled /></Field>
        </Grid2>
        <Grid3>
          <Field label="Label (e.g. S1)"><TextInput value={theme.no} onChange={(e) => patch((t) => { t.no = (e.target as any).value; })} /></Field>
          <Field label="Run status"><TextInput value={theme.period} onChange={(e) => patch((t) => { t.period = (e.target as any).value; })} /></Field>
          <Field label="Status line"><TextInput value={theme.statusLabel} onChange={(e) => patch((t) => { t.statusLabel = (e.target as any).value; })} /></Field>
        </Grid3>
        <Field label="Short description (compact card text, ~3 lines)">
          <TextArea value={theme.one} onChange={(e) => patch((t) => { t.one = (e.target as any).value; })} style={{ minHeight: 70 }} />
        </Field>
        <Field label="Long description (expanded state, one paragraph per line)">
          <TextArea
            value={theme.summary.join('\n')}
            onChange={(e) => patch((t) => { t.summary = (e.target as any).value.split('\n').filter((x: string) => x.trim()); })}
            style={{ minHeight: 120 }}
          />
        </Field>
        <Grid2>
          <Field label="Dark-mode accent HEX"><TextInput value={theme.darkHex} onChange={(e) => patch((t) => { t.darkHex = (e.target as any).value; })} /></Field>
          <Field label="Light-mode accent HEX"><TextInput value={theme.lightHex} onChange={(e) => patch((t) => { t.lightHex = (e.target as any).value; })} /></Field>
        </Grid2>
        <Field label="Publish status">
          <Toggle checked={theme.status === 'published'} onChange={(v) => patch((t) => { t.status = v ? 'published' : 'draft'; })} label={theme.status === 'published' ? 'Published' : 'Draft'} />
        </Field>
      </Panel>

      <Panel>
        <h3 className="font-display italic text-[18px] mb-3">Investigator Team</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {theme.investigatorSlugs.map((slug) => {
            const c = roster.find((r) => r.slug === slug);
            return <Chip key={slug} onRemove={() => removeInvestigator(slug)}>{c?.name ?? slug}</Chip>;
          })}
          {theme.investigatorSlugs.length === 0 && <span className="text-faint text-[13px]">No investigators linked yet.</span>}
        </div>
        <div className="flex gap-2">
          <TextInput
            list="collaborator-roster"
            placeholder="Type a name — existing or new"
            value={investigatorInput}
            onChange={(e) => setInvestigatorInput((e.target as any).value)}
          />
          <datalist id="collaborator-roster">
            {roster.map((c) => <option key={c.slug} value={c.name} />)}
          </datalist>
          <Btn onClick={addInvestigator}>Add</Btn>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display italic text-[18px]">Key Concepts</h3>
          <Btn size="sm" onClick={addKeyConcept}>+ Add concept</Btn>
        </div>
        {theme.keyConcepts.map((kc, i) => (
          <div key={i} className="border border-hair rounded-sm p-3 mb-2.5">
            <Field label="Header"><TextInput value={kc.header} onChange={(e) => patch((t) => { t.keyConcepts[i].header = (e.target as any).value; })} /></Field>
            <Field label="Description"><TextArea value={kc.desc} onChange={(e) => patch((t) => { t.keyConcepts[i].desc = (e.target as any).value; })} style={{ minHeight: 60 }} /></Field>
            <Btn size="sm" variant="danger" onClick={() => removeKeyConcept(i)}>Remove</Btn>
          </div>
        ))}
        {theme.keyConcepts.length === 0 && <p className="text-faint text-[13px]">No key concepts published yet.</p>}
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-display italic text-[18px]">Conversations</h3>
          <Btn size="sm" onClick={() => go('episodes')}>Go to Episode Repository</Btn>
        </div>
        <div className="space-y-2 mb-3">
          {themeEpisodes.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 border border-hair rounded-sm px-3 py-2">
              <span className="text-[13.5px]"><b>{e.no}</b> · {e.title} {e.guest && <span className="text-faint">with {e.guest}</span>}</span>
              <Btn size="sm" variant="danger" onClick={() => unassignEpisode(e.id)}>Remove</Btn>
            </div>
          ))}
          {themeEpisodes.length === 0 && <p className="text-faint text-[13px]">No conversations linked yet.</p>}
        </div>
        <Select defaultValue="" onChange={(e) => { assignEpisode((e.target as any).value); (e.target as any).value = ''; }}>
          <option value="" disabled>Add an episode to this theme…</option>
          {unassignedEpisodes.map((e) => <option key={e.id} value={e.id}>{e.no} · {e.title}</option>)}
        </Select>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-display italic text-[18px]">Sub-themes</h3>
          <Btn size="sm" onClick={addSubTheme}>+ Add sub-theme</Btn>
        </div>
        {theme.subThemes.map((s, i) => (
          <div key={s.slug} className="border border-hair rounded-sm p-3.5 mb-3">
            <Grid2>
              <Field label="Sub-theme title"><TextInput value={s.title} onChange={(e) => updateSubTheme(i, (x) => { x.title = (e.target as any).value; })} /></Field>
              <Field label="Slug"><TextInput value={s.slug} disabled /></Field>
            </Grid2>
            <Field label="Short description"><TextArea value={s.shortDesc} onChange={(e) => updateSubTheme(i, (x) => { x.shortDesc = (e.target as any).value; })} style={{ minHeight: 56 }} /></Field>
            <Field label="Long description"><TextArea value={s.longDesc} onChange={(e) => updateSubTheme(i, (x) => { x.longDesc = (e.target as any).value; })} style={{ minHeight: 70 }} /></Field>
            <Grid2>
              <Field label="Dark accent HEX"><TextInput value={s.darkHex || ''} onChange={(e) => updateSubTheme(i, (x) => { x.darkHex = (e.target as any).value; })} /></Field>
              <Field label="Light accent HEX"><TextInput value={s.lightHex || ''} onChange={(e) => updateSubTheme(i, (x) => { x.lightHex = (e.target as any).value; })} /></Field>
            </Grid2>

            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-muted">Tertiary themes</span>
                <Btn size="sm" onClick={() => addTertiary(i)}>+ Add tertiary theme</Btn>
              </div>
              {(s.tertiaryThemes || []).map((tier, ti) => (
                <div key={tier.slug} className="flex gap-2 items-start mb-2">
                  <TextInput
                    value={tier.title}
                    onChange={(e) => updateSubTheme(i, (x) => { x.tertiaryThemes![ti].title = (e.target as any).value; })}
                    placeholder="Title"
                  />
                  <TextInput
                    value={tier.desc}
                    onChange={(e) => updateSubTheme(i, (x) => { x.tertiaryThemes![ti].desc = (e.target as any).value; })}
                    placeholder="Description"
                  />
                  <Btn size="sm" variant="danger" onClick={() => removeTertiary(i, ti)}>×</Btn>
                </div>
              ))}
            </div>

            <Btn size="sm" variant="danger" onClick={() => removeSubTheme(i)} className="mt-2">Delete sub-theme</Btn>
          </div>
        ))}
        {theme.subThemes.length === 0 && <p className="text-faint text-[13px]">No sub-themes yet.</p>}
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-display italic text-[18px]">Essays</h3>
          <Btn size="sm" onClick={() => go('pages')}>Go to Essay Repository</Btn>
        </div>
        <div className="space-y-2 mb-3">
          {themeEssays.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 border border-hair rounded-sm px-3 py-2">
              <span className="text-[13.5px]">{e.title} {e.author && <span className="text-faint">by {e.author}</span>}</span>
              <Btn size="sm" variant="danger" onClick={() => unassignEssay(e.id)}>Remove</Btn>
            </div>
          ))}
          {themeEssays.length === 0 && <p className="text-faint text-[13px]">No essays linked yet.</p>}
        </div>
        <Select defaultValue="" onChange={(e) => { assignEssay((e.target as any).value); (e.target as any).value = ''; }}>
          <option value="" disabled>Add an essay to this theme…</option>
          {unassignedEssays.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </Select>
      </Panel>

      <Panel>
        <h3 className="font-display italic text-[18px] mb-3">Future Directions</h3>
        <Field label="Header"><TextInput value={theme.future.header} onChange={(e) => patch((t) => { t.future.header = (e.target as any).value; })} /></Field>
        <Field label="Description"><TextArea value={theme.future.desc} onChange={(e) => patch((t) => { t.future.desc = (e.target as any).value; })} style={{ minHeight: 80 }} /></Field>
        <p className="text-[12.5px] text-faint">The "How can I contribute" button on this section links to the Contribute-to-BetterArch part of Contact Us — standard across every theme.</p>
      </Panel>

      <Panel>
        <h3 className="font-display italic text-[18px] mb-3">Keywords</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {theme.keywords.map((k, i) => <Chip key={k.word + i} onRemove={() => removeKeyword(i)}>{k.word}</Chip>)}
          {theme.keywords.length === 0 && <span className="text-faint text-[13px]">None added — the Themes Masterpage card will autopull from sub-theme/episode/essay keywords instead.</span>}
        </div>
        <div className="flex gap-2">
          <TextInput value={newKeyword} onChange={(e) => setNewKeyword((e.target as any).value)} placeholder="Add a keyword" />
          <Btn onClick={addKeyword}>Add</Btn>
        </div>
      </Panel>

      <Panel>
        <h3 className="font-display italic text-[18px] mb-3">Theme posters</h3>
        <Grid2>
          <Field label="Square poster">
            <input type="file" accept="image/*" onChange={(e) => onPoster('posterSquareUrl', e.target.files?.[0])} />
            {theme.posterSquareUrl && <img src={theme.posterSquareUrl} alt="" className="mt-2 w-24 h-24 object-cover rounded" />}
          </Field>
          <Field label="Rectangle poster">
            <input type="file" accept="image/*" onChange={(e) => onPoster('posterRectUrl', e.target.files?.[0])} />
            {theme.posterRectUrl && <img src={theme.posterRectUrl} alt="" className="mt-2 w-40 h-24 object-cover rounded" />}
          </Field>
        </Grid2>
      </Panel>
    </div>
  );
}

function Rich({ children }: { children: string }) {
  return <>{children}</>;
}
