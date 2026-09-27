import { EP01 } from './ep01';

/**
 * Registry of full per-episode analysis records, keyed by episode id.
 * Right now there's exactly one, Ep.01, the exemplar. Add an entry here for
 * each further episode as its own analysis record is authored through the
 * BetterArch Console; nothing else (Episode.tsx, the category page's
 * Keywords/Collaborators rollups) needs to change to pick it up.
 */
export const ANALYSIS_BY_ID: Record<string, typeof EP01> = {
  'axm-01': EP01,
};

export function getAnalysis(id: string): typeof EP01 | undefined {
  return ANALYSIS_BY_ID[id];
}
