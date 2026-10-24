import type { ViewName } from './types'

/** Which menu item is highlighted for each view (editors light up their repository). */
export const NAV_SECTION: Partial<Record<ViewName, ViewName>> = {
  themeEditor: 'themes', themesPage: 'themes',
  essayEditor: 'essays', essaysPage: 'essays',
  episodeAnalysisEditor: 'episodeAnalysis',
  collaboratorEditor: 'collaborators',
}
