import { useMemo, useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { slugify } from '../../lib/slug';
import { Btn, Field, Panel, PanelNote, PanelTitle, Pill, PlainInput, Select, VHead } from '../components/ui';
import {
  allPlaces, attach, canHoldKeywords, collectKeywordRows, deleteEverywhere, removeFrom, renameKeyword, setCount, setGlossEverywhere,
  type KeywordRow, type Place, type PlaceKind,
} from '../lib/keywordsAdmin';

const KIND_LABEL: Record<PlaceKind, string> = { episode: 'Episode', essay: 'Essay', subtheme: 'Sub-theme', theme: 'Theme' };
const KIND_CLS: Record<PlaceKind, string> = {
  episode: 'text-rust bg-rust/[0.10]', essay: 'text-moss bg-mossBg', subtheme: 'text-amber bg-amberBg', theme: 'text-ink bg-ink/[0.07]',
};
const placeKey = (p: Pick<Place, 'kind' | 'id'>) => `${p.kind}|${p.id}`;

/** Picker for a place (grouped by kind). Episodes without an analysis record can't hold keywords. */
function PlaceSelect({ value, onChange, places, data, exclude }: {
  value: string; onChange: (v: string) => void; places: Place[]; data: Parameters<typeof canHoldKeywords>[0]; exclude?: Set<string>;
}) {
  const groups: PlaceKind[] = ['episode', 'essay', 'subtheme', 'theme'];
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Where to attach">
      <option value="">Attach to…</option>
      {groups.map((g) => (
        <optgroup key={g} label={`${KIND_LABEL[g]}s`}>
          {places.filter((p) => p.kind === g && !exclude?.has(placeKey(p))).map((p) => {
            const ok = canHoldKeywords(data, p);
            return <option key={placeKey(p)} value={placeKey(p)} disabled={!ok}>{`${p.label} · ${p.sub}${ok ? '' : ' (needs an analysis first)'}`}</option>;
          })}
        </optgroup>
      ))}
    </Select>
  );
}

export default function KeywordRepository() {
  const { toast, go } = useConsole();
  const { data, update } = useSiteData();
  const rows = useMemo(() => collectKeywordRows(data), [data]);
  const places = useMemo(() => allPlaces(data), [data]);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | PlaceKind>('all');
  const [sort, setSort] = useState<'uses' | 'az' | 'count'>('uses');
  const [open, setOpen] = useState<string | null>(null);
  // new keyword
  const [nw, setNw] = useState('');
  const [nPlace, setNPlace] = useState('');
  const [nFreq, setNFreq] = useState(1);
  const [nErr, setNErr] = useState('');

  const list = rows
    .filter((r) => (kind === 'all' || r.occ.some((o) => o.kind === kind)) && (!q.trim() || r.word.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => (sort === 'az' ? a.word.localeCompare(b.word) : sort === 'count' ? b.total - a.total : b.occ.length - a.occ.length || a.word.localeCompare(b.word)));

  const counts = { all: rows.length } as Record<string, number>;
  for (const k of ['episode', 'essay', 'subtheme', 'theme'] as PlaceKind[]) counts[k] = rows.filter((r) => r.occ.some((o) => o.kind === k)).length;

  function addNew() {
    const w = nw.trim().replace(/\s+/g, ' ');
    if (!w || !slugify(w)) { setNErr('Type a keyword.'); return; }
    if (!nPlace) { setNErr('Choose where to attach it.'); return; }
    const [k, id] = [nPlace.slice(0, nPlace.indexOf('|')) as PlaceKind, nPlace.slice(nPlace.indexOf('|') + 1)];
    const existing = rows.find((r) => r.slug === slugify(w));
    if (existing?.occ.some((o) => o.kind === k && o.id === id)) { setNErr(`"${existing.word}" is already on that ${KIND_LABEL[k].toLowerCase()}.`); return; }
    const typ = existing?.occ.find((o) => o.typ)?.typ ?? '';
    update((d) => { attach(d, k, id, existing?.word ?? w, nFreq, existing?.gloss ?? '', typ); });
    setNw(''); setNFreq(1); setNErr('');
    setOpen(slugify(w));
    toast(existing ? `Attached "${existing.word}".` : `Added "${w}".`);
  }

  return (
    <div>
      <VHead
        title="Keyword Repository"
        sub="Every keyword on the site and where it appears (episodes, essays, sub-themes, themes). Each keyword has its own public page listing those places. Click a keyword to rename it, edit its note, change counts or attach it elsewhere."
      />

      <Panel>
        <PanelTitle num="+" title="Add a keyword" />
        <div className="grid gap-2 sm:grid-cols-[1.2fr_1.6fr_90px_auto] items-start">
          <div>
            <PlainInput list="kw-all" value={nw} onChange={(e) => { setNw(e.target.value); setNErr(''); }} placeholder="Keyword (existing ones are suggested)" aria-label="Keyword" />
            <datalist id="kw-all">{rows.map((r) => <option key={r.slug} value={r.word} />)}</datalist>
          </div>
          <PlaceSelect value={nPlace} onChange={(v) => { setNPlace(v); setNErr(''); }} places={places} data={data} />
          <PlainInput type="number" min={1} value={nFreq} onChange={(e) => setNFreq(Math.max(1, Number(e.target.value) || 1))} aria-label="Count" title="How many times it appears" />
          <Btn variant="primary" onClick={addNew}>Add</Btn>
        </div>
        {nErr && <p role="alert" className="text-danger text-[13px] font-semibold mt-1.5">{nErr}</p>}
      </Panel>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Pill active={kind === 'all'} onClick={() => setKind('all')}>{`All (${counts.all})`}</Pill>
        {(['episode', 'essay', 'subtheme', 'theme'] as PlaceKind[]).map((k) => (
          <Pill key={k} active={kind === k} onClick={() => setKind(k)}>{`In ${KIND_LABEL[k].toLowerCase()}s (${counts[k]})`}</Pill>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <PlainInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search keywords" className="max-w-[300px]" aria-label="Search keywords" />
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="max-w-[220px]" aria-label="Sort">
          <option value="uses">Most places first</option>
          <option value="count">Highest total count</option>
          <option value="az">A to Z</option>
        </Select>
        <span className="text-[12.5px] text-faint font-mono">{list.length} shown</span>
      </div>

      {list.length === 0 && <Panel><p className="text-muted text-[14.5px]">{rows.length ? 'No keywords match.' : 'No keywords yet.'}</p></Panel>}

      <div className="border border-hair rounded-md overflow-hidden bg-card c-card">
        {list.map((r) => (
          <KeywordItemRow
            key={r.slug}
            row={r}
            rows={rows}
            open={open === r.slug}
            onToggle={() => setOpen(open === r.slug ? null : r.slug)}
            places={places}
            data={data}
            update={update}
            toast={toast}
            onRenamed={(s) => setOpen(s)}
            openPlace={(o) => go(o.kind === 'episode' ? 'episodeAnalysisEditor' : o.kind === 'essay' ? 'essayEditor' : 'themeEditor', o.kind === 'subtheme' ? o.id.split('/')[0] : o.id)}
          />
        ))}
      </div>
    </div>
  );
}

function KeywordItemRow({ row, rows, open, onToggle, places, data, update, toast, onRenamed, openPlace }: {
  row: KeywordRow; rows: KeywordRow[]; open: boolean; onToggle: () => void; places: Place[];
  data: Parameters<typeof canHoldKeywords>[0]; update: (fn: (d: Parameters<typeof canHoldKeywords>[0]) => void) => void;
  toast: (m: string) => void; onRenamed: (slug: string) => void; openPlace: (o: Place) => void;
}) {
  const [name, setName] = useState<string | null>(null);
  const [gloss, setGloss] = useState<string | null>(null);
  const [pick, setPick] = useState('');
  const [freq, setFreq] = useState(1);
  const kinds = Array.from(new Set(row.occ.map((o) => o.kind)));

  const newName = (name ?? row.word).trim().replace(/\s+/g, ' ');
  const renaming = name !== null && newName !== row.word;
  const mergeWith = renaming ? rows.find((r) => r.slug === slugify(newName) && r.slug !== row.slug) : undefined;
  const nameErr = renaming && !slugify(newName) ? 'Type a keyword.' : null;

  function saveName() {
    if (!renaming || nameErr) return;
    if (mergeWith && !window.confirm(`"${mergeWith.word}" already exists. Merge "${row.word}" into it? Counts are added together where both appear.`)) return;
    update((d) => renameKeyword(d, row.slug, mergeWith ? mergeWith.word : newName));
    setName(null);
    onRenamed(slugify(mergeWith ? mergeWith.word : newName));
    toast(mergeWith ? `Merged into "${mergeWith.word}".` : `Renamed to "${newName}" everywhere.`);
  }
  function saveGloss() {
    update((d) => setGlossEverywhere(d, row.slug, (gloss ?? '').trim()));
    setGloss(null);
    toast('Note saved everywhere this keyword appears.');
  }
  function attachHere() {
    if (!pick) return;
    const k = pick.slice(0, pick.indexOf('|')) as PlaceKind;
    const id = pick.slice(pick.indexOf('|') + 1);
    const typ = row.occ.find((o) => o.typ)?.typ ?? '';
    update((d) => { attach(d, k, id, row.word, freq, row.gloss, typ); });
    setPick(''); setFreq(1);
    toast(`Attached "${row.word}".`);
  }
  function del() {
    if (!window.confirm(`Delete "${row.word}" from all ${row.occ.length} place${row.occ.length === 1 ? '' : 's'}? Its keyword page will disappear.`)) return;
    update((d) => deleteEverywhere(d, row.slug));
    toast(`Deleted "${row.word}".`);
  }

  return (
    <div className="border-b border-hair2 last:border-none">
      <button type="button" onClick={onToggle} aria-expanded={open} className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${open ? 'bg-rust/[0.06]' : 'hover:bg-ink/[0.03]'}`}>
        <span className={`text-rust text-[11px] transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        <b className="font-sans text-[14.5px] min-w-0 truncate">{row.word}</b>
        <span className="hidden sm:flex gap-1">
          {kinds.map((k) => <span key={k} className={`font-sans text-[10px] font-bold uppercase tracking-[0.08em] rounded-full px-2 py-0.5 ${KIND_CLS[k]}`}>{KIND_LABEL[k]}</span>)}
        </span>
        <span className="flex-1" />
        <span className="font-mono text-[12px] text-faint whitespace-nowrap">{row.occ.length} place{row.occ.length === 1 ? '' : 's'} · ×{row.total}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-rust/[0.03]">
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Keyword" hint={mergeWith ? `Will merge into the existing "${mergeWith.word}".` : 'Renames it everywhere it appears.'}>
              <div className="flex gap-2">
                <PlainInput value={name ?? row.word} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setName(null); }} />
                {renaming && <Btn size="sm" variant="primary" onClick={saveName} disabled={!!nameErr}>{mergeWith ? 'Merge' : 'Save'}</Btn>}
              </div>
            </Field>
            <Field label="Short note (gloss)" hint="Shown when visitors hover the word. Saved to every place.">
              <div className="flex gap-2">
                <PlainInput value={gloss ?? row.gloss} onChange={(e) => setGloss(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveGloss(); }} placeholder="optional" />
                {gloss !== null && gloss !== row.gloss && <Btn size="sm" variant="primary" onClick={saveGloss}>Save</Btn>}
              </div>
            </Field>
          </div>

          <PanelNote>Appears in:</PanelNote>
          <ul className="border border-hair rounded-md overflow-hidden mb-3 bg-card">
            {row.occ.map((o) => (
              <li key={placeKey(o)} className="flex items-center gap-2.5 px-3 py-2 border-b border-hair2 last:border-none">
                <span className={`font-sans text-[10px] font-bold uppercase tracking-[0.08em] rounded-full px-2 py-0.5 shrink-0 ${KIND_CLS[o.kind]}`}>{KIND_LABEL[o.kind]}</span>
                <button type="button" onClick={() => openPlace(o)} className="flex-1 min-w-0 truncate text-left text-[13.5px] hover:underline" title="Open in its editor">{o.label}</button>
                <label className="flex items-center gap-1 text-[12px] text-muted">
                  ×
                  <input
                    type="number"
                    min={1}
                    value={o.freq || 1}
                    onChange={(e) => update((d) => setCount(d, o.kind, o.id, row.slug, Number(e.target.value)))}
                    className="w-16 bg-paper text-ink border border-hair rounded px-2 py-1 text-[13px]"
                    aria-label={`Count in ${o.label}`}
                  />
                </label>
                <button type="button" onClick={() => update((d) => removeFrom(d, o.kind, o.id, row.slug))} className="w-7 h-7 rounded border border-hair text-danger hover:border-danger" aria-label={`Remove from ${o.label}`}>×</button>
              </li>
            ))}
          </ul>

          <div className="grid gap-2 sm:grid-cols-[1fr_90px_auto] items-start mb-3">
            <PlaceSelect value={pick} onChange={setPick} places={places} data={data} exclude={new Set(row.occ.map(placeKey))} />
            <PlainInput type="number" min={1} value={freq} onChange={(e) => setFreq(Math.max(1, Number(e.target.value) || 1))} aria-label="Count" />
            <Btn onClick={attachHere} disabled={!pick} className="disabled:opacity-50">Attach</Btn>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <a href={`/keyword/${row.slug}`} target="_blank" rel="noopener" className="font-sans font-semibold text-[13px] text-rust underline">View keyword page ↗</a>
            <span className="flex-1" />
            <Btn size="sm" variant="danger" onClick={del}>Delete everywhere</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
