import { useMemo } from 'react';
import type { Episode, EpisodeAnalysis } from './types';
import { getAnalysis } from './analysis';

/**
 * Resolves an episode's deep-analysis record: a live record uploaded
 * through the console's Episode Analysis screen (episode.analysisData)
 * takes priority, falling back to the static ep01.ts-style registry
 * (today, only axm-01) for episodes authored before the console upload
 * existed. Either source renders through the same Episode.tsx sections.
 */
export function resolveAnalysis(episode: Pick<Episode, 'id' | 'analysisData'>): EpisodeAnalysis | undefined {
  return episode.analysisData ?? (getAnalysis(episode.id) as unknown as EpisodeAnalysis | undefined);
}

export function useEpisodeAnalysis(episode: Pick<Episode, 'id' | 'analysisData'> | undefined): EpisodeAnalysis | undefined {
  return useMemo(() => (episode ? resolveAnalysis(episode) : undefined), [episode]);
}
