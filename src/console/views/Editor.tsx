import { useEffect, useRef, useState } from 'react'
import { useConsole } from '../store/useConsole'
import type { Episode, SectionToggles } from '../types'
import { QCATS_DEFAULT } from '../lib/seed'
import SectionHead from '../components/SectionHead'
import {
  AddRow, Btn, Chip, Field, Grid2, Grid3, Panel, RepCard, Rich, Select, SlRow, TextArea, TextInput, VHead,
} from '../components/ui'

export default function Editor() {
  const { db, setDB, editId, go, toast } = useConsole()
  const e = db.episodes.find((x) => x.id === editId)
  const [tagDraft, setTagDraft] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!e) go('episodes') }, [e, go])
  if (!e) return null

  const season = db.seasons.find((s) => s.slug === e.season)

  function mutate(fn: (ep: Episode) => void) {
    setDB((d) => {
      const ep = d.episodes.find((x) => x.id === editId)
      if (ep) fn(ep)
    })
  }
  function toggleSection(key: keyof SectionToggles, v: boolean) {
    mutate((ep) => { ep.on[key] = v })
  }

  function parsePipeline(html: string) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const got: string[] = []
      mutate((ep) => {
        const h1 = doc.querySelector('h1')
        if (h1 && !ep.title) { ep.title = h1.textContent?.trim() || ''; got.push('title') }
        const sub = doc.querySelector('.sub')
        if (sub && !ep.sub) { ep.sub = sub.textContent?.trim() || ''; got.push('subtitle') }
        const eye = doc.querySelector('.eyebrow')
        if (eye && !ep.eyebrow) { ep.eyebrow = eye.textContent?.trim() || ''; got.push('eyebrow') }
        const bio = doc.querySelector('.bio')
        if (bio && !ep.bio) { ep.bio = bio.textContent?.trim() || ''; got.push('bio') }
        if (!ep.reading) {
          const ps = doc.querySelectorAll('.read p')
          if (ps.length) {
            ep.reading = Array.from(ps).map((p) => p.textContent?.trim() || '').join('\n\n')
            got.push(`reading (${ps.length} paras)`)
          }
        }
        if (!ep.tags.length) {
          doc.querySelectorAll('.tag').forEach((t) => ep.tags.push(t.textContent?.trim() || ''))
          if (ep.tags.length) got.push('tags')
        }
      })
      // toast handled below via timeout since mutate is async-ish but state updates synchronously enough
      setTimeout(() => alertToast(got), 0)
    } catch {
      setTimeout(() => alertToast(null), 0)
    }
  }
  function alertToast(got: string[] | null) {
    if (got === null) toast('Could not parse that file.')
    else if (got.length) toast(`Pulled: ${got.join(', ')}.`)
    else toast('Nothing new to pull; existing fields were kept.')
  }

  const present = e.sentiments.filter((s) => s.present).length
  const xmean = e.compass.ind.reduce((a, x) => a + x.score, 0) / e.compass.ind.length

  return (
    <div>
      <VHead title={e.title ? <Rich html={e.title} /> : 'New episode'} sub={`${season?.title || ''} · Ep. ${e.no || '–'} · record ${e.id}`}>
        <label className="inline-flex items-center gap-2 mr-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-muted cursor-pointer select-none">
          <input type="checkbox" checked={e.analysis} onChange={(ev) => mutate((ep) => { ep.analysis = ev.target.checked })} className="sr-only peer" />
          <span className="w-9 h-5 rounded-full bg-hair relative transition-colors peer-checked:bg-moss after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-4" />
          analysis live
        </label>
        <Select value={e.status} onChange={(ev) => mutate((ep) => { ep.status = ev.target.value as Episode['status'] })} className="w-auto">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
        <Btn onClick={() => go('episodes')}>← Episodes</Btn>
      </VHead>

      {/* 00 auto-populate */}
      <SectionHead id="s00" num="00" title="Auto-populate from pipeline HTML" mirror="fills 01, 03–10">
        <Panel>
          <div
            onDragOver={(ev) => { ev.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(ev) => {
              ev.preventDefault(); setDragOver(false)
              const f = ev.dataTransfer.files[0]; if (!f) return
              const rd = new FileReader(); rd.onload = () => parsePipeline(String(rd.result)); rd.readAsText(f)
            }}
            className={`border-2 border-dashed rounded p-7 text-center text-muted text-[14px] transition-colors ${dragOver ? 'border-rust text-ink' : 'border-hair'}`}
          >
            Drop an AXM pipeline HTML here, or{' '}
            <Btn size="sm" onClick={() => fileRef.current?.click()}>choose a file</Btn>, and the Console pulls the title, subtitle,
            eyebrow and reading into this record.
            <input ref={fileRef} type="file" accept="text/html" className="hidden" onChange={(ev) => {
              const f = ev.target.files?.[0]; if (!f) return
              const rd = new FileReader(); rd.onload = () => parsePipeline(String(rd.result)); rd.readAsText(f)
              ev.currentTarget.value = ''
            }} />
          </div>
          <p className="text-[13px] text-faint mt-2.5">Parsing is deliberately conservative: it never overwrites a field that already has content.</p>
        </Panel>
      </SectionHead>

      {/* 01 identity */}
      <SectionHead id="s01" num="01" title="Identity & hero" mirror="eyebrow, h1, sub, bio, tags, player, stats">
        <Panel>
          <Grid3>
            <Field label="Season">
              <Select value={e.season} onChange={(ev) => mutate((ep) => { ep.season = ev.target.value })}>
                {db.seasons.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
              </Select>
            </Field>
            <Field label="Episode no."><TextInput value={e.no} onChange={(ev) => mutate((ep) => { ep.no = ev.target.value })} /></Field>
            <Field label="Guest"><TextInput value={e.guest} onChange={(ev) => mutate((ep) => { ep.guest = ev.target.value })} /></Field>
          </Grid3>
          <Field label="Title"><TextInput value={e.title} onChange={(ev) => mutate((ep) => { ep.title = ev.target.value })} /></Field>
          <Field label="Subtitle / one-line"><TextInput value={e.sub} onChange={(ev) => mutate((ep) => { ep.sub = ev.target.value })} /></Field>
          <Field label="Eyebrow" hint="e.g. Architecture X Media Studies · Ep. 01 · Season opener">
            <TextInput value={e.eyebrow} onChange={(ev) => mutate((ep) => { ep.eyebrow = ev.target.value })} />
          </Field>
          <Field label="Guest bio (hero card)"><TextArea value={e.bio} onChange={(ev) => mutate((ep) => { ep.bio = ev.target.value })} /></Field>
          <Field label="Tags">
            <div className="flex flex-wrap gap-2 bg-paper border border-hair rounded p-2">
              {e.tags.map((t, i) => (
                <Chip key={i} onRemove={() => mutate((ep) => { ep.tags.splice(i, 1) })}>{t}</Chip>
              ))}
              <input
                value={tagDraft} onChange={(ev) => setTagDraft(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' && tagDraft.trim()) {
                    mutate((ep) => { ep.tags.push(tagDraft.trim()) }); setTagDraft('')
                  }
                }}
                placeholder="add tag, press Enter"
                className="flex-1 min-w-[120px] bg-transparent outline-none text-[13.5px] font-sans px-1 py-1"
              />
            </div>
          </Field>
          <Field label="Spotify episode URL"><TextInput type="url" value={e.url} onChange={(ev) => mutate((ep) => { ep.url = ev.target.value })} /></Field>
          <p className="text-[13px] text-faint">At-a-glance stats compute on the public page from the record: sentiments present, keywords mapped, references named, themes.</p>
        </Panel>
      </SectionHead>

      {/* 02 transcript */}
      <SectionHead id="s02" num="02" title="Corrected transcript" mirror="transcript overlay" on={e.on.s02} onToggle={(v) => toggleSection('s02', v)}>
        <Panel>
          <Grid2>
            <Field label="Guest display name"><TextInput value={e.guestName} onChange={(ev) => mutate((ep) => { ep.guestName = ev.target.value })} /></Field>
            <Field label="Host display name"><TextInput value="Shubhayan M" disabled /></Field>
          </Grid2>
          <Field label="Corrected transcript" hint={e.transcript ? `${e.transcript.split(/\n+/).filter(Boolean).length} turns held.` : 'Empty. The public page shows its honest pending state until this attaches.'}>
            <TextArea
              className="font-mono min-h-[200px]"
              placeholder={'H: …\nG: … (one turn per line, H:/G: prefixes)'}
              value={e.transcript} onChange={(ev) => mutate((ep) => { ep.transcript = ev.target.value })}
            />
          </Field>
        </Panel>
      </SectionHead>

      {/* 03 reading */}
      <SectionHead id="s03" num="03" title="A Reading of the Conversation" mirror="section 01 · drop-cap prose" on={e.on.s03} onToggle={(v) => toggleSection('s03', v)}>
        <Panel>
          <Field label="Reading" hint={e.reading ? `${e.reading.split(/\n\s*\n/).filter(Boolean).length} paragraph(s).` : 'Empty.'}>
            <TextArea className="min-h-[220px]" value={e.reading} onChange={(ev) => mutate((ep) => { ep.reading = ev.target.value })} />
          </Field>
        </Panel>
      </SectionHead>

      {/* 04 lexical / keywords */}
      <SectionHead id="s04" num="04" title="Lexical Terrain" mirror="section 02 · bubble map" on={e.on.s04} onToggle={(v) => toggleSection('s04', v)}>
        <Panel>
          {e.keywords.map((k, i) => (
            <RepCard key={i} index={i}>
              <Grid3>
                <Field label="Word"><TextInput value={k.word} onChange={(ev) => mutate((ep) => { ep.keywords[i].word = ev.target.value })} /></Field>
                <Field label="Typology / zone"><TextInput value={k.typ} onChange={(ev) => mutate((ep) => { ep.keywords[i].typ = ev.target.value })} /></Field>
                <Field label="Frequency"><TextInput type="number" min={1} value={k.freq} onChange={(ev) => mutate((ep) => { ep.keywords[i].freq = +ev.target.value })} /></Field>
              </Grid3>
              <Field label="Gloss (hover text)"><TextInput value={k.gloss} onChange={(ev) => mutate((ep) => { ep.keywords[i].gloss = ev.target.value })} /></Field>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => mutate((ep) => { ep.keywords.splice(i, 1) })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => mutate((ep) => { ep.keywords.push({ word: '', typ: '', freq: 1, gloss: '' }) })}>+ Keyword</AddRow>
          <p className="text-[13px] text-faint mt-2.5">Zone hues assign on the public page in order of first appearance: terracotta, plum, indigo, teal, olive. Hold &lsquo;architecture&rsquo; and &lsquo;media&rsquo; out of the count.</p>
        </Panel>
      </SectionHead>

      {/* 05 themes */}
      <SectionHead id="s05" num="05" title="Key Themes" mirror="section 03 · numbered cards" on={e.on.s05} onToggle={(v) => toggleSection('s05', v)}>
        <Panel>
          {e.themes.map((t, i) => (
            <RepCard key={i} index={i}>
              <Field label="Theme title"><TextInput value={t.t} onChange={(ev) => mutate((ep) => { ep.themes[i].t = ev.target.value })} /></Field>
              <Field label="Paragraph 1"><TextArea className="min-h-[70px]" value={t.p1} onChange={(ev) => mutate((ep) => { ep.themes[i].p1 = ev.target.value })} /></Field>
              <Field label="Paragraph 2"><TextArea className="min-h-[70px]" value={t.p2} onChange={(ev) => mutate((ep) => { ep.themes[i].p2 = ev.target.value })} /></Field>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => mutate((ep) => { ep.themes.splice(i, 1) })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => mutate((ep) => { ep.themes.push({ t: '', p1: '', p2: '' }) })}>+ Theme</AddRow>
          <p className="text-[13px] text-faint mt-2.5">3 to 9 themes; the count is conversation-driven, never fixed.</p>
        </Panel>
      </SectionHead>

      {/* 06 key phrases */}
      <SectionHead id="s06" num="06" title="Key Phrases" mirror="section 04 · flagged cards with readings" on={e.on.s06} onToggle={(v) => toggleSection('s06', v)}>
        <Panel>
          {e.phrases.map((p, i) => (
            <RepCard key={i} index={i}>
              <Field label="Context before"><TextArea className="min-h-[52px]" value={p.ctx1} onChange={(ev) => mutate((ep) => { ep.phrases[i].ctx1 = ev.target.value })} /></Field>
              <Field label="The phrase (highlighted, verbatim)"><TextArea className="min-h-[52px]" value={p.main} onChange={(ev) => mutate((ep) => { ep.phrases[i].main = ev.target.value })} /></Field>
              <Field label="Context after"><TextArea className="min-h-[52px]" value={p.ctx2} onChange={(ev) => mutate((ep) => { ep.phrases[i].ctx2 = ev.target.value })} /></Field>
              <Grid2>
                <Field label="Reading"><TextArea className="min-h-[52px]" value={p.read} onChange={(ev) => mutate((ep) => { ep.phrases[i].read = ev.target.value })} /></Field>
                <Field label="Category / theme tag"><TextInput value={p.cat} onChange={(ev) => mutate((ep) => { ep.phrases[i].cat = ev.target.value })} /></Field>
              </Grid2>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => mutate((ep) => { ep.phrases.splice(i, 1) })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => mutate((ep) => { ep.phrases.push({ ctx1: '', main: '', ctx2: '', read: '', cat: '' }) })}>+ Key phrase</AddRow>
        </Panel>
      </SectionHead>

      {/* 07 lived */}
      <SectionHead id="s07" num="07" title="Lived Experience" mirror="section 05 · single-card prose" on={e.on.s07} onToggle={(v) => toggleSection('s07', v)}>
        <Panel>
          <Field label="Lived experience analysis (one continuous paragraph)">
            <TextArea className="min-h-[150px]" value={e.lived} onChange={(ev) => mutate((ep) => { ep.lived = ev.target.value })} />
          </Field>
        </Panel>
      </SectionHead>

      {/* 08 quotes */}
      <SectionHead id="s08" num="08" title="Verbatim Quotes" mirror="section 04 · the canonical card list" on={e.on.s08} onToggle={(v) => toggleSection('s08', v)}>
        <Panel>
          {e.quotes.map((q, i) => (
            <RepCard key={i} index={i}>
              <Field label="Context before"><TextArea className="min-h-[52px]" value={q.ctx1} onChange={(ev) => mutate((ep) => { ep.quotes[i].ctx1 = ev.target.value })} /></Field>
              <Field label="The quote (highlighted, verbatim)"><TextArea className="min-h-[52px]" value={q.main} onChange={(ev) => mutate((ep) => { ep.quotes[i].main = ev.target.value })} /></Field>
              <Field label="Context after"><TextArea className="min-h-[52px]" value={q.ctx2} onChange={(ev) => mutate((ep) => { ep.quotes[i].ctx2 = ev.target.value })} /></Field>
              <Grid2>
                <Field label="Category / theme tag"><TextInput value={q.cat} onChange={(ev) => mutate((ep) => { ep.quotes[i].cat = ev.target.value })} /></Field>
                <Field label="Flag">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-sans text-[13px] mt-1.5">
                    <input type="checkbox" checked={q.kp} onChange={(ev) => mutate((ep) => { ep.quotes[i].kp = ev.target.checked })} className="sr-only peer" />
                    <span className="w-9 h-5 rounded-full bg-hair relative transition-colors peer-checked:bg-moss after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-4" />
                    key phrase
                  </label>
                </Field>
              </Grid2>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => mutate((ep) => { ep.quotes.splice(i, 1) })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => mutate((ep) => { ep.quotes.push({ ctx1: '', main: '', ctx2: '', cat: '', kp: false }) })}>+ Quote</AddRow>
          <p className="text-[13px] text-faint mt-2.5">The public page renders one canonical list; its pills filter by category and by the key-phrase flag. Cards flagged key phrase also surface in section 06 with their readings.</p>
        </Panel>
      </SectionHead>

      {/* 09 sentiment */}
      <SectionHead id="s09" num="09" title="Sentiment Register" mirror="section 06 · 18-axis spider" on={e.on.s09} onToggle={(v) => toggleSection('s09', v)}>
        <Panel>
          <Field label="Register prose"><TextArea className="min-h-[80px]" value={e.sentprose} onChange={(ev) => mutate((ep) => { ep.sentprose = ev.target.value })} /></Field>
          <p className="text-[13px] text-faint mb-2.5">{present} of 18 confirmed present. Score only what the corrected transcript confirms; absent registers never default to 50, they simply do not render.</p>
          {e.sentiments.map((sn, i) => (
            <div key={sn.code}>
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-1">
                <div className="font-sans text-[13.5px]">{sn.full}<small className="block font-mono text-[11px] text-faint">{sn.code}</small></div>
                <label className="inline-flex items-center cursor-pointer" title="present">
                  <input type="checkbox" checked={sn.present} onChange={(ev) => mutate((ep) => { ep.sentiments[i].present = ev.target.checked })} className="sr-only peer" />
                  <span className="w-9 h-5 rounded-full bg-hair relative transition-colors peer-checked:bg-moss after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
              <SlRow label="" value={sn.score} disabled={!sn.present} onChange={(v) => mutate((ep) => { ep.sentiments[i].score = v })} />
              <div className="mb-2.5">
                <TextInput placeholder="reading…" disabled={!sn.present} value={sn.reading} onChange={(ev) => mutate((ep) => { ep.sentiments[i].reading = ev.target.value })} />
              </div>
            </div>
          ))}
        </Panel>
      </SectionHead>

      {/* 10 criticality */}
      <SectionHead id="s10" num="10" title="Criticality Register" mirror="section 07 · compass" on={e.on.s10} onToggle={(v) => toggleSection('s10', v)}>
        <Panel>
          {e.compass.ind.map((x, i) => (
            <div key={x.code}>
              <SlRow label={`${x.code} · ${x.label}`} value={x.score} onChange={(v) => mutate((ep) => { ep.compass.ind[i].score = v })} />
              <div className="mb-2.5">
                <TextInput placeholder="basis…" value={x.note} onChange={(ev) => mutate((ep) => { ep.compass.ind[i].note = ev.target.value })} />
              </div>
            </div>
          ))}
          <Grid3>
            <Field label="x · resource allocation (auto)"><TextInput value={xmean.toFixed(1)} disabled /></Field>
            <Field label="y · critical autonomy">
              <TextInput type="number" min={0} max={100} step={0.5} value={e.compass.y} onChange={(ev) => mutate((ep) => { ep.compass.y = +ev.target.value })} />
            </Field>
            <Field label="Quadrant (auto)"><TextInput value={`${xmean < 50 ? 'independent' : 'resourced'} · ${e.compass.y >= 50 ? 'critical' : 'affirmative'}`} disabled /></Field>
          </Grid3>
          <Field label="Compass prose"><TextArea className="min-h-[90px]" value={e.compass.prose} onChange={(ev) => mutate((ep) => { ep.compass.prose = ev.target.value })} /></Field>
        </Panel>
      </SectionHead>

      {/* 11 references */}
      <SectionHead id="s11" num="11" title="References" mirror="section 08 · tabbed table" on={e.on.s11} onToggle={(v) => toggleSection('s11', v)}>
        <Panel>
          {e.refs.map((r, i) => (
            <RepCard key={i} index={i}>
              <Grid2>
                <Field label="Name"><TextInput value={r.n} onChange={(ev) => mutate((ep) => { ep.refs[i].n = ev.target.value })} /></Field>
                <Field label="URL"><TextInput type="url" value={r.u} onChange={(ev) => mutate((ep) => { ep.refs[i].u = ev.target.value })} /></Field>
              </Grid2>
              <Grid2>
                <Field label="Category">
                  <TextInput list="refcats" value={r.c} onChange={(ev) => mutate((ep) => { ep.refs[i].c = ev.target.value })} />
                </Field>
                <Field label="Why it is here"><TextInput value={r.d} onChange={(ev) => mutate((ep) => { ep.refs[i].d = ev.target.value })} /></Field>
              </Grid2>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => mutate((ep) => { ep.refs.splice(i, 1) })}>Remove</Btn></div>
            </RepCard>
          ))}
          <datalist id="refcats">{QCATS_DEFAULT.map((c) => <option key={c} value={c} />)}</datalist>
          <AddRow onClick={() => mutate((ep) => { ep.refs.push({ n: '', u: '', c: '', d: '' }) })}>+ Reference</AddRow>
          <p className="text-[13px] text-faint mt-2.5">Knowledge Network rows draw from the v5 spine of 53 sources; keep their category set to &lsquo;Knowledge Network&rsquo; so they tab separately.</p>
        </Panel>
      </SectionHead>

      {/* 12 related episodes */}
      <SectionHead id="s12" num="12" title="Related Episodes" mirror="section 09 · cards" on={e.on.s12} onToggle={(v) => toggleSection('s12', v)}>
        <Panel>
          {e.related.map((r, i) => (
            <RepCard key={i} index={i}>
              <Grid2>
                <Field label="Episode">
                  <Select value={r.id} onChange={(ev) => mutate((ep) => { ep.related[i].id = ev.target.value })}>
                    <option value="">(manual)</option>
                    {db.episodes.filter((x) => x.id !== e.id).map((x) => (
                      <option key={x.id} value={x.id}>{x.no} · {x.title}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Title (if manual)"><TextInput value={r.t} onChange={(ev) => mutate((ep) => { ep.related[i].t = ev.target.value })} /></Field>
              </Grid2>
              <Grid2>
                <Field label="Guest"><TextInput value={r.g} onChange={(ev) => mutate((ep) => { ep.related[i].g = ev.target.value })} /></Field>
                <Field label="One-line"><TextInput value={r.d} onChange={(ev) => mutate((ep) => { ep.related[i].d = ev.target.value })} /></Field>
              </Grid2>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => mutate((ep) => { ep.related.splice(i, 1) })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => mutate((ep) => { ep.related.push({ id: '', t: '', g: '', d: '' }) })}>+ Related episode</AddRow>
        </Panel>
      </SectionHead>

      {/* 13 materials */}
      <SectionHead id="s13" num="13" title="Related Links & Material" mirror="section 10 · reference-style list" on={e.on.s13} onToggle={(v) => toggleSection('s13', v)}>
        <Panel>
          {e.materials.map((m, i) => (
            <RepCard key={i} index={i}>
              <Grid2>
                <Field label="Title"><TextInput value={m.t} onChange={(ev) => mutate((ep) => { ep.materials[i].t = ev.target.value })} /></Field>
                <Field label="URL"><TextInput type="url" value={m.u} onChange={(ev) => mutate((ep) => { ep.materials[i].u = ev.target.value })} /></Field>
              </Grid2>
              <Grid2>
                <Field label="Short description"><TextInput value={m.d} onChange={(ev) => mutate((ep) => { ep.materials[i].d = ev.target.value })} /></Field>
                <Field label="Category"><TextInput value={m.c} onChange={(ev) => mutate((ep) => { ep.materials[i].c = ev.target.value })} /></Field>
              </Grid2>
              <div className="flex justify-end"><Btn size="sm" variant="danger" onClick={() => mutate((ep) => { ep.materials.splice(i, 1) })}>Remove</Btn></div>
            </RepCard>
          ))}
          <AddRow onClick={() => mutate((ep) => { ep.materials.push({ t: '', d: '', u: '', c: '' }) })}>+ Material</AddRow>
        </Panel>
      </SectionHead>
    </div>
  )
}
