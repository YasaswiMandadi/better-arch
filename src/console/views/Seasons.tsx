import { useConsole } from '../store/useConsole'
import { Btn, Field, Grid3, Panel, Rich, StatusPill, TextArea, TextInput, VHead } from '../components/ui'

export default function Seasons() {
  const { db, setDB, toast } = useConsole()

  function update(i: number, key: string, value: string) {
    setDB((d) => { (d.seasons[i] as any)[key] = value })
  }
  function move(i: number, dir: -1 | 1) {
    setDB((d) => {
      const j = i + dir
      const t = d.seasons[i]; d.seasons[i] = d.seasons[j]; d.seasons[j] = t
    })
  }
  function remove(i: number) {
    const s = db.seasons[i]
    const used = db.episodes.filter((e) => e.season === s.slug).length
    if (used) { toast(`Move its ${used} episode(s) to another season first.`); return }
    if (confirm(`Delete season "${s.title}"?`)) setDB((d) => { d.seasons.splice(i, 1) })
  }
  function add() {
    setDB((d) => {
      d.seasons.push({ slug: `new-season-${d.seasons.length + 1}`, no: `S${d.seasons.length + 1}`, title: 'New Season', period: '', status: 'draft', one: '' })
    })
  }

  return (
    <div>
      <VHead title="Seasons" sub="The four projects of BetterArch.org; every episode belongs to one. These render as the Projects menu and the project pages on the public site.">
        <Btn variant="primary" onClick={add}>+ Add season</Btn>
      </VHead>

      {db.seasons.map((s, i) => {
        const count = db.episodes.filter((e) => e.season === s.slug).length
        return (
          <Panel key={s.slug}>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="font-mono text-[13px] font-semibold text-rust bg-rust/[0.08] rounded-full px-2.5 py-1">{s.no}</span>
              <b className="font-display italic font-medium text-[17px]"><Rich html={s.title} /></b>
              <StatusPill status="pub" >{count} episode{count === 1 ? '' : 's'}</StatusPill>
              <span className="flex-1" />
              {i > 0 && <Btn size="sm" onClick={() => move(i, -1)}>↑</Btn>}
              {i < db.seasons.length - 1 && <Btn size="sm" onClick={() => move(i, 1)}>↓</Btn>}
              <Btn size="sm" variant="danger" onClick={() => remove(i)}>Delete</Btn>
            </div>
            <Grid3>
              <Field label="Label"><TextInput value={s.no} onChange={(e) => update(i, 'no', e.target.value)} /></Field>
              <Field label="Title"><TextInput value={s.title} onChange={(e) => update(i, 'title', e.target.value)} /></Field>
              <Field label="Slug (URL)"><TextInput value={s.slug} onChange={(e) => update(i, 'slug', e.target.value)} /></Field>
            </Grid3>
            <Grid3>
              <Field label="Period"><TextInput value={s.period} onChange={(e) => update(i, 'period', e.target.value)} /></Field>
              <div className="sm:col-span-2">
                <Field label="Status line"><TextInput value={s.status} onChange={(e) => update(i, 'status', e.target.value)} /></Field>
              </div>
            </Grid3>
            <Field label="One-line description">
              <TextArea value={s.one} onChange={(e) => update(i, 'one', e.target.value)} style={{ minHeight: 64 }} />
            </Field>
          </Panel>
        )
      })}
    </div>
  )
}
