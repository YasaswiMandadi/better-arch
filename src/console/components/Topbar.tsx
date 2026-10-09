import { Link } from 'react-router-dom'
import { useConsole } from '../store/useConsole'
import SyncBadge from './SyncBadge'

export default function Topbar() {
  const { go, theme, toggleTheme } = useConsole()

  return (
    <header className="fixed inset-x-0 top-0 h-[60px] z-50 flex items-center gap-3.5 px-4 sm:px-5 bg-ink border-b border-hair">
      <button onClick={() => go('themes')} className="font-display italic font-semibold text-[16px] tracking-tight whitespace-nowrap text-paper">
        BetterArch <span className="text-rust not-italic font-sans font-bold text-[11px] uppercase tracking-[0.14em] align-middle ml-1">Console</span>
      </button>
      <SyncBadge />
      <span className="flex-1" />
      <button onClick={toggleTheme} className="text-[12px] font-sans font-semibold text-paper/80 border border-paper/25 rounded-full px-3 py-1.5 hover:border-rust hover:text-white transition-colors">
        {theme === 'dark' ? '☀ Light' : '● Dark'}
      </button>
      <Link to="/" className="text-[12px] font-sans font-semibold text-paper/80 border border-paper/25 rounded-full px-3 py-1.5 hover:border-rust hover:text-white transition-colors">
        View site ↗
      </Link>
    </header>
  )
}
