import type { Compass, DB, Episode, Sentiment, CompassIndicator, Theme, Quote, Reference, RelatedEpisode, Material } from '../types'
import { randId } from './storage'
import { DB as SITE } from '../../data/db'
import { EP01 } from '../../data/ep01'

export const S18: [string, string][] = [
  ['S01', 'Pessimism ↔ Optimism'], ['S02', 'Fatalism ↔ Agency'], ['S03', 'Patience ↔ Urgency'],
  ['S04', 'Anger ↔ Equanimity'], ['S05', 'Nostalgia ↔ Forward-Orientation'], ['S06', 'Frustration ↔ Satisfaction'],
  ['S07', 'Isolation ↔ Solidarity'], ['S08', 'Resignation ↔ Defiance'], ['S09', 'Despair ↔ Hope'],
  ['S10', 'Irony ↔ Earnestness'], ['S11', 'Detachment ↔ Passion'], ['S12', 'Exhaustion ↔ Energy'],
  ['S13', 'Suspicion ↔ Trust'], ['S14', 'Territoriality ↔ Generosity'], ['S15', 'Armour ↔ Vulnerability'],
  ['S16', 'Disenchantment ↔ Wonder'], ['S17', 'Placelessness ↔ Locatedness'], ['S18', 'Extraction ↔ Stewardship'],
]

export const XIND: [string, string][] = [
  ['X1', 'Platform reach / circulation'], ['X2', 'Capital & sponsorship embeddedness'],
  ['X3', 'Institutional affiliation'], ['X4', 'Geographic & linguistic reach'], ['X5', 'Audience / social following'],
]

export const QCATS_DEFAULT = ['People', 'Institutions & bodies', 'Texts & books', 'Films', 'Media platforms', 'Concepts & events', 'Knowledge Network']

export function blankEp(): Episode {
  return {
    id: randId('ep'),
    season: 'archxmedia',
    no: '', title: '', guest: '', sub: '', url: '',
    status: 'draft', analysis: false,
    eyebrow: '', bio: '', tags: [], statsAuto: true,
    transcript: '', guestName: '',
    reading: '',
    keywords: [],
    phrases: [],
    themes: [],
    lived: '',
    quotes: [],
    sentprose: '',
    sentiments: S18.map(([code, full]): Sentiment => ({ code, full, present: false, score: 50, reading: '' })),
    compass: {
      y: 50, quadrant: '', prose: '',
      ind: XIND.map(([code, label]): CompassIndicator => ({ code, label, score: 50, note: '' })),
    } as Compass,
    refs: [],
    related: [],
    materials: [],
    on: { s02: true, s03: true, s04: true, s05: true, s06: true, s07: true, s08: true, s09: true, s10: true, s11: true, s12: true, s13: true },
  }
}

/**
 * Builds the console's working DB from the real site content — the same
 * copy that ships in src/data/db.ts (site, seasons, episode listing) and
 * src/data/ep01.ts (the full exemplar analysis record for axm-01) — rather
 * than a synthetic demo. This is what "Restore to site content" resets to,
 * and what the console loads with on its very first run.
 */
export function seedDB(): DB {
  const site = SITE.site
  const seasons = SITE.seasons

  const d: DB = {
    meta: { version: 1, updated: new Date().toISOString() },
    site: {
      title: site.title,
      line: site.line,
      footer: site.footer,
      socials: site.socials.map(([label, url]) => [label, url] as [string, string]),
    },
    pages: {
      heroLine: 'This is The Better Architecture Project.',
      tagA: 'Make Better Architecture for all...',
      tagB: 'Make architecture better for all...',
      fieldWords: 'better, architecture, media, labour, mirror, critical, praxis, city, space, diversify, caste, class, capital, image, platform, dialogue, land, housing, commons, publish, question, evidence, margin, access, craft, field, power, built, unbuilt, listen',
      gapMark: ' / ',
      churn: 70,
      about: 'The work happens through long-form conversation. Architects, critics, journalists, photographers, filmmakers, educators and researchers sit down for an hour and are asked the questions the field usually avoids. Every conversation is then treated as evidence: transcribed, corrected, coded and analysed on a shared instrument, so that the season adds up to more than a playlist. The output is a public archive of readings, registers and references that anyone can inspect.\n\nThe project is virtual by design, anchored in New Delhi and Kolkata and recorded across the country. It carries no sponsorship and sells no advertising; the independence of the readings depends on it.',
      contactEmail: 'hello@betterarch.org',
      contactNotes: 'The project carries no sponsorship and sells no advertising; pitches for paid coverage will not receive a reply.\nEpisode requests are read against the season framework: structural questions travel further than personal stories.\nConversations are recorded remotely and in English or Bangla; other languages are welcome where a shared reading can be built.\nEverything published on this site, transcripts, readings, registers, is checked with the guest before it goes live.',
    },
    seasons: seasons.map((s) => ({
      slug: s.slug, no: s.no, title: s.title, period: s.period, status: s.status, one: s.one,
    })),
    episodes: [],
  }

  d.episodes = SITE.episodes.map((src) => {
    const e = blankEp()
    e.id = src.id
    e.season = src.season
    e.no = src.no
    e.title = src.title
    e.guest = src.guest
    e.guestName = src.guest
    e.sub = src.sub
    e.url = src.url
    e.status = 'published'
    e.analysis = !!src.analysis
    return e
  })

  // Overlay the full exemplar analysis record onto its episode (currently axm-01).
  const rich = d.episodes.find((e) => e.analysis)
  if (rich) applyEp01(rich, EP01)

  return d
}

/**
 * Maps the shape of a full data/ep01.ts-style analysis record onto the
 * console's Episode type. Two of the source's fields have no home in the
 * console's model and are intentionally dropped: the per-quote `read`
 * commentary (the Quote type only tracks ctx1/main/ctx2/cat/kp), and the
 * compass's resource-axis `x` (the console derives it live from the mean
 * of the five compass indicator scores instead of storing it).
 */
function applyEp01(e: Episode, src: typeof EP01) {
  e.eyebrow = src.eyebrow
  e.bio = src.bio
  e.tags = [...src.tags]
  e.reading = src.reading.join('\n\n')
  e.lived = src.lived
  e.sentprose = src.sentprose
  e.transcript = src.tx.map(([who, line]) => `${who}: ${line}`).join('\n\n')

  e.keywords = src.keywords.map((k) => ({ word: k.word, typ: k.typ, freq: k.freq, gloss: k.gloss }))

  e.themes = src.themes.map((t): Theme => ({ t: t.t, p1: t.p[0] ?? '', p2: t.p[1] ?? '' }))

  e.quotes = src.quotes.map((q): Quote => ({ ctx1: q.ctx1, main: q.main, ctx2: q.ctx2, cat: q.cat, kp: q.kp }))

  e.sentiments = src.sentiments.map((s): Sentiment => ({
    code: s.code, full: s.full, present: true, score: s.score, reading: s.reading,
  }))

  e.compass = {
    y: src.compass.y,
    quadrant: src.compass.quadrant,
    prose: src.compass.prose,
    ind: src.compass.indicators.map(([code, label, score, note]): CompassIndicator => ({ code, label, score, note })),
  }

  e.refs = src.refs.map((r): Reference => ({ n: r.n, u: r.u, c: r.c, d: r.d }))
  e.related = src.related.map((r): RelatedEpisode => ({ id: r.id, t: r.t, g: r.g, d: r.d }))
  e.materials = src.materials.map((m): Material => ({ t: m.t, d: m.d, u: m.u, c: m.c }))
}
