import { useConsole, loadInbox } from '../store/useConsole'
import { SECDEFS, secState } from '../lib/sections'
import type { ViewName } from '../types'

const NAV: [ViewName, string, string][] = [
  ['dashboard', 'DB', 'Dashboard'],
  ['seasons', 'SE', 'Seasons'],
  ['episodes', 'EP', 'Episodes'],
  ['pages', 'PG', 'Pages'],
  ['inbox', 'IN', 'Inbox'],
  ['settings', 'ST', 'Settings'],
]

export default function Sidebar() {
  const { db, view, editId, go } = useConsole()
  const newCount = loadInbox().filter((m) => m.status === 'new').length
  const editingEp = view === 'editor' && editId ? db.episodes.find((e) => e.id === editId) : null

  return (
    <nav className="hidden md:block bg-card border-r border-hair px-3 py-4 pb-10 sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto thin-scroll">
      <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-faint px-3 pt-2 pb-2">01 · Console</div>
      {NAV.map(([v, k, t]) => (
        <button
          key={v}
          onClick={() => go(v)}
          className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 mb-0.5 border-l-2 transition-colors ${
            view === v ? 'border-l-rust text-ink bg-rust/[0.06]' : 'border-l-transparent text-muted hover:border-l-hair hover:text-ink'
          }`}
        >
          <span className={`font-mono text-[11px] w-6 ${view === v ? 'text-rust font-bold' : 'text-faint'}`}>{k}</span>
          <span className="font-sans text-[13px] font-medium flex-1">{t}</span>
          {v === 'inbox' && newCount > 0 && (
            <span className="font-mono text-[10px] font-bold text-white bg-danger rounded-full px-2 py-0.5">{newCount}</span>
          )}
        </button>
      ))}

      {editingEp && (
        <>
          <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-faint px-3 pt-6 pb-2">02 · Episode record</div>
          {SECDEFS.map(([id, num, title]) => {
            const st = secState(editingEp, id)
            return (
              <button
                key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-full flex items-center gap-2.5 text-left px-3 py-2 mb-0.5 border-l-2 border-l-transparent text-muted hover:border-l-hair hover:text-ink transition-colors"
              >
                <span className="font-mono text-[11px] text-faint w-6">{num}</span>
                <span className="font-sans text-[12px] flex-1">{title}</span>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st === 2 ? 'bg-moss' : st === 1 ? 'bg-amber' : 'bg-hair'}`} />
              </button>
            )
          })}
        </>
      )}
    </nav>
  )
}
