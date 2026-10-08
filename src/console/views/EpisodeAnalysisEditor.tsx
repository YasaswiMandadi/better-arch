import { useMemo, useRef, useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import {
  AddRow, Btn, Chip, Field, Grid2, Grid3, Panel, RepCard, Select, SlRow, TextArea, TextInput, Toggle, VHead,
} from '../components/ui';
import SectionHead from '../components/SectionHead';
import type { Episode, EpisodeAnalysis } from '../../data/types';
import { importAnalysisHtml, importAnalysisJson, type ImportResult } from '../lib/parseAnalysisHtml';
import { bestKeywordMatchForTag, collectKeywordSuggestions, rankKeywordSuggestions } from '../../data/keywords';
import { resolveAnalysis } from '../../data/useEpisodeAnalysis';
import { slugify } from '../../lib/slug';

/**
 * Validates the shape loosely — enough to catch a wrong/partial file
 * without being so strict that a reasonable upload gets rejected. Fields
 * the public Episode page doesn't render yet (an older/newer framework
 * version's extra sections) are simply ignored, not an error.
 */
function validateAnalysis(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return 'That file is not a JSON object.';
  const required: [string, string][] = [
    ['reading', 'array'], ['keywords', 'array'], ['themes', 'array'],
    ['quotes', 'array'], ['sentiments', 'array'], ['compass', 'object'],
  ];
  for (const [key, kind] of required) {
    const v = obj[key];
    if (kind === 'array' && !Array.isArray(v)) return `Missing or invalid "${key}" (expected an array).`;
    if (kind === 'object' && (typeof v !== 'object' || Array.isArray(v) || v === null)) return `Missing or invalid "${key}" (expected an object).`;
  }
  return null;
}

/** Keeps only the fields the current EpisodeAnalysis shape knows about,
 * so an upload from a differently-versioned template (extra sections like
 * an Evidence Map or Phenomenology grid) doesn't carry dead weight into
 * the store. */
function pickKnownFields(obj: any): EpisodeAnalysis {
  const keys: (keyof EpisodeAnalysis)[] = [
    'eyebrow', 'bio', 'tags', 'stats', 'reading', 'lexnarr', 'keywords', 'hue',
    'themes', 'qcats', 'quotes', 'lived', 'sentprose', 'sentiments', 'compass',
    'refcats', 'refs', 'related', 'materials', 'txnote', 'tx',
    'meta', 'spectacle', 'cite',
  ];
  const out: any = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out as EpisodeAnalysis;
}

/** A fully-empty analysis record, so the subheading editors below have
 * something to write into even before any file has been uploaded. */
function blankAnalysis(): EpisodeAnalysis {
  return {
    eyebrow: '', bio: '', tags: [], stats: [], reading: [], lexnarr: '', keywords: [], hue: {},
    themes: [], qcats: [], quotes: [], lived: '', sentprose: '', sentiments: [],
    compass: { x: 50, y: 50, quadrant: '', prose: '', indicators: [] },
    refcats: [], refs: [], related: [], materials: [], txnote: '', tx: [],
  };
}

/** One-click chips under a text field. Rendered only when there is something to suggest. */
function SuggestRow({ label, items, onPick, title }: { label: string; items: { key: string; text: string; hint?: string }[]; onPick: (key: string) => void; title?: string }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 -mt-2 mb-4" data-suggest-row>
      <span className="text-[11px] uppercase tracking-[0.08em] text-faint font-semibold mr-0.5">{label}</span>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          title={it.hint ?? title}
          onClick={() => onPick(it.key)}
          className="text-[12.5px] px-2.5 py-1 rounded-full border border-hair bg-paper text-muted hover:border-rust hover:text-ink transition-colors"
        >
          {it.text}
        </button>
      ))}
    </div>
  );
}

export default function EpisodeAnalysisEditor() {
  const { editId, go, toast } = useConsole();
  const { data, update } = useSiteData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  // Every keyword already on the site (all episodes incl. drafts, essays,
  // sub-themes) — offered as one-click suggestions in section 05.
  const allKeywordSuggestions = useMemo(() => collectKeywordSuggestions(data, (ep) => resolveAnalysis(ep)), [data]);

  const episode = data.episodes.find((e) => e.id === editId);
  if (!episode) {
    return (
      <Panel>
        <p className="text-muted">This episode no longer exists. <button onClick={() => go('episodeAnalysis')} className="underline">Back to Episode Analysis</button></p>
      </Panel>
    );
  }

  function patch(fn: (e: Episode) => void) {
    update((d) => {
      const e = d.episodes.find((x) => x.id === editId);
      if (e) fn(e);
    });
  }

  /** Mutates the analysis record, creating a blank one on first use so the
   * subheading sections work whether or not a file has been uploaded yet. */
  function patchAnalysis(fn: (a: EpisodeAnalysis) => void) {
    patch((ep) => {
      if (!ep.analysisData) ep.analysisData = blankAnalysis();
      fn(ep.analysisData);
    });
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isHtml = name.endsWith('.html') || name.endsWith('.htm') || file.type === 'text/html';
    const isJson = name.endsWith('.json') || file.type === 'application/json';

    if (!isHtml && !isJson) {
      toast('Upload the analysis as a .json file or an .html template (see the sample template) — other file types aren’t read here.');
      return;
    }

    let result: ImportResult;
    if (isHtml) {
      result = importAnalysisHtml(await file.text());
    } else {
      result = importAnalysisJson(await file.text());
    }
    if (result.error) {
      toast(result.error);
      return;
    }
    const parsed = result.data;

    const err = validateAnalysis(parsed);
    if (err) {
      toast(err);
      return;
    }
    const clean = pickKnownFields(parsed);
    const suggest = result.suggest;
    patch((e) => {
      e.analysisData = clean;
      e.analysis = true;
      // Fill the episode's own details from the page, but never overwrite
      // anything the admin has already typed.
      if (suggest) {
        const fresh = e.title === 'New episode';
        const blank = (v: string) => !v || !v.replace(/<[^>]*>/g, '').trim();
        if (suggest.title && (blank(e.title) || e.title === 'New episode')) e.title = suggest.title;
        if (suggest.guest && blank(e.guest)) e.guest = suggest.guest;
        if (suggest.no && blank(e.no)) e.no = suggest.no;
        if (suggest.sub && blank(e.sub)) e.sub = suggest.sub;
        if (suggest.url && blank(e.url)) e.url = suggest.url;
        if (suggest.themeTitle && (fresh || !data.themes.some((t) => t.slug === e.season))) {
          const hit = data.themes.find((t) => t.title.toLowerCase() === suggest.themeTitle!.toLowerCase());
          if (hit) e.season = hit.slug;
        }
      }
    });
    const counts = result.report ? ` (${result.report.filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ')})` : '';
    toast(`Analysis record loaded from ${isHtml ? 'HTML' : 'JSON'}${counts} — edit it below, then publish when ready.`);
  }

  function removeAnalysis() {
    if (!confirm('Remove this episode’s analysis record? The page will fall back to the Spotify-only view.')) return;
    patch((e) => {
      delete e.analysisData;
      e.analysis = false;
    });
  }

  function setDraft() {
    patch((ep) => { ep.status = 'draft'; });
    toast('Moved to draft — hidden from listings, search and its theme page until published again.');
  }

  function publish(current: Episode) {
    const warnings: string[] = [];
    if (!current.analysisData) warnings.push('it has no analysis record yet (it will show as Spotify-only)');
    if (!current.title || current.title === 'New episode') warnings.push('its title still looks like a placeholder');
    if (!current.season) warnings.push('it isn’t assigned to a theme');
    const extra = warnings.length ? `\n\nHeads up: ${warnings.join('; ')}.` : '';
    if (!confirm(`Publish "${current.title || 'this episode'}"? It will immediately appear on the public site — in Episodes, its theme page, and search.${extra}`)) {
      return;
    }
    patch((ep) => { ep.status = 'published'; });
    toast('Published — live on the public site now.');
  }

  const published = episode.status !== 'draft';
  const A = episode.analysisData;

  return (
    <div>
      <VHead
        title={<>Episode: {episode.title || 'Untitled'}</>}
        sub="Metadata and the analysis record below save as you type and write straight into the live store. Nothing reaches Episodes, its theme page or search until you publish."
      >
        <span className={`font-sans text-[10px] font-bold uppercase tracking-[0.1em] rounded-full px-2.5 py-1 ${published ? 'text-moss bg-mossBg' : 'text-amber bg-amberBg'}`}>
          {published ? 'Published' : 'Draft'}
        </span>
        {published ? (
          <Btn onClick={setDraft}>Move to draft</Btn>
        ) : (
          <Btn variant="primary" onClick={() => publish(episode)}>Publish</Btn>
        )}
        <Btn onClick={() => go('episodeAnalysis')}>← Episode Analysis</Btn>
      </VHead>

      {/* 01 identity */}
      <SectionHead id="s01" num="01" title="Identity & metadata" mirror="hero block, header, listings">
        <Panel>
          <Grid2>
            <Field label="Title"><TextInput value={episode.title} onChange={(ev) => patch((ep) => { ep.title = (ev.target as any).value; })} /></Field>
            <Field label="Guest"><TextInput value={episode.guest} onChange={(ev) => patch((ep) => { ep.guest = (ev.target as any).value; })} /></Field>
          </Grid2>
          <Grid3>
            <Field label="Episode no. (e.g. 33)"><TextInput value={episode.no} onChange={(ev) => patch((ep) => { ep.no = (ev.target as any).value; })} /></Field>
            <Field label="Theme">
              <Select value={episode.season} onChange={(ev) => patch((ep) => { ep.season = (ev.target as any).value; })}>
                <option value="">— none —</option>
                {data.themes.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}
              </Select>
            </Field>
            <Field label="Subtitle / one-liner"><TextInput value={episode.sub} onChange={(ev) => patch((ep) => { ep.sub = (ev.target as any).value; })} /></Field>
          </Grid3>
          <Field label="Spotify episode URL">
            <TextInput type="url" value={episode.url} onChange={(ev) => patch((ep) => { ep.url = (ev.target as any).value; })} />
          </Field>
          <Field label="Deep-analysis flag">
            <Toggle
              checked={episode.analysis}
              onChange={(v) => patch((ep) => { ep.analysis = v; })}
              label={episode.analysis ? 'Shown as "analysis live"' : 'Shown as "listen on spotify"'}
            />
          </Field>
        </Panel>
      </SectionHead>

      {/* 02 upload */}
      <SectionHead id="s02" num="02" title="Load from a file" mirror="optional — fills everything below in one go">
        <Panel>
          <p className="text-muted text-[13.5px] mb-2 max-w-[64ch]">
            Upload the episode's analysis as a <code>.json</code> file, or as an <code>.html</code> template built
            from the sample below. Either way it's read into the sections underneath, which you can then keep
            editing by hand.
          </p>
          <p className="text-muted text-[13.5px] mb-4 max-w-[64ch]">
            The HTML template carries its data as one embedded JSON block (<code>id="axm-analysis-data"</code>)
            rather than scattering it across prose and chart script — fill that block in, the visible page
            around it is yours to style.{' '}
            <a href="/episode-analysis-template.html" download className="underline text-rustDeep">Download the sample template</a>.
          </p>

          {A ? (
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="inline-block w-2 h-2 rounded-full bg-moss" />
              <span className="text-[13.5px] font-sans">Analysis record present ({A.reading?.length ?? 0} reading paragraphs, {A.keywords?.length ?? 0} keywords, {A.quotes?.length ?? 0} quotes).</span>
              <Btn size="sm" variant="danger" onClick={removeAnalysis}>Remove entire record</Btn>
            </div>
          ) : (
            <p className="text-faint text-[13px] mb-4">No analysis record yet — upload a file here, or start filling in the sections below directly.</p>
          )}

          <div
            onDragOver={(ev) => { ev.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(ev) => { ev.preventDefault(); setDragOver(false); handleFile(ev.dataTransfer.files?.[0]); }}
            className={`border border-dashed rounded-sm p-6 text-center transition-colors ${dragOver ? 'border-rust bg-rust/[0.04]' : 'border-hair'}`}
          >
            <p className="text-[13.5px] text-muted mb-3">Drop a <code>.json</code> or <code>.html</code> analysis file here, or</p>
            <Btn onClick={() => fileRef.current?.click()}>Choose file…</Btn>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.html,.htm,application/json,text/html"
              className="hidden"
              onChange={(ev) => handleFile(ev.target.files?.[0])}
            />
          </div>
        </Panel>
      </SectionHead>

      {/* 03 eyebrow / bio / tags / stats */}
      <SectionHead id="s03" num="03" title="Hero framing" mirror="eyebrow, bio card, tag chips, at-a-glance stats">
        <Panel>
          <Field label="Eyebrow" hint="e.g. Architecture X Media Studies · S2E33">
            <TextInput value={A?.eyebrow ?? ''} onChange={(ev) => patchAnalysis((a) => { a.eyebrow = (ev.target as any).value; })} />
          </Field>
          <Field label="Guest bio (hero card)">
            <TextArea value={A?.bio ?? ''} onChange={(ev) => patchAnalysis((a) => { a.bio = (ev.target as any).value; })} />
          </Field>
          <Field label="Tags">
            <div className="flex flex-wrap gap-2 bg-paper border border-hair rounded p-2">
              {(A?.tags ?? []).map((t, i) => (
                <Chip key={i} onRemove={() => patchAnalysis((a) => { a.tags.splice(i, 1); })}>{t}</Chip>
              ))}
              <input
                value={tagDraft} onChange={(ev) => setTagDraft(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' && tagDraft.trim()) {
                    patchAnalysis((a) => { a.tags.push(tagDraft.trim()); });
                    setTagDraft('');
                  }
                }}
                placeholder="add tag, press Enter"
                className="flex-1 min-w-[120px] bg-transparent outline-none text-[13.5px] font-sans px-1 py-1"
              />
            </div>
            {(() => {
              const kws = A?.keywords ?? [];
              const unlinked = (A?.tags ?? []).filter((t) => !bestKeywordMatchForTag(t, kws));
              return (A?.tags?.length ?? 0) > 0 ? (
                <p className="text-[12.5px] text-faint mt-1.5">
                  A tag links to its keyword page on the public episode when it contains one of this episode's keywords (section 05).
                  {unlinked.length ? ` Not linked yet: ${unlinked.join(', ')}.` : ' All tags link.'}
                </p>
              ) : null;
            })()}
          </Field>
          <Field label="At-a-glance stats">
            {(A?.stats ?? []).map((st, i) => (
              <Grid2 key={i}>
                <Field label="Number"><TextInput value={st[0]} onChange={(ev) => patchAnalysis((a) => { a.stats[i][0] = (ev.target as any).value; })} /></Field>
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><Field label="Label"><TextInput value={st[1]} onChange={(ev) => patchAnalysis((a) => { a.stats[i][1] = (ev.target as any).value; })} /></Field></div>
                  <Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.stats.splice(i, 1); })}>Remove</Btn>
                </div>
              </Grid2>
            ))}
            <AddRow onClick={() => patchAnalysis((a) => { a.stats.push(['', '']); })}>+ Stat</AddRow>
          </Field>
        </Panel>
      </SectionHead>

      {/* 04 reading */}
      <SectionHead id="s04" num="04" title="A Reading of the Conversation" mirror="section 01 · drop-cap prose">
        <Panel>
          {(A?.reading ?? []).map((p, i) => (
            <RepCard key={i} index={i}>
              <Field label={`Paragraph ${i + 1}`}>
                <TextArea className="min-h-[90px]" value={p} onChange={(ev) => patchAnalysis((a) => { a.reading[i] = (ev.target as any).value; })} />
              </Field>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.reading.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => patchAnalysis((a) => { a.reading.push(''); })}>+ Paragraph</AddRow>
        </Panel>
      </SectionHead>

      {/* 05 lexical terrain */}
      <SectionHead id="s05" num="05" title="Lexical Terrain" mirror="section 02 · bubble map">
        <Panel>
          <Field label="Intro prose"><TextArea value={A?.lexnarr ?? ''} onChange={(ev) => patchAnalysis((a) => { a.lexnarr = (ev.target as any).value; })} /></Field>
          {(A?.keywords ?? []).map((k, i) => (
            <RepCard key={i} index={i}>
              <Grid3>
                <Field label="Word"><TextInput value={k.word} onChange={(ev) => patchAnalysis((a) => { a.keywords[i].word = (ev.target as any).value; })} /></Field>
                <Field label="Cluster / zone"><TextInput value={k.typ} onChange={(ev) => patchAnalysis((a) => { a.keywords[i].typ = (ev.target as any).value; })} /></Field>
                <Field label="Frequency"><TextInput type="number" min={1} value={k.freq} onChange={(ev) => patchAnalysis((a) => { a.keywords[i].freq = +(ev.target as any).value; })} /></Field>
              </Grid3>
              <SuggestRow
                label="Existing keywords"
                title="Already used elsewhere on the site — click to reuse so it links to the same keyword page"
                items={rankKeywordSuggestions(
                  allKeywordSuggestions,
                  k.word,
                  new Set((A?.keywords ?? []).filter((_, j) => j !== i).map((x) => slugify(String(x.word).replace(/<[^>]*>/g, ' ')))),
                ).map((sg) => ({ key: sg.slug, text: sg.word, hint: `Used in ${sg.uses} place${sg.uses === 1 ? '' : 's'}${sg.gloss ? ` — ${sg.gloss}` : ''}` }))}
                onPick={(slug) => {
                  const sg = allKeywordSuggestions.find((x) => x.slug === slug);
                  if (!sg) return;
                  patchAnalysis((a) => {
                    const kw = a.keywords[i];
                    kw.word = sg.word;
                    if (!String(kw.typ ?? '').replace(/<[^>]*>/g, '').trim() && sg.typ) kw.typ = sg.typ;
                    if (!String(kw.gloss ?? '').replace(/<[^>]*>/g, '').trim() && sg.gloss) kw.gloss = sg.gloss;
                  });
                }}
              />
              <SuggestRow
                label="Clusters in this episode"
                items={Object.keys(A?.hue ?? {}).filter((z) => z !== k.typ).map((z) => ({ key: z, text: z }))}
                onPick={(z) => patchAnalysis((a) => { a.keywords[i].typ = z; })}
              />
              <Field label="Gloss (hover text)"><TextInput value={k.gloss} onChange={(ev) => patchAnalysis((a) => { a.keywords[i].gloss = (ev.target as any).value; })} /></Field>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.keywords.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => patchAnalysis((a) => { a.keywords.push({ word: '', typ: '', freq: 1, gloss: '' }); })}>+ Keyword</AddRow>

          <Field label="Cluster colours (hex per zone name)">
            {Object.entries(A?.hue ?? {}).map(([zone, hex], i) => (
              <Grid2 key={i}>
                <TextInput value={zone} onChange={(ev) => patchAnalysis((a) => {
                  const next = { ...a.hue }; const v = (ev.target as any).value;
                  delete next[zone]; next[v] = hex; a.hue = next;
                })} />
                <div className="flex gap-2 items-center">
                  <TextInput value={hex} onChange={(ev) => patchAnalysis((a) => { a.hue[zone] = (ev.target as any).value; })} />
                  <Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { const next = { ...a.hue }; delete next[zone]; a.hue = next; })}>Remove</Btn>
                </div>
              </Grid2>
            ))}
            <AddRow onClick={() => patchAnalysis((a) => { a.hue[`zone ${Object.keys(a.hue).length + 1}`] = '#B03020'; })}>+ Cluster colour</AddRow>
          </Field>
        </Panel>
      </SectionHead>

      {/* 06 themes */}
      <SectionHead id="s06" num="06" title="Key Themes" mirror="section 03 · numbered cards">
        <Panel>
          {(A?.themes ?? []).map((t, i) => (
            <RepCard key={i} index={i}>
              <Field label="Theme title"><TextInput value={t.t} onChange={(ev) => patchAnalysis((a) => { a.themes[i].t = (ev.target as any).value; })} /></Field>
              {t.p.map((p, j) => (
                <Field key={j} label={`Paragraph ${j + 1}`}>
                  <div className="flex gap-2">
                    <div className="flex-1"><TextArea className="min-h-[60px]" value={p} onChange={(ev) => patchAnalysis((a) => { a.themes[i].p[j] = (ev.target as any).value; })} /></div>
                    <Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.themes[i].p.splice(j, 1); })}>Remove</Btn>
                  </div>
                </Field>
              ))}
              <AddRow onClick={() => patchAnalysis((a) => { a.themes[i].p.push(''); })}>+ Paragraph</AddRow>
              <Grid3>
                <Field label="SPECTACLE code (optional)"><TextInput value={t.code ?? ''} onChange={(ev) => patchAnalysis((a) => { a.themes[i].code = (ev.target as any).value; })} /></Field>
                <Field label="Band (optional)"><TextInput value={t.band ?? ''} onChange={(ev) => patchAnalysis((a) => { a.themes[i].band = (ev.target as any).value; })} /></Field>
                <Field label="Bridge score (optional)"><TextInput value={t.bridge === undefined ? '' : String(t.bridge)} onChange={(ev) => patchAnalysis((a) => { const v = String((ev.target as any).value).replace(/<[^>]*>/g, '').trim(); a.themes[i].bridge = v === '' || isNaN(Number(v)) ? undefined : Number(v); })} /></Field>
              </Grid3>
              {(t.excerpts ?? []).map((x, j) => (
                <Field key={j} label={`Excerpt ${j + 1} — before / highlighted / after`}>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1.5">
                      <TextArea className="min-h-[40px]" value={x.before} onChange={(ev) => patchAnalysis((a) => { a.themes[i].excerpts![j].before = (ev.target as any).value; })} />
                      <TextArea className="min-h-[40px]" value={x.main} onChange={(ev) => patchAnalysis((a) => { a.themes[i].excerpts![j].main = (ev.target as any).value; })} />
                      <TextArea className="min-h-[40px]" value={x.after} onChange={(ev) => patchAnalysis((a) => { a.themes[i].excerpts![j].after = (ev.target as any).value; })} />
                    </div>
                    <Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.themes[i].excerpts!.splice(j, 1); })}>Remove</Btn>
                  </div>
                </Field>
              ))}
              <AddRow onClick={() => patchAnalysis((a) => { (a.themes[i].excerpts ??= []).push({ before: '', main: '', after: '' }); })}>+ Excerpt</AddRow>
              <div className="flex justify-end mt-2"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.themes.splice(i, 1); })}>Remove theme</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => patchAnalysis((a) => { a.themes.push({ t: '', p: [''] }); if (!a.qcats.includes('')) {} })}>+ Theme</AddRow>
          <p className="text-[13px] text-faint mt-2.5">A theme's title also works as its quote category below — keep the wording the same in both places.</p>
        </Panel>
      </SectionHead>

      {/* 07 quotes */}
      <SectionHead id="s07" num="07" title="Selected Highlights / Quotes" mirror="section 04 · filterable card list">
        <Panel>
          <Field label="Quote categories (the filter pills)">
            <div className="flex flex-wrap gap-2 bg-paper border border-hair rounded p-2">
              {(A?.qcats ?? []).map((c, i) => (
                <Chip key={i} onRemove={() => patchAnalysis((a) => { a.qcats.splice(i, 1); })}>{c}</Chip>
              ))}
              <input
                placeholder="add category, press Enter"
                onKeyDown={(ev) => {
                  const val = (ev.target as HTMLInputElement).value.trim();
                  if (ev.key === 'Enter' && val) {
                    patchAnalysis((a) => { a.qcats.push(val); });
                    (ev.target as HTMLInputElement).value = '';
                  }
                }}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-[13.5px] font-sans px-1 py-1"
              />
            </div>
          </Field>
          {(A?.quotes ?? []).map((q, i) => (
            <RepCard key={i} index={i}>
              <Field label="Context before"><TextArea className="min-h-[52px]" value={q.ctx1} onChange={(ev) => patchAnalysis((a) => { a.quotes[i].ctx1 = (ev.target as any).value; })} /></Field>
              <Field label="The quote (highlighted, verbatim)"><TextArea className="min-h-[52px]" value={q.main} onChange={(ev) => patchAnalysis((a) => { a.quotes[i].main = (ev.target as any).value; })} /></Field>
              <Field label="Context after"><TextArea className="min-h-[52px]" value={q.ctx2} onChange={(ev) => patchAnalysis((a) => { a.quotes[i].ctx2 = (ev.target as any).value; })} /></Field>
              <Grid2>
                <Field label="Category">
                  <TextInput list="qcats-list" value={q.cat} onChange={(ev) => patchAnalysis((a) => { a.quotes[i].cat = (ev.target as any).value; })} />
                </Field>
                <Field label="Flag">
                  <Toggle checked={q.kp} onChange={(v) => patchAnalysis((a) => { a.quotes[i].kp = v; })} label="key phrase" />
                </Field>
              </Grid2>
              {q.kp && (
                <Field label="Reading (why this quote matters)">
                  <TextArea className="min-h-[52px]" value={q.read} onChange={(ev) => patchAnalysis((a) => { a.quotes[i].read = (ev.target as any).value; })} />
                </Field>
              )}
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.quotes.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <datalist id="qcats-list">{(A?.qcats ?? []).map((c) => <option key={c} value={c} />)}</datalist>
          <AddRow onClick={() => patchAnalysis((a) => { a.quotes.push({ ctx1: '', main: '', ctx2: '', cat: '', kp: false, read: '' }); })}>+ Quote</AddRow>
        </Panel>
      </SectionHead>

      {/* 08 lived experience */}
      <SectionHead id="s08" num="08" title="Lived Experience" mirror="section 05 · single-card prose">
        <Panel>
          <Field label="Lived experience analysis (one continuous paragraph)">
            <TextArea className="min-h-[150px]" value={A?.lived ?? ''} onChange={(ev) => patchAnalysis((a) => { a.lived = (ev.target as any).value; })} />
          </Field>
        </Panel>
      </SectionHead>

      {/* 09 sentiment */}
      <SectionHead id="s09" num="09" title="Sentiment Register" mirror="section 06 · spider chart">
        <Panel>
          <Field label="Register prose"><TextArea className="min-h-[80px]" value={A?.sentprose ?? ''} onChange={(ev) => patchAnalysis((a) => { a.sentprose = (ev.target as any).value; })} /></Field>
          {(A?.sentiments ?? []).map((sn, i) => (
            <RepCard key={i} index={i}>
              <Grid3>
                <Field label="Code"><TextInput value={sn.code} onChange={(ev) => patchAnalysis((a) => { a.sentiments[i].code = (ev.target as any).value; })} /></Field>
                <Field label="Label"><TextInput value={sn.label} onChange={(ev) => patchAnalysis((a) => { a.sentiments[i].label = (ev.target as any).value; })} /></Field>
                <Field label="Full axis (e.g. Pessimism ↔ Optimism)"><TextInput value={sn.full} onChange={(ev) => patchAnalysis((a) => { a.sentiments[i].full = (ev.target as any).value; })} /></Field>
              </Grid3>
              <SlRow label="Score" value={sn.score} onChange={(v) => patchAnalysis((a) => { a.sentiments[i].score = v; })} />
              <Field label="Reading"><TextInput value={sn.reading} onChange={(ev) => patchAnalysis((a) => { a.sentiments[i].reading = (ev.target as any).value; })} /></Field>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.sentiments.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => patchAnalysis((a) => { a.sentiments.push({ code: `S${String(a.sentiments.length + 1).padStart(2, '0')}`, label: '', full: '', score: 50, reading: '' }); })}>+ Sentiment</AddRow>
        </Panel>
      </SectionHead>

      {/* 10 compass */}
      <SectionHead id="s10" num="10" title="Criticality Compass" mirror="section 07 · x/y plot">
        <Panel>
          <Grid3>
            <Field label="x · resource allocation"><TextInput type="number" min={0} max={100} value={A?.compass.x ?? 50} onChange={(ev) => patchAnalysis((a) => { a.compass.x = +(ev.target as any).value; })} /></Field>
            <Field label="y · critical autonomy"><TextInput type="number" min={0} max={100} value={A?.compass.y ?? 50} onChange={(ev) => patchAnalysis((a) => { a.compass.y = +(ev.target as any).value; })} /></Field>
            <Field label="Quadrant label"><TextInput value={A?.compass.quadrant ?? ''} onChange={(ev) => patchAnalysis((a) => { a.compass.quadrant = (ev.target as any).value; })} /></Field>
          </Grid3>
          <Field label="Compass prose"><TextArea className="min-h-[90px]" value={A?.compass.prose ?? ''} onChange={(ev) => patchAnalysis((a) => { a.compass.prose = (ev.target as any).value; })} /></Field>
          {(A?.compass.indicators ?? []).map((ind, i) => (
            <RepCard key={i} index={i}>
              <Grid3>
                <Field label="Code"><TextInput value={ind[0]} onChange={(ev) => patchAnalysis((a) => { a.compass.indicators[i][0] = (ev.target as any).value; })} /></Field>
                <Field label="Label"><TextInput value={ind[1]} onChange={(ev) => patchAnalysis((a) => { a.compass.indicators[i][1] = (ev.target as any).value; })} /></Field>
                <Field label="Score (0–100)"><TextInput type="number" min={0} max={100} value={ind[2]} onChange={(ev) => patchAnalysis((a) => { a.compass.indicators[i][2] = +(ev.target as any).value; })} /></Field>
              </Grid3>
              <Field label="Note / basis"><TextInput value={ind[3]} onChange={(ev) => patchAnalysis((a) => { a.compass.indicators[i][3] = (ev.target as any).value; })} /></Field>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.compass.indicators.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => patchAnalysis((a) => { a.compass.indicators.push(['', '', 0, '']); })}>+ Indicator</AddRow>
        </Panel>
      </SectionHead>

      {/* 11 references */}
      <SectionHead id="s11" num="11" title="References" mirror="section 08 · tabbed table">
        <Panel>
          <Field label="Reference categories (tabs)">
            <div className="flex flex-wrap gap-2 bg-paper border border-hair rounded p-2">
              {(A?.refcats ?? []).map((c, i) => (
                <Chip key={i} onRemove={() => patchAnalysis((a) => { a.refcats.splice(i, 1); })}>{c}</Chip>
              ))}
              <input
                placeholder="add category, press Enter"
                onKeyDown={(ev) => {
                  const val = (ev.target as HTMLInputElement).value.trim();
                  if (ev.key === 'Enter' && val) {
                    patchAnalysis((a) => { a.refcats.push(val); });
                    (ev.target as HTMLInputElement).value = '';
                  }
                }}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-[13.5px] font-sans px-1 py-1"
              />
            </div>
          </Field>
          {(A?.refs ?? []).map((r, i) => (
            <RepCard key={i} index={i}>
              <Grid2>
                <Field label="Name"><TextInput value={r.n} onChange={(ev) => patchAnalysis((a) => { a.refs[i].n = (ev.target as any).value; })} /></Field>
                <Field label="URL"><TextInput type="url" value={r.u} onChange={(ev) => patchAnalysis((a) => { a.refs[i].u = (ev.target as any).value; })} /></Field>
              </Grid2>
              <Grid2>
                <Field label="Category"><TextInput list="refcats-list" value={r.c} onChange={(ev) => patchAnalysis((a) => { a.refs[i].c = (ev.target as any).value; })} /></Field>
                <Field label="Why it's here"><TextInput value={r.d} onChange={(ev) => patchAnalysis((a) => { a.refs[i].d = (ev.target as any).value; })} /></Field>
              </Grid2>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.refs.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <datalist id="refcats-list">{(A?.refcats ?? []).map((c) => <option key={c} value={c} />)}</datalist>
          <AddRow onClick={() => patchAnalysis((a) => { a.refs.push({ n: '', u: '', c: '', d: '' }); })}>+ Reference</AddRow>
        </Panel>
      </SectionHead>

      {/* 12 related episodes */}
      <SectionHead id="s12" num="12" title="Related Episodes" mirror="section 09 · cards">
        <Panel>
          {(A?.related ?? []).map((r, i) => (
            <RepCard key={i} index={i}>
              <Grid2>
                <Field label="Episode">
                  <Select value={r.id} onChange={(ev) => patchAnalysis((a) => { a.related[i].id = (ev.target as any).value; })}>
                    <option value="">(manual)</option>
                    {data.episodes.filter((x) => x.id !== episode.id).map((x) => (
                      <option key={x.id} value={x.id}>{x.no} · {x.title}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Title (if manual)"><TextInput value={r.t} onChange={(ev) => patchAnalysis((a) => { a.related[i].t = (ev.target as any).value; })} /></Field>
              </Grid2>
              <Grid2>
                <Field label="Guest"><TextInput value={r.g} onChange={(ev) => patchAnalysis((a) => { a.related[i].g = (ev.target as any).value; })} /></Field>
                <Field label="One-line"><TextInput value={r.d} onChange={(ev) => patchAnalysis((a) => { a.related[i].d = (ev.target as any).value; })} /></Field>
              </Grid2>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.related.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => patchAnalysis((a) => { a.related.push({ id: '', t: '', g: '', d: '' }); })}>+ Related episode</AddRow>
        </Panel>
      </SectionHead>

      {/* 13 materials */}
      <SectionHead id="s13" num="13" title="Related Links & Material" mirror="section 10 · reference-style list">
        <Panel>
          {(A?.materials ?? []).map((m, i) => (
            <RepCard key={i} index={i}>
              <Grid2>
                <Field label="Title"><TextInput value={m.t} onChange={(ev) => patchAnalysis((a) => { a.materials[i].t = (ev.target as any).value; })} /></Field>
                <Field label="URL"><TextInput type="url" value={m.u} onChange={(ev) => patchAnalysis((a) => { a.materials[i].u = (ev.target as any).value; })} /></Field>
              </Grid2>
              <Grid2>
                <Field label="Short description"><TextInput value={m.d} onChange={(ev) => patchAnalysis((a) => { a.materials[i].d = (ev.target as any).value; })} /></Field>
                <Field label="Category"><TextInput value={m.c} onChange={(ev) => patchAnalysis((a) => { a.materials[i].c = (ev.target as any).value; })} /></Field>
              </Grid2>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.materials.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => patchAnalysis((a) => { a.materials.push({ t: '', d: '', u: '', c: '' }); })}>+ Material</AddRow>
        </Panel>
      </SectionHead>

      {/* 14 transcript */}
      <SectionHead id="s14" num="14" title="Transcript excerpt" mirror="modal · Read the transcript excerpt">
        <Panel>
          <Field label="Transcript note"><TextArea value={A?.txnote ?? ''} onChange={(ev) => patchAnalysis((a) => { a.txnote = (ev.target as any).value; })} /></Field>
          {(A?.tx ?? []).map((line, i) => (
            <RepCard key={i} index={i}>
              <Grid2>
                <Field label="Speaker">
                  <Select value={line[0]} onChange={(ev) => patchAnalysis((a) => { a.tx[i][0] = (ev.target as any).value; })}>
                    <option value="H">Host</option>
                    <option value="G">Guest</option>
                  </Select>
                </Field>
                <div />
              </Grid2>
              <Field label="Line"><TextArea className="min-h-[60px]" value={line[1]} onChange={(ev) => patchAnalysis((a) => { a.tx[i][1] = (ev.target as any).value; })} /></Field>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.tx.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => patchAnalysis((a) => { a.tx.push(['H', '']); })}>+ Line</AddRow>
        </Panel>
      </SectionHead>

      {/* 15 spectacle & record details */}
      <SectionHead id="s15" num="15" title="SPECTACLE & record details" mirror="meta line, SPECTACLE profile, cite box">
        <Panel>
          <Grid3>
            <Field label="Record ID"><TextInput value={A?.meta?.id ?? ''} onChange={(ev) => patchAnalysis((a) => { (a.meta ??= {}).id = (ev.target as any).value; })} /></Field>
            <Field label="Date"><TextInput value={A?.meta?.date ?? ''} onChange={(ev) => patchAnalysis((a) => { (a.meta ??= {}).date = (ev.target as any).value; })} /></Field>
            <Field label="Duration"><TextInput value={A?.meta?.duration ?? ''} onChange={(ev) => patchAnalysis((a) => { (a.meta ??= {}).duration = (ev.target as any).value; })} /></Field>
          </Grid3>
          <Grid2>
            <Field label="Language"><TextInput value={A?.meta?.lang ?? ''} onChange={(ev) => patchAnalysis((a) => { (a.meta ??= {}).lang = (ev.target as any).value; })} /></Field>
            <Field label="Guest role"><TextInput value={A?.meta?.role ?? ''} onChange={(ev) => patchAnalysis((a) => { (a.meta ??= {}).role = (ev.target as any).value; })} /></Field>
          </Grid2>
          <Field label="Citation text"><TextArea value={A?.cite ?? ''} onChange={(ev) => patchAnalysis((a) => { a.cite = (ev.target as any).value; })} /></Field>
          {(A?.spectacle?.domains ?? []).map((d, i) => (
            <RepCard key={i} index={i}>
              <Grid3>
                <Field label="Domain code"><TextInput value={d.code} onChange={(ev) => patchAnalysis((a) => { a.spectacle!.domains[i].code = (ev.target as any).value; })} /></Field>
                <Field label="Bridge score"><TextInput value={String(d.bridge)} onChange={(ev) => patchAnalysis((a) => { const v = Number(String((ev.target as any).value).replace(/<[^>]*>/g, '').trim()); a.spectacle!.domains[i].bridge = isNaN(v) ? 0 : v; })} /></Field>
                <div className="pt-6"><Toggle checked={d.partial} onChange={(v) => patchAnalysis((a) => { a.spectacle!.domains[i].partial = v; })} label="partial" /></div>
              </Grid3>
              <Field label="Hover note"><TextArea className="min-h-[40px]" value={d.hover} onChange={(ev) => patchAnalysis((a) => { a.spectacle!.domains[i].hover = (ev.target as any).value; })} /></Field>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => patchAnalysis((a) => { a.spectacle!.domains.splice(i, 1); })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => patchAnalysis((a) => { (a.spectacle ??= { domains: [] }).domains.push({ code: '', bridge: 0, partial: false, hover: '' }); })}>+ SPECTACLE domain</AddRow>
        </Panel>
      </SectionHead>

      <div className="flex justify-end gap-2 mt-8 pt-6 border-t border-hair">
        {published ? (
          <Btn onClick={setDraft}>Move to draft</Btn>
        ) : (
          <Btn variant="primary" onClick={() => publish(episode)}>Publish</Btn>
        )}
      </div>
    </div>
  );
}
