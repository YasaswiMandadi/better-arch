export interface Keyword { word: string; typ: string; freq: number; gloss: string }
export interface Phrase { ctx1: string; main: string; ctx2: string; read: string; cat: string }
export interface Theme { t: string; p1: string; p2: string }
export interface Quote { ctx1: string; main: string; ctx2: string; cat: string; kp: boolean }
export interface Sentiment { code: string; full: string; present: boolean; score: number; reading: string }
export interface CompassIndicator { code: string; label: string; score: number; note: string }
export interface Compass { y: number; quadrant: string; prose: string; ind: CompassIndicator[] }
export interface Reference { n: string; u: string; c: string; d: string }
export interface RelatedEpisode { id: string; t: string; g: string; d: string }
export interface Material { t: string; d: string; u: string; c: string }

export interface SectionToggles {
  s02: boolean; s03: boolean; s04: boolean; s05: boolean; s06: boolean
  s07: boolean; s08: boolean; s09: boolean; s10: boolean; s11: boolean
  s12: boolean; s13: boolean
}

export interface Episode {
  id: string
  season: string
  no: string
  title: string
  guest: string
  sub: string
  url: string
  status: 'draft' | 'published'
  analysis: boolean
  eyebrow: string
  bio: string
  tags: string[]
  statsAuto: boolean
  transcript: string
  guestName: string
  reading: string
  keywords: Keyword[]
  phrases: Phrase[]
  themes: Theme[]
  lived: string
  quotes: Quote[]
  sentprose: string
  sentiments: Sentiment[]
  compass: Compass
  refs: Reference[]
  related: RelatedEpisode[]
  materials: Material[]
  on: SectionToggles
}

export interface Season {
  slug: string
  no: string
  title: string
  period: string
  status: string
  one: string
}

export interface SiteSettings {
  title: string
  line: string
  footer: string
  socials: [string, string][]
}

export interface Pages {
  heroLine: string
  tagA: string
  tagB: string
  fieldWords: string
  gapMark: string
  churn: number
  about: string
  contactEmail: string
  contactNotes: string
}

export interface InboxMessage {
  ts: string
  name: string
  email: string
  type: 'episode' | 'general'
  subject?: string
  msg: string
  org?: string
  guest?: string
  topic?: string
  status: 'new' | 'read' | 'replied' | 'archived'
}

export interface DB {
  meta: { version: number; updated: string }
  site: SiteSettings
  pages: Pages
  seasons: Season[]
  episodes: Episode[]
}

export type ViewName =
  | 'dashboard'
  | 'seasons'
  | 'episodes'
  | 'editor'
  | 'pages'
  | 'inbox'
  | 'settings'
