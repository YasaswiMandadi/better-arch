import { useConsole } from '../store/useConsole'
import type { ViewName } from '../types'
import { NAV_SECTION } from '../nav'

const SITE: [ViewName, string, string][] = [
  ['homepage', 'HP', 'Home page'],
]

const NAV: [ViewName, string, string][] = [
  ['themes', 'TH', 'Theme Repository'],
  ['essays', 'ES', 'Essay Repository'],
  ['episodeAnalysis', 'EP', 'Episode Repository'],
  ['collaborators', 'CO', 'Collaborator Repository'],
  ['keywords', 'KW', 'Keyword Repository'],
  ['references', 'RF', 'Reference Repository'],
]

export default function Sidebar() {
  const { view, go } = useConsole()
  const current = NAV_SECTION[view] ?? view

  return (
    <nav className="hidden md:block bg-card border-r border-hair px-3 py-4 pb-10 sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto thin-scroll">
      <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-faint px-3 pt-2 pb-2">01 · Site</div>
      {SITE.map(([v, k, t]) => item(v, k, t))}
      <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-faint px-3 pt-5 pb-2">02 · Repositories</div>
      {NAV.map(([v, k, t]) => item(v, k, t))}
    </nav>
  )

  function item(v: ViewName, k: string, t: string) {
    return (
        <button
          key={v}
          onClick={() => go(v)}
          className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 mb-0.5 border-l-2 transition-colors ${
            current === v ? 'border-l-rust text-ink bg-rust/[0.12] font-semibold' : 'border-l-transparent text-muted hover:border-l-hair hover:text-ink hover:bg-ink/[0.04]'
          }`}
        >
          <span className={`font-mono text-[11px] w-6 ${current === v ? 'text-rust font-bold' : 'text-faint'}`}>{k}</span>
          <span className="font-sans text-[13px] font-medium flex-1">{t}</span>
        </button>
    )
  }
}
