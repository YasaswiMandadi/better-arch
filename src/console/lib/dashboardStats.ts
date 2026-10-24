import type { SiteDB } from '../../data/types'
import { isEpisodePublished, isEssayPublished } from '../../data/types'
import { resolveAnalysis } from '../../data/useEpisodeAnalysis'
import { buildCollaboratorRoster } from '../../data/collaborators'
import { resolveHomeEye } from '../../data/homeEye'
import { collectKeywordRows } from './keywordsAdmin'
import type { ViewName } from '../types'

/**
 * Everything the console Dashboard counts about the site's content, computed from the same
 * data the public site reads (so drafts, analyses and keywords always agree with the pages).
 */

const plain = (h: string) => String(h ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

export interface Split { total: number; published: number; draft: number }
export interface ThemeRow {
  slug: string; no: string; title: string; published: boolean
  episodes: number; episodesDraft: number; essays: number; essaysDraft: number; subThemes: number
}
export interface TopKeyword { slug: string; word: string; total: number; places: number; episodes: number; essays: number; themes: number }
export interface Attention { key: string; count: number; label: string; detail: string; view: ViewName; id?: string }

export interface SiteStats {
  themes: Split & { subThemes: number }
  episodes: Split & { analysed: number }
  essays: Split
  keywords: { unique: number; mentions: number; noGloss: number; top: TopKeyword[] }
  collaborators: { total: number; guests: number; authors: number; investigators: number; noBio: number }
  references: { total: number; episodes: number }
  byTheme: ThemeRow[]
  eye: { custom: boolean; name: string; sizeMB: number; duration: number; uploadedAt: string; highlight: number; extra: number; excluded: number }
  attention: Attention[]
}

const split = <T,>(list: T[], pub: (x: T) => boolean): Split => {
  const published = list.filter(pub).length
  return { total: list.length, published, draft: list.length - published }
}

export function computeSiteStats(data: SiteDB): SiteStats {
  const themePub = (t: { status: string }) => t.status === 'published'
  const analysed = data.episodes.filter((e) => !!resolveAnalysis(e))

  // keywords
  const rows = collectKeywordRows(data)
  const top: TopKeyword[] = rows
    .map((r) => ({
      slug: r.slug, word: r.word, total: r.total, places: r.occ.length,
      episodes: r.occ.filter((o) => o.kind === 'episode').length,
      essays: r.occ.filter((o) => o.kind === 'essay').length,
      themes: r.occ.filter((o) => o.kind === 'theme' || o.kind === 'subtheme').length,
    }))
    .sort((a, b) => b.total - a.total || b.places - a.places || a.word.localeCompare(b.word))
    .slice(0, 10)

  // collaborators (drafts included: this is the admin's view of everyone on record)
  const roster = buildCollaboratorRoster(data, { includeDrafts: true })
  const investigatorSlugs = new Set(data.themes.flatMap((t) => t.investigatorSlugs ?? []))
  const noBio = roster.filter((c) => !plain(c.bio))

  // references
  let refs = 0, refEpisodes = 0
  for (const e of analysed) { const n = resolveAnalysis(e)?.refs?.length ?? 0; refs += n; if (n) refEpisodes++ }

  const byTheme: ThemeRow[] = data.themes.map((t) => {
    const eps = data.episodes.filter((e) => e.season === t.slug)
    const ess = data.essays.filter((e) => e.season === t.slug)
    const epPub = eps.filter(isEpisodePublished).length
    const esPub = ess.filter(isEssayPublished).length
    return {
      slug: t.slug, no: t.no, title: plain(t.title) || '(untitled theme)', published: themePub(t),
      episodes: epPub, episodesDraft: eps.length - epPub, essays: esPub, essaysDraft: ess.length - esPub,
      subThemes: t.subThemes?.length ?? 0,
    }
  })

  const eyeS = resolveHomeEye(data.site.homeEye)
  const eye = {
    custom: !!eyeS.video,
    name: eyeS.video?.name ?? '',
    sizeMB: eyeS.video ? eyeS.video.size / 1048576 : 0,
    duration: eyeS.video?.duration ?? 0,
    uploadedAt: eyeS.video?.uploadedAt ?? '',
    highlight: eyeS.highlightWords.length,
    extra: eyeS.extraWords.length,
    excluded: eyeS.excludeWords.length,
  }

  // things worth a look, most actionable first
  const attention: Attention[] = []
  const themeDrafts = data.themes.filter((t) => !themePub(t))
  const epDrafts = data.episodes.filter((e) => !isEpisodePublished(e))
  const esDrafts = data.essays.filter((e) => !isEssayPublished(e))
  const pubNoAnalysis = data.episodes.filter((e) => isEpisodePublished(e) && !resolveAnalysis(e))
  const emptyThemes = byTheme.filter((t) => t.published && t.episodes === 0 && t.essays === 0)
  const noGloss = rows.filter((r) => !r.gloss)
  const one = (n: number, w: string, ws = `${w}s`) => `${n} ${n === 1 ? w : ws}`
  if (themeDrafts.length) attention.push({ key: 'themeDrafts', count: themeDrafts.length, label: `${one(themeDrafts.length, 'theme')} in draft`, detail: themeDrafts.map((t) => plain(t.title)).slice(0, 3).join(', '), view: 'themes' })
  if (epDrafts.length) attention.push({ key: 'epDrafts', count: epDrafts.length, label: `${one(epDrafts.length, 'episode')} in draft`, detail: epDrafts.map((e) => plain(e.title)).slice(0, 3).join(', '), view: 'episodeAnalysis' })
  if (esDrafts.length) attention.push({ key: 'esDrafts', count: esDrafts.length, label: `${one(esDrafts.length, 'essay')} in draft`, detail: esDrafts.map((e) => plain(e.title)).slice(0, 3).join(', '), view: 'essays' })
  if (pubNoAnalysis.length) attention.push({ key: 'noAnalysis', count: pubNoAnalysis.length, label: `${one(pubNoAnalysis.length, 'published episode')} without an analysis`, detail: pubNoAnalysis.map((e) => plain(e.title)).slice(0, 3).join(', '), view: 'episodeAnalysis' })
  if (emptyThemes.length) attention.push({ key: 'emptyThemes', count: emptyThemes.length, label: `${one(emptyThemes.length, 'published theme')} with no episodes or essays yet`, detail: emptyThemes.map((t) => t.title).slice(0, 3).join(', '), view: 'themes' })
  if (noBio.length) attention.push({ key: 'noBio', count: noBio.length, label: `${one(noBio.length, 'collaborator')} without a bio`, detail: noBio.map((c) => c.name).slice(0, 3).join(', '), view: 'collaborators' })
  if (noGloss.length) attention.push({ key: 'noGloss', count: noGloss.length, label: `${one(noGloss.length, 'keyword')} without a meaning (gloss)`, detail: noGloss.map((r) => r.word).slice(0, 4).join(', '), view: 'keywords' })

  return {
    themes: { ...split(data.themes, themePub), subThemes: data.themes.reduce((n, t) => n + (t.subThemes?.length ?? 0), 0) },
    episodes: { ...split(data.episodes, isEpisodePublished), analysed: analysed.length },
    essays: split(data.essays, isEssayPublished),
    keywords: { unique: rows.length, mentions: rows.reduce((n, r) => n + r.total, 0), noGloss: noGloss.length, top },
    collaborators: {
      total: roster.length,
      guests: roster.filter((c) => c.episodeIds.length).length,
      authors: roster.filter((c) => c.essayIds.length).length,
      investigators: roster.filter((c) => investigatorSlugs.has(c.slug)).length,
      noBio: noBio.length,
    },
    references: { total: refs, episodes: refEpisodes },
    byTheme,
    eye,
    attention,
  }
}

// ---------------------------------------------------------------- messages over time

export type Range = '30d' | '12w' | '12m'
export const RANGES: { id: Range; label: string; unit: string }[] = [
  { id: '30d', label: '30 days', unit: 'day' },
  { id: '12w', label: '12 weeks', unit: 'week' },
  { id: '12m', label: '12 months', unit: 'month' },
]

export interface Bucket { start: number; end: number; label: string; long: string; counts: number[]; total: number }

const DAY = 86400000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

/** Empty buckets for a range, oldest first, ending with the one containing `now` (local time). */
export function makeBuckets(range: Range, now: number, typeCount: number, back = 0): Bucket[] {
  const out: Bucket[] = []
  const zero = () => new Array(typeCount).fill(0)
  if (range === '30d') {
    const today = startOfDay(now)
    for (let i = 29 + back * 30; i >= back * 30; i--) {
      const s = new Date(today); s.setDate(s.getDate() - i)
      const e = new Date(s); e.setDate(e.getDate() + 1)
      out.push({ start: s.getTime(), end: e.getTime(), label: `${s.getDate()} ${MONTHS[s.getMonth()]}`, long: s.toDateString(), counts: zero(), total: 0 })
    }
  } else if (range === '12w') {
    const d = new Date(startOfDay(now))
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
    for (let i = 11 + back * 12; i >= back * 12; i--) {
      const s = new Date(d); s.setDate(s.getDate() - 7 * i)
      const e = new Date(s); e.setDate(e.getDate() + 7)
      const last = new Date(e.getTime() - DAY)
      out.push({ start: s.getTime(), end: e.getTime(), label: `${s.getDate()} ${MONTHS[s.getMonth()]}`, long: `Week of ${s.getDate()} ${MONTHS[s.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`, counts: zero(), total: 0 })
    }
  } else {
    const d = new Date(now)
    for (let i = 11 + back * 12; i >= back * 12; i--) {
      const s = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1)
      out.push({ start: s.getTime(), end: e.getTime(), label: `${MONTHS[s.getMonth()]}${s.getMonth() === 0 || i === 11 + back * 12 ? ` ’${String(s.getFullYear()).slice(2)}` : ''}`, long: `${MONTHS[s.getMonth()]} ${s.getFullYear()}`, counts: zero(), total: 0 })
    }
  }
  return out
}

/** Counts message events ([time, typeIndex, …]) into the range's buckets. */
export function bucketMessages(events: [number, number, number, number][], range: Range, now: number, typeCount: number, back = 0): Bucket[] {
  const buckets = makeBuckets(range, now, typeCount, back)
  if (!buckets.length) return buckets
  const lo = buckets[0].start, hi = buckets[buckets.length - 1].end
  for (const [t, ty] of events) {
    if (t < lo || t >= hi) continue
    // buckets are contiguous: find by binary search
    let a = 0, b = buckets.length - 1
    while (a < b) { const m = (a + b + 1) >> 1; if (buckets[m].start <= t) a = m; else b = m - 1 }
    const k = Math.min(typeCount - 1, Math.max(0, ty))
    buckets[a].counts[k]++
    buckets[a].total++
  }
  return buckets
}

/** "Nice" axis ticks from 0 up to at least max (3–5 ticks, whole numbers). */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1]
  if (max <= 4) return Array.from({ length: max + 1 }, (_, i) => i)
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw && Number.isInteger(s)) ?? Math.ceil(raw)
  const top = Math.ceil(max / step) * step
  const out: number[] = []
  for (let v = 0; v <= top + 1e-9; v += step) out.push(v)
  return out
}
