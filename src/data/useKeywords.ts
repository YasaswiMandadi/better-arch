import { useMemo } from 'react';
import { useSiteData } from './store';
import { buildKeywordRegistry, mergeEpisodeKeywords, type KeywordEntry } from './keywords';
import { resolveAnalysis } from './useEpisodeAnalysis';
import { isEpisodePublished } from './types';

/** Live keyword registry: essay + sub-theme keywords from the store, plus
 * episode-analysis keywords — a live console-uploaded record
 * (episode.analysisData) if present, else the static ep01.ts-style
 * registry. Draft episodes are left out, same as they're left out of
 * listings, until published. Recomputes whenever the store's data changes
 * (e.g. a console edit or upload). */
export function useKeywordRegistry(previewId?: string): Map<string, KeywordEntry> {
  const { data } = useSiteData();
  return useMemo(() => {
    const registry = buildKeywordRegistry(data);
    for (const ep of data.episodes) {
      if (!isEpisodePublished(ep) && ep.id !== previewId) continue;
      const A = resolveAnalysis(ep);
      if (!A) continue;
      mergeEpisodeKeywords(registry, ep.id, ep.title, ep.guest, A.keywords as any);
    }
    return registry;
  }, [data, previewId]);
}

export function useAllKeywords(): KeywordEntry[] {
  const registry = useKeywordRegistry();
  return useMemo(() => Array.from(registry.values()).sort((a, b) => a.word.localeCompare(b.word)), [registry]);
}

export function useKeyword(slug: string | undefined, previewId?: string): KeywordEntry | undefined {
  const registry = useKeywordRegistry(previewId);
  return slug ? registry.get(slug) : undefined;
}
