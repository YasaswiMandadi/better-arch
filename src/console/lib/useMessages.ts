import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteMessage, fetchMessages, getToken, markMessages,
  type ContactMessage, type MessageFilter, type MessageStats,
} from '../../data/remote'

const PAGE = 25

export type MessagesStatus = 'off' | 'loading' | 'ready' | 'error'

/** The Contact-page messages saved in the database, for the console Dashboard. */
export function useMessages(enabled: boolean) {
  const [status, setStatus] = useState<MessagesStatus>(enabled ? 'loading' : 'off')
  const [items, setItems] = useState<ContactMessage[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [stats, setStats] = useState<MessageStats | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilterState] = useState<MessageFilter>({})
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const seq = useRef(0)

  const load = useCallback(async (f: MessageFilter, quiet = false) => {
    if (!enabled) { setStatus('off'); return }
    const my = ++seq.current
    if (quiet) setRefreshing(true); else setStatus((s) => (s === 'ready' ? s : 'loading'))
    const r = await fetchMessages(getToken(), null, { ...f, limit: PAGE })
    if (my !== seq.current) return // a newer request replaced this one
    setRefreshing(false)
    if (!r.ok) { setError(r.error); setStatus('error'); return }
    setItems(r.items)
    setNext(r.next)
    if (r.stats) setStats(r.stats)
    setError('')
    setStatus('ready')
  }, [enabled])

  useEffect(() => { void load(filter) }, [load, filter])

  const setFilter = useCallback((f: MessageFilter) => setFilterState(f), [])
  const reload = useCallback(() => load(filter, true), [load, filter])

  const loadMore = useCallback(async () => {
    if (!next || loadingMore) return
    setLoadingMore(true)
    const my = seq.current
    const r = await fetchMessages(getToken(), next, { ...filter, limit: PAGE })
    setLoadingMore(false)
    if (my !== seq.current) return
    if (!r.ok) { setError(r.error); return }
    setItems((cur) => {
      const seen = new Set(cur.map((m) => m.id))
      return [...cur, ...r.items.filter((m) => !seen.has(m.id))]
    })
    setNext(r.next)
  }, [next, loadingMore, filter])

  /** Fresh numbers for the charts after a change (the list itself is updated in place). */
  const refreshStats = useCallback(async () => {
    const r = await fetchMessages(getToken(), null, { limit: 1 })
    if (r.ok && r.stats) setStats(r.stats)
  }, [])

  const mark = useCallback(async (ids: string[] | 'all', read: boolean): Promise<string | null> => {
    const before = items
    setItems((cur) => cur.map((m) => (ids === 'all' || ids.includes(m.id) ? { ...m, read } : m)))
    const err = await markMessages(getToken(), ids, read)
    if (err) { setItems(before); return err }
    // (in the Unread view a message just read stays listed until the next refresh, so it doesn't vanish while open)
    void refreshStats()
    return null
  }, [items, refreshStats])

  const remove = useCallback(async (id: string): Promise<string | null> => {
    const err = await deleteMessage(getToken(), id)
    if (err && !/already deleted/i.test(err)) return err
    setItems((cur) => cur.filter((m) => m.id !== id))
    void refreshStats()
    return null
  }, [refreshStats])

  return { status, items, next, stats, error, filter, setFilter, reload, loadMore, loadingMore, refreshing, mark, remove }
}
