import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useConsole } from '../store/useConsole'
import SyncBadge from './SyncBadge'

export default function Topbar() {
  const { db, setDB, dirty, saveNow, go, toast, theme, toggleTheme } = useConsole()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    saveNow()
    const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `betterarch-console-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    toast('Console database exported.')
  }

  function handleImportFile(f: File) {
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const d = JSON.parse(String(rd.result))
        if (!d.seasons || !d.episodes) throw new Error('shape')
        setDB((cur) => Object.assign(cur, d))
        saveNow()
        go('dashboard')
        toast('Imported.')
      } catch {
        toast('Not a Console JSON file.')
      }
    }
    rd.readAsText(f)
  }

  return (
    <header className="fixed inset-x-0 top-0 h-[60px] z-50 flex items-center gap-3.5 px-4 sm:px-5 bg-ink border-b border-hair">
      <button onClick={() => go('dashboard')} className="font-display italic font-semibold text-[16px] tracking-tight whitespace-nowrap text-paper">
        BetterArch <span className="text-rust not-italic font-sans font-bold text-[11px] uppercase tracking-[0.14em] align-middle ml-1">Console</span>
      </button>
      <span className="hidden sm:inline-flex items-center gap-2 font-mono text-[11px] text-paper/50">
        <span className={`w-1.5 h-1.5 rounded-full ${dirty ? 'bg-amber' : 'bg-moss'}`} />
        {dirty ? 'Unsaved' : 'Saved'}
      </span>
      <SyncBadge />
      <span className="flex-1" />
      <span className="hidden md:inline font-mono text-[10.5px] text-paper/40">
        save <kbd className="font-mono text-[10px] border border-paper/20 border-b-2 rounded px-1 text-paper/60">Ctrl</kbd>+<kbd className="font-mono text-[10px] border border-paper/20 border-b-2 rounded px-1 text-paper/60">S</kbd>
      </span>
      <button onClick={handleExport} className="text-[12px] font-sans font-semibold text-paper/80 border border-paper/25 rounded-full px-3 py-1.5 hover:border-rust hover:text-white transition-colors">Export JSON</button>
      <button onClick={() => fileRef.current?.click()} className="text-[12px] font-sans font-semibold text-paper/80 border border-paper/25 rounded-full px-3 py-1.5 hover:border-rust hover:text-white transition-colors">Import</button>
      <input
        ref={fileRef} type="file" accept="application/json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.currentTarget.value = '' }}
      />
      <button onClick={toggleTheme} className="text-[12px] font-sans font-semibold text-paper/80 border border-paper/25 rounded-full px-3 py-1.5 hover:border-rust hover:text-white transition-colors">
        {theme === 'dark' ? '☀ Light' : '● Dark'}
      </button>
      <Link to="/" className="text-[12px] font-sans font-semibold text-paper/80 border border-paper/25 rounded-full px-3 py-1.5 hover:border-rust hover:text-white transition-colors">
        View site ↗
      </Link>
    </header>
  )
}
