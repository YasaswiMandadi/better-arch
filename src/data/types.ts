import type { SectionLayout } from './sectionLayout';

export interface KeywordItem {
  word: string;
  freq: number;
  gloss?: string;
}

export interface TertiaryTheme {
  slug: string;
  title: string;
  desc: string;
}

export interface SubTheme {
  slug: string;
  title: string;
  shortDesc: string;
  longDesc: string;
  darkHex?: string;
  lightHex?: string;
  tertiaryThemes?: TertiaryTheme[];
  keywords?: KeywordItem[];
  /** Which sections its page shows, and in what order (see sectionLayout.ts). */
  sectionLayout?: SectionLayout;
}

export interface KeyConcept {
  header: string;
  desc: string;
}

export interface Theme {
  slug: string;
  no: string;
  title: string;
  period: string; // run status, display text e.g. "2024 · ongoing"
  statusLabel: string; // e.g. "live season", "forthcoming"
  one: string; // compact/short description — card text, ~3 lines max
  summary: string[]; // long description paragraphs
  darkHex: string;
  lightHex: string;
  investigatorSlugs: string[]; // collaborator slugs
  keyConcepts: KeyConcept[];
  subThemes: SubTheme[];
  future: { header: string; desc: string }; // Future Directions section
  posterSquareUrl?: string;
  posterRectUrl?: string;
  keywords: KeywordItem[]; // theme-level, autopulled top keywords or curated
  links: [string, string][]; // further reading
  status: 'draft' | 'published';
  /** Which sections its page shows, and in what order (see sectionLayout.ts). */
  sectionLayout?: SectionLayout;
}

/**
 * The deep-analysis record for an episode (the "AXM Unified Framework v5"
 * instrument — 13 clusters folded into a single critical-autonomy compass,
 * an 18-point sentiment register). This is the live, store-backed
 * equivalent of the hand-authored ep01.ts-style records: console's Episode
 * Analysis screen writes it here via JSON upload, and Episode.tsx prefers
 * it over the static ep01.ts registry when present.
 */
export interface EpisodeAnalysis {
  eyebrow: string;
  bio: string;
  tags: string[];
  stats: [string, string][];
  reading: string[];
  lexnarr: string;
  keywords: { word: string; typ: string; freq: number; gloss: string; dom?: string }[];
  hue: Record<string, string>;
  themes: AnalysisTheme[];
  qcats: string[];
  quotes: { cat: string; kp: boolean; read: string; ctx1: string; main: string; ctx2: string; dom?: string }[];
  lived: string;
  sentprose: string;
  sentiments: { code: string; label: string; full: string; score: number; reading: string; dom?: string }[];
  compass: {
    x: number;
    y: number;
    quadrant: string;
    prose: string;
    indicators: [string, string, number, string][];
  };
  refcats: string[];
  refs: { n: string; u: string; c: string; d: string }[];
  related: { t: string; g: string; d: string; id: string }[];
  materials: { t: string; d: string; u: string; c: string }[];
  txnote: string;
  tx: [string, string][];
  /** Record details carried by the SPECTACLE-register template (all optional,
   * so v5 records without them are unaffected). */
  meta?: AnalysisMeta;
  /** The nine-domain SPECTACLE profile (bridge score + hover note per domain). */
  spectacle?: { domains: SpectacleDomainScore[] };
  /** Ready-made citation line for the episode. */
  cite?: string;
}

export interface AnalysisTheme {
  t: string;
  p: string[];
  /** SPECTACLE theme code, e.g. 'G1.1'. */
  code?: string;
  /** SPECTACLE domain code, e.g. 'G1'. */
  dom?: string;
  /** 'Central' | 'Supporting' | … — how strongly the conversation invokes it. */
  band?: string;
  bridge?: number;
  excerpts?: { before: string; main: string; after: string }[];
}

export interface AnalysisMeta {
  id?: string;
  date?: string;
  duration?: string;
  lang?: string;
  role?: string;
}

export interface SpectacleDomainScore {
  code: string;
  bridge: number;
  partial: boolean;
  hover: string;
}

export interface Episode {
  id: string;
  season: string; // theme slug
  no: string;
  title: string;
  guest: string;
  sub: string;
  url: string;
  analysis: boolean;
  analysisData?: EpisodeAnalysis;
  /** Which sections the published page shows, and in what order (see sectionLayout.ts).
   * Kept on the episode, not inside analysisData, so re-uploading a template never resets it. */
  sectionLayout?: SectionLayout;
  /** 'draft' hides the episode from public listings, search and its
   * theme's Conversations section until published. Optional and absent on
   * every seeded episode on purpose — they're already live, so "absent"
   * reads as published (see isEpisodePublished()); only episodes created
   * through the console's "+ New episode" get an explicit 'draft'. */
  status?: 'draft' | 'published';
}

/** An episode with no status field (every seeded episode) counts as
 * published — only an explicit 'draft' hides it. */
export function isEpisodePublished(e: Pick<Episode, 'status'>): boolean {
  return e.status !== 'draft';
}

export interface EssayKeyword extends KeywordItem {}

export interface Essay {
  id: string;
  season: string; // theme slug
  title: string;
  slug: string;
  author: string;
  sub: string;
  body: string[];
  keywords?: EssayKeyword[];
  /** 'draft' keeps the essay off the public site. Absent on every existing essay on purpose:
   * absent reads as published (see isEssayPublished()); essays made in the console start as drafts. */
  status?: 'draft' | 'published';
}

/** An essay with no status field (every existing essay) counts as published. */
export function isEssayPublished(e: Pick<Essay, 'status'>): boolean {
  return e.status !== 'draft';
}

export interface Collaborator {
  slug: string;
  name: string;
  designation?: string;
  bio: string;
}

/** A titled block with one button, used by the master pages ("Propose a Project", "A Better Vision"…). */
export interface CtaBlock {
  show: boolean;
  title: string;
  desc: string;
  buttonLabel: string;
  /** '/contact#…' style paths open inside the site; full https:// links open in a new tab. */
  buttonHref: string;
}

/** Editable text of the Themes masterpage (/themes). Every field optional: missing ones use the defaults in pageCopy.ts. */
export interface ThemesPageCopy {
  eyebrow?: string;
  title?: string;
  intro?: string;
  propose?: Partial<CtaBlock>;
  vision?: Partial<CtaBlock>;
}

/** Editable text of the Essays masterpage (/essays). */
export interface EssaysPageCopy {
  eyebrow?: string;
  title?: string;
  intro?: string;
  cta?: Partial<CtaBlock>;
}

export interface SiteSettings {
  title: string;
  line: string;
  footer: string;
  socials: [string, string][];
  themesPage?: ThemesPageCopy;
  essaysPage?: EssaysPageCopy;
}

export interface SiteDB {
  site: SiteSettings;
  themes: Theme[];
  episodes: Episode[];
  essays: Essay[];
  collaborators: Collaborator[];
}
