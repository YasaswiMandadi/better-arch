import { useConsole } from '../store/useConsole'
import type { ViewName } from '../types'

const NAV: [ViewName, string, string][] = [
  ['themes', 'TH', 'Theme Repository'],
  ['episodeAnalysis', 'EA', 'Episode Analysis'],
]

export default function Sidebar() {
  const { view, go } = useConsole()

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
        </button>
      ))}

    </nav>
  )
}
