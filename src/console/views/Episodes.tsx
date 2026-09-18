import { useState } from 'react'
import { useConsole } from '../store/useConsole'
import { blankEp } from '../lib/seed'
import { randId } from '../lib/storage'
import { Btn, Pill, Rich, StatusPill, VHead } from '../components/ui'

export default function Episodes() {
  const { db, setDB, go, toast } = useConsole()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const list = db.episodes.filter((e) => {
    if (filter !== 'all' && e.season !== filter) return false
    if (search && `${e.title} ${e.guest}`.toLowerCase().indexOf(search.toLowerCase()) < 0) return false
    return true
  })

  function addEpisode() {
    const e = blankEp()
    setDB((d) => { d.episodes.unshift(e) })
    go('editor', e.id)
  }
  function duplicate(id: string) {
    setDB((d) => {
      const idx = d.episodes.findIndex((e) => e.id === id)
      const src = d.episodes[idx]
      const cp = JSON.parse(JSON.stringify(src))
      cp.id = randId('ep')
      cp.title = `${src.title} (copy)`
      cp.status = 'draft'
      d.episodes.splice(idx + 1, 0, cp)
    })
    toast('Duplicated.')
  }
  function remove(id: string) {
    const e = db.episodes.find((x) => x.id === id)
    if (!e) return
    if (confirm(`Delete "${e.title || 'untitled'}"? This cannot be undone inside the Console.`)) {
      setDB((d) => { d.episodes.splice(d.episodes.findIndex((x) => x.id === id), 1) })
    }
  }

  return (
    <div>
      <VHead title="Episodes" sub="Every conversation across the seasons. Open a row to edit its full record; the analysis dot goes green when the record carries an analysis payload.">
        <Btn variant="primary" onClick={addEpisode}>+ New episode</Btn>
      </VHead>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
        {db.seasons.map((s) => (
          <Pill key={s.slug} active={filter === s.slug} onClick={() => setFilter(s.slug)}>{s.title}</Pill>
        ))}
        <span className="flex-1" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title / guest…"
          className="bg-card border border-hair rounded px-3 py-2 text-[13.5px] font-sans focus:outline-none focus:border-muted"
        />
      </div>

      <div className="bg-card border border-hair rounded overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-left">
              {['Ep', 'Title', 'Guest', 'Season', 'Status', 'Analysis', ''].map((h) => (
                <th key={h} className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted px-3.5 py-2.5 border-b border-hair bg-ink/[0.02]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length ? list.map((e) => {
              const s = db.seasons.find((x) => x.slug === e.season)
              return (
                <tr key={e.id} className="hover:bg-rust/[0.04] cursor-pointer" onClick={() => go('editor', e.id)}>
                  <td className="px-3.5 py-2.5 border-t border-hair2">{e.no}</td>
                  <td className="px-3.5 py-2.5 border-t border-hair2"><b>{e.title ? <Rich html={e.title} /> : '(untitled)'}</b></td>
                  <td className="px-3.5 py-2.5 border-t border-hair2"><Rich html={e.guest} /></td>
                  <td className="px-3.5 py-2.5 border-t border-hair2">{s?.title}</td>
                  <td className="px-3.5 py-2.5 border-t border-hair2"><StatusPill status={e.status === 'published' ? 'pub' : 'draft'} /></td>
                  <td className="px-3.5 py-2.5 border-t border-hair2"><span className={`inline-block w-2 h-2 rounded-full ${e.analysis ? 'bg-moss' : 'bg-hair'}`} /></td>
                  <td className="px-3.5 py-2.5 border-t border-hair2 whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                    <Btn size="sm" onClick={() => duplicate(e.id)}>Duplicate</Btn>{' '}
                    <Btn size="sm" variant="danger" onClick={() => remove(e.id)}>Delete</Btn>
                  </td>
                </tr>
              )
            }) : (
              <tr><td colSpan={7} className="text-center py-10 text-faint">
                <b className="block font-display text-[16px] text-muted mb-1">Nothing matches.</b>
                Change the filter or the search.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
