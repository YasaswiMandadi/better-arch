import { EP01 } from './ep01';

export const ANALYSIS_BY_ID: Record<string, typeof EP01> = {
  'axm-01': EP01,
};

export function getAnalysis(id: string): typeof EP01 | undefined {
  return ANALYSIS_BY_ID[id];
}
