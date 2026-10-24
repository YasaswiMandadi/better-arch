import { useMemo } from 'react';
import { useSiteData } from './store';
import { useAllKeywords } from './useKeywords';
import { eyeVideoSources, resolveHomeEye, type HomeEyeSettings } from './homeEye';
import { REMOTE_ENABLED } from './remote';
import { slugify } from '../lib/slug';

const FALLBACK = [
  'architecture', 'media', 'mirror', 'labour', 'critical', 'space', 'image', 'city', 'caste', 'class', 'capital',
  'platform', 'dialogue', 'commons', 'housing', 'access', 'craft', 'power', 'listen', 'question',
];

export interface HomeEyeModel {
  settings: HomeEyeSettings;
  /** normal set: every live keyword, minus the ones switched off, plus extra words */
  words: string[];
  /** the small set drawn in the highlight colour */
  highlight: string[];
  sources: { src: string; type: string }[];
  /** all live keywords (for the console's pickers) */
  live: string[];
}

/** Builds the eye's two keyword sets from the live keywords and the given settings. */
export function buildEyeWords(live: string[], s: HomeEyeSettings): { words: string[]; highlight: string[] } {
  const off = new Set(s.excludeWords.map(slugify));
  const seen = new Set<string>();
  const words: string[] = [];
  for (const w of [...live, ...s.extraWords]) {
    const k = slugify(w);
    if (!k || off.has(k) || seen.has(k)) continue;
    seen.add(k);
    words.push(w);
  }
  return { words: words.length >= 4 ? words : FALLBACK, highlight: s.highlightWords };
}

/** Everything the homepage eye needs. `override` lets the console preview unsaved settings. */
export function useHomeEye(override?: HomeEyeSettings): HomeEyeModel {
  const { data } = useSiteData();
  const all = useAllKeywords();
  const live = useMemo(
    () => Array.from(new Set(all.map((k) => k.word.replace(/<[^>]*>/g, '').trim().toLowerCase()).filter((w) => w && w.length <= 32))),
    [all],
  );
  const saved = useMemo(() => resolveHomeEye(data.site.homeEye), [data.site.homeEye]);
  const settings = override ?? saved;
  const sets = useMemo(() => buildEyeWords(live, settings), [live, settings]);
  const sources = useMemo(() => eyeVideoSources(settings, REMOTE_ENABLED), [settings]);
  return { settings, words: sets.words, highlight: sets.highlight, sources, live };
}
