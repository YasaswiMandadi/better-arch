import type { SiteDB } from './types';
import { slugify } from '../lib/slug';

export type KeywordOccurrenceType = 'episode' | 'essay' | 'subtheme';

export interface KeywordOccurrence {
  type: KeywordOccurrenceType;
  label: string;
  href: string;
  context: string;
  freq?: number;
  gloss?: string;
}

export interface KeywordEntry {
  slug: string;
  word: string;
  occurrences: KeywordOccurrence[];
}

function addOccurrence(registry: Map<string, KeywordEntry>, word: string, occ: KeywordOccurrence) {
  const slug = slugify(word);
  const existing = registry.get(slug);
  if (existing) existing.occurrences.push(occ);
  else registry.set(slug, { slug, word, occurrences: [occ] });
}

/** Builds the full keyword registry from live episode/essay/sub-theme data. */
export function buildKeywordRegistry(data: SiteDB): Map<string, KeywordEntry> {
  const registry = new Map<string, KeywordEntry>();

  // Episodes carry keywords inline via analysis records elsewhere (ep01.ts);
  // callers that have analysis data merge it in with mergeEpisodeKeywords().

  for (const es of data.essays) {
    if (!es.keywords?.length) continue;
    for (const kw of es.keywords) {
      addOccurrence(registry, kw.word, {
        type: 'essay',
        label: es.title,
        href: `/essay/${es.slug}`,
        context: es.author ? `by ${es.author}` : '',
        freq: kw.freq,
        gloss: kw.gloss,
      });
    }
  }

  for (const t of data.themes) {
    for (const st of t.subThemes) {
      if (!st.keywords?.length) continue;
      for (const kw of st.keywords) {
        addOccurrence(registry, kw.word, {
          type: 'subtheme',
          label: st.title,
          href: `/theme/${t.slug}/subtheme/${st.slug}`,
          context: `${t.title} · sub-theme`,
          freq: kw.freq,
          gloss: kw.gloss,
        });
      }
    }
  }

  return registry;
}

/** Merges in episode-analysis keywords (from ep01.ts-style analysis records). */
export function mergeEpisodeKeywords(
  registry: Map<string, KeywordEntry>,
  episodeId: string,
  episodeTitle: string,
  guest: string,
  keywords: { word: string; freq: number; gloss?: string }[]
) {
  for (const kw of keywords) {
    addOccurrence(registry, kw.word, {
      type: 'episode',
      label: episodeTitle,
      href: `/episode/${episodeId}`,
      context: guest ? `with ${guest}` : '',
      freq: kw.freq,
      gloss: kw.gloss,
    });
  }
}

/** `preview` is the id of a draft episode being viewed: the keyword page
 * then includes that draft's occurrence so its words are reachable
 * before it is published. */
export function keywordHref(word: string, preview?: string): string {
  return `/keyword/${slugify(word)}${preview ? `?preview=${encodeURIComponent(preview)}` : ''}`;
}

/**
 * Episode/essay header tag chips (e.g. "media as mirror", "the validation
 * economy") are short topic labels, not individual keyword words, so they
 * don't match a keyword slug directly. This finds the best keyword in the
 * same record whose word is contained in the tag's text (e.g. "mirror" is
 * found inside "media as mirror"), so the chip can link to that word's
 * keyword page. Picks the highest-frequency match when more than one
 * keyword word appears in the tag. Returns undefined when nothing matches,
 * so the caller can render the chip as plain text instead of a broken link.
 */
export function bestKeywordMatchForTag<K extends { word: string; freq: number }>(
  tag: string,
  keywords: readonly K[]
): K | undefined {
  const norm = (v: string) => v.toLowerCase().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const tagLower = norm(tag);
  let best: K | undefined;
  for (const kw of keywords) {
    const w = norm(kw.word);
    if (w && tagLower.includes(w)) {
      if (!best || kw.freq > best.freq) best = kw;
    }
  }
  return best;
}

export interface KeywordSuggestion {
  word: string;
  slug: string;
  /** Cluster/zone used the last time this word appeared on an episode. */
  typ: string;
  gloss: string;
  /** Number of places (episodes, essays, sub-themes) already carrying it. */
  uses: number;
}

const stripTags = (v: string) => v.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Every distinct keyword already on the site (all episodes, drafts
 * included, plus essays and sub-themes), with its most useful cluster and
 * gloss, so the episode editor can suggest them while an admin types. */
export function collectKeywordSuggestions(
  data: SiteDB,
  analysisOf: (ep: SiteDB['episodes'][number]) => { keywords?: { word: string; typ?: string; gloss?: string }[] } | undefined,
): KeywordSuggestion[] {
  const map = new Map<string, KeywordSuggestion>();
  const add = (rawWord: string, typ?: string, gloss?: string) => {
    const word = stripTags(String(rawWord ?? ''));
    if (!word) return;
    const slug = slugify(word);
    if (!slug) return;
    const cur = map.get(slug);
    if (cur) {
      cur.uses += 1;
      if (!cur.typ && typ) cur.typ = stripTags(typ);
      if (!cur.gloss && gloss) cur.gloss = stripTags(gloss);
    } else {
      map.set(slug, { word, slug, typ: typ ? stripTags(typ) : '', gloss: gloss ? stripTags(gloss) : '', uses: 1 });
    }
  };
  for (const ep of data.episodes) for (const k of analysisOf(ep)?.keywords ?? []) add(k.word, k.typ, k.gloss);
  for (const es of data.essays) for (const k of es.keywords ?? []) add(k.word, undefined, k.gloss);
  for (const t of data.themes) for (const st of t.subThemes) for (const k of st.keywords ?? []) add(k.word, undefined, k.gloss);
  return Array.from(map.values());
}

/** Ranks suggestions for what the admin has typed so far: prefix matches
 * first, then substring matches; an empty query returns the most-used words. */
export function rankKeywordSuggestions(all: KeywordSuggestion[], query: string, exclude: Set<string>, limit = 8): KeywordSuggestion[] {
  const q = slugify(stripTags(query));
  const pool = all.filter((s) => !exclude.has(s.slug));
  if (!q) return [...pool].sort((a, b) => b.uses - a.uses || a.word.localeCompare(b.word)).slice(0, limit);
  const starts: KeywordSuggestion[] = [];
  const contains: KeywordSuggestion[] = [];
  for (const s of pool) {
    if (s.slug === q) continue; // already exactly this word
    if (s.slug.startsWith(q)) starts.push(s);
    else if (s.slug.includes(q)) contains.push(s);
  }
  const by = (a: KeywordSuggestion, b: KeywordSuggestion) => b.uses - a.uses || a.word.localeCompare(b.word);
  return [...starts.sort(by), ...contains.sort(by)].slice(0, limit);
}
