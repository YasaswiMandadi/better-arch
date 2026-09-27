import { DB } from './db';
import { ANALYSIS_BY_ID } from './analysis';
import { slugify } from '../lib/slug';

/**
 * Keywords behave like hashtags: the same word can show up on an episode's
 * analysis record, on an essay, or on a sub-theme, and every place it shows
 * up should be reachable from one shared page for that word. This module
 * builds that index by scanning the three sources, it is not hand-authored
 * and never drifts out of sync with them.
 *
 * A keyword's identity is its slug (a lowercased, punctuation-stripped form
 * of the word), so "Criticality" and "criticality" resolve to the same page.
 */
export type KeywordOccurrenceType = 'episode' | 'essay' | 'subtheme';

export interface KeywordOccurrence {
  type: KeywordOccurrenceType;
  label: string;   // the title of the page this occurrence links to
  href: string;    // the route to that page
  context: string; // the category (season) it belongs to, for grouping
  freq?: number;
  gloss?: string;
}

export interface KeywordEntry {
  slug: string;
  word: string; // the first-seen spelling, used as the display form
  occurrences: KeywordOccurrence[];
}

function addOccurrence(
  registry: Map<string, KeywordEntry>,
  word: string,
  occ: KeywordOccurrence
) {
  const slug = slugify(word);
  if (!slug) return;
  let entry = registry.get(slug);
  if (!entry) {
    entry = { slug, word, occurrences: [] };
    registry.set(slug, entry);
  }
  entry.occurrences.push(occ);
}

function buildRegistry(): Map<string, KeywordEntry> {
  const registry = new Map<string, KeywordEntry>();
  const seasons: any[] = DB.seasons as any;
  const episodes: any[] = DB.episodes as any;
  const essays: any[] = DB.essays as any;

  // From every episode that has a full analysis record.
  for (const ep of episodes) {
    const a = ANALYSIS_BY_ID[ep.id];
    if (!a) continue;
    const season = seasons.find((s) => s.slug === ep.season);
    for (const k of a.keywords) {
      addOccurrence(registry, k.word, {
        type: 'episode',
        label: ep.title,
        href: `/episode/${ep.id}`,
        context: season ? season.title : '',
        freq: k.freq,
        gloss: k.gloss,
      });
    }
  }

  // From every essay that carries its own keyword list.
  for (const es of essays) {
    if (!es.keywords?.length) continue;
    const season = seasons.find((s) => s.slug === es.season);
    for (const k of es.keywords as { word: string; freq: number; gloss?: string }[]) {
      addOccurrence(registry, k.word, {
        type: 'essay',
        label: es.title,
        href: `/essay/${es.slug}`,
        context: season ? season.title : '',
        freq: k.freq,
        gloss: k.gloss,
      });
    }
  }

  // From every sub-theme that carries its own keyword list.
  for (const s of seasons) {
    for (const t of s.themes) {
      if (!t.keywords?.length) continue;
      for (const k of t.keywords as { word: string; freq: number; gloss?: string }[]) {
        addOccurrence(registry, k.word, {
          type: 'subtheme',
          label: t.title,
          href: `/project/${s.slug}/theme/${t.slug}`,
          context: s.title,
          freq: k.freq,
          gloss: k.gloss,
        });
      }
    }
  }

  return registry;
}

const REGISTRY = buildRegistry();

export const ALL_KEYWORDS: KeywordEntry[] = Array.from(REGISTRY.values()).sort((a, b) =>
  a.word.localeCompare(b.word)
);

export function getKeyword(slug: string): KeywordEntry | undefined {
  return REGISTRY.get(slug);
}

/** The route for a given keyword word, wherever it's rendered as a chip. */
export function keywordHref(word: string): string {
  return `/keyword/${slugify(word)}`;
}
