import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { DB, InboxMessage, ViewName } from '../types'
import { seedDB } from '../lib/seed'
import { Store } from '../lib/storage'

const DB_KEY = 'ba-console-db'
const INBOX_KEY = 'ba-inbox'
const THEME_KEY = 'ba-console-theme'

function loadDB(): DB {
  const raw = Store.get(DB_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as DB
    } catch {
      /* fall through to seed */
    }
  }
  return seedDB()
}

export function loadInbox(): InboxMessage[] {
  try {
    return JSON.parse(Store.get(INBOX_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveInbox(v: InboxMessage[]) {
  Store.set(INBOX_KEY, JSON.stringify(v))
}

export interface ConsoleState {
  db: DB
  setDB: (updater: (d: DB) => void) => void
  dirty: boolean
  saveNow: () => void
  view: ViewName
  editId: string | null
  go: (view: ViewName, id?: string) => void
  toast: (msg: string) => void
  toastMsg: string | null
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export function useConsoleState(): ConsoleState {
  const [db, setDbRaw] = useState<DB>(() => loadDB())
  const [dirty, setDirty] = useState(false)
  const [view, setView] = useState<ViewName>('dashboard')
  const [editId, setEditId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (Store.get(THEME_KEY) as 'light' | 'dark') || 'light')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    Store.set(THEME_KEY, theme)
  }, [theme])

  const saveNow = useCallback(() => {
    setDbRaw((cur) => {
      const next = { ...cur, meta: { ...cur.meta, updated: new Date().toISOString() } }
      Store.set(DB_KEY, JSON.stringify(next))
      return next
    })
    setDirty(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  const setDB = useCallback((updater: (d: DB) => void) => {
    setDbRaw((cur) => {
      // structuredClone keeps this a pure, immutable-from-outside update
      const next = structuredClone(cur)
      updater(next)
      return next
    })
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setDbRaw((cur) => {
        Store.set(DB_KEY, JSON.stringify(cur))
        return cur
      })
      setDirty(false)
    }, 900)
  }, [])

  const go = useCallback((v: ViewName, id?: string) => {
    setView(v)
    if (id !== undefined) setEditId(id)
    window.scrollTo(0, 0)
  }, [])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveNow()
        toast('Saved.')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [saveNow, toast])

  return { db, setDB, dirty, saveNow, view, editId, go, toast, toastMsg, theme, toggleTheme }
}

export const ConsoleContext = createContext<ConsoleState | null>(null)

export function useConsole(): ConsoleState {
  const ctx = useContext(ConsoleContext)
  if (!ctx) throw new Error('useConsole must be used within ConsoleContext')
  return ctx
}
