import type { EpisodeAnalysis, SiteDB } from '../../data/types'
import { resolveAnalysis } from '../../data/useEpisodeAnalysis'
import { slugify } from '../../lib/slug'

/**
 * Keywords live in four places: an episode's analysis record, an essay, a sub-theme, and a
 * theme's own list. A "keyword" is every entry whose word has the same slug. These helpers
 * read and change all of them together, so the public keyword page always agrees.
 */

export type PlaceKind = 'episode' | 'essay' | 'subtheme' | 'theme'
export interface Place { kind: PlaceKind; id: string; label: string; sub: string }
export interface Occurrence extends Place { word: string; freq: number; gloss: string; typ?: string }
export interface KeywordRow { slug: string; word: string; gloss: string; total: number; occ: Occurrence[] }

type Entry = { word: string; freq: number; gloss?: string; typ?: string; dom?: string }
const plain = (h: string) => h.replace(/<[^>]*>/g, '').trim()

/** Every place that can carry keywords (for the "attach to" pickers). */
export function allPlaces(data: SiteDB): Place[] {
  const out: Place[] = []
  for (const e of data.episodes) out.push({ kind: 'episode', id: e.id, label: plain(e.title) || '(untitled episode)', sub: e.no ? `Ep. ${e.no}` : 'Episode' })
  for (const es of data.essays) out.push({ kind: 'essay', id: es.id, label: es.title || '(untitled essay)', sub: 'Essay' })
  for (const t of data.themes) {
    out.push({ kind: 'theme', id: t.slug, label: plain(t.title), sub: `Theme ${t.no}` })
    for (const st of t.subThemes) out.push({ kind: 'subtheme', id: `${t.slug}/${st.slug}`, label: plain(st.title), sub: `Sub-theme of ${plain(t.title)}` })
  }
  return out
}

/** Read-only list of the keywords at one place (episodes fall back to their built-in record). */
function readList(data: SiteDB, p: Place): Entry[] {
  if (p.kind === 'episode') { const e = data.episodes.find((x) => x.id === p.id); return (e ? resolveAnalysis(e)?.keywords : undefined) ?? [] }
  if (p.kind === 'essay') return data.essays.find((x) => x.id === p.id)?.keywords ?? []
  if (p.kind === 'theme') return data.themes.find((x) => x.slug === p.id)?.keywords ?? []
  const [ts, ss] = p.id.split('/')
  return data.themes.find((x) => x.slug === ts)?.subThemes.find((x) => x.slug === ss)?.keywords ?? []
}

/** The editable list at one place inside an update. An episode using its built-in analysis gets
 * a live copy first (identical content), so the change can be saved. */
function editList(d: SiteDB, kind: PlaceKind, id: string): Entry[] | null {
  if (kind === 'episode') {
    const e = d.episodes.find((x) => x.id === id)
    if (!e) return null
    if (!e.analysisData) {
      const base = resolveAnalysis(e)
      if (!base) return null // no analysis at all: upload a template in the episode editor first
      e.analysisData = structuredClone(base) as EpisodeAnalysis
    }
    return e.analysisData.keywords as Entry[]
  }
  if (kind === 'essay') { const es = d.essays.find((x) => x.id === id); if (!es) return null; return (es.keywords ??= []) }
  if (kind === 'theme') { const t = d.themes.find((x) => x.slug === id); return t ? t.keywords : null }
  const [ts, ss] = id.split('/')
  const st = d.themes.find((x) => x.slug === ts)?.subThemes.find((x) => x.slug === ss)
  if (!st) return null
  return (st.keywords ??= [])
}

/** All keywords on the site, with every place each one appears. */
export function collectKeywordRows(data: SiteDB): KeywordRow[] {
  const map = new Map<string, KeywordRow>()
  for (const p of allPlaces(data)) {
    for (const k of readList(data, p)) {
      const word = plain(String(k.word ?? ''))
      const slug = slugify(word)
      if (!slug) continue
      const row = map.get(slug) ?? { slug, word, gloss: '', total: 0, occ: [] }
      row.occ.push({ ...p, word, freq: Number(k.freq) || 0, gloss: plain(k.gloss ?? ''), typ: k.typ })
      row.total += Number(k.freq) || 0
      if (!row.gloss && k.gloss) row.gloss = plain(k.gloss)
      map.set(slug, row)
    }
  }
  return Array.from(map.values())
}

/** Places whose keyword list can be edited (episodes need an analysis record). */
export function canHoldKeywords(data: SiteDB, p: Place): boolean {
  if (p.kind !== 'episode') return true
  const e = data.episodes.find((x) => x.id === p.id)
  return !!(e && resolveAnalysis(e))
}

function eachList(d: SiteDB, fn: (list: Entry[]) => void) {
  for (const e of d.episodes) if (e.analysisData) fn(e.analysisData.keywords as Entry[])
  for (const e of d.episodes) {
    if (e.analysisData) continue
    const base = resolveAnalysis(e)
    if (!base) continue
    let touched = false
    const copy = structuredClone(base) as EpisodeAnalysis
    const before = JSON.stringify(copy.keywords)
    fn(copy.keywords as Entry[])
    touched = JSON.stringify(copy.keywords) !== before
    if (touched) e.analysisData = copy // only episodes that actually change get a live copy
  }
  for (const es of d.essays) if (es.keywords) fn(es.keywords)
  for (const t of d.themes) {
    fn(t.keywords)
    for (const st of t.subThemes) if (st.keywords) fn(st.keywords)
  }
}

/** Renames a keyword everywhere. If the new word already exists at a place, the two merge (counts add up). */
export function renameKeyword(d: SiteDB, slug: string, newWord: string) {
  const ns = slugify(newWord)
  eachList(d, (list) => {
    const hits = list.filter((k) => slugify(plain(k.word)) === slug)
    if (!hits.length) return
    const target = ns !== slug ? list.find((k) => slugify(plain(k.word)) === ns) : undefined
    for (const h of hits) {
      if (target) {
        target.freq = (Number(target.freq) || 0) + (Number(h.freq) || 0)
        if (!target.gloss && h.gloss) target.gloss = h.gloss
        list.splice(list.indexOf(h), 1)
      } else {
        h.word = newWord
      }
    }
  })
}

/** Sets the short note (gloss) for this keyword at every place. */
export function setGlossEverywhere(d: SiteDB, slug: string, gloss: string) {
  eachList(d, (list) => { for (const k of list) if (slugify(plain(k.word)) === slug) k.gloss = gloss })
}

export function deleteEverywhere(d: SiteDB, slug: string) {
  eachList(d, (list) => {
    for (let i = list.length - 1; i >= 0; i--) if (slugify(plain(list[i].word)) === slug) list.splice(i, 1)
  })
}

export function setCount(d: SiteDB, kind: PlaceKind, id: string, slug: string, freq: number) {
  const list = editList(d, kind, id)
  const k = list?.find((x) => slugify(plain(x.word)) === slug)
  if (k) k.freq = Math.max(1, Math.round(freq) || 1)
}

export function removeFrom(d: SiteDB, kind: PlaceKind, id: string, slug: string) {
  const list = editList(d, kind, id)
  if (!list) return
  for (let i = list.length - 1; i >= 0; i--) if (slugify(plain(list[i].word)) === slug) list.splice(i, 1)
}

/** Adds the keyword to a place (or raises its count if it's already there). Returns false when the place can't hold keywords. */
export function attach(d: SiteDB, kind: PlaceKind, id: string, word: string, freq: number, gloss: string, typ: string): boolean {
  const list = editList(d, kind, id)
  if (!list) return false
  const slug = slugify(word)
  const cur = list.find((k) => slugify(plain(k.word)) === slug)
  if (cur) { cur.freq = (Number(cur.freq) || 0) + Math.max(1, freq); return true }
  const entry: Entry = { word, freq: Math.max(1, Math.round(freq) || 1), gloss }
  if (kind === 'episode') {
    // episode keywords also carry a cluster (colour group in the bubble map)
    const a = d.episodes.find((x) => x.id === id)?.analysisData
    entry.typ = typ || Object.keys(a?.hue ?? {})[0] || ''
  }
  list.push(entry)
  return true
}
