import './console.css';
import { ConsoleContext, useConsoleState } from './store/useConsole';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import ConsoleLogin from './components/ConsoleLogin';
import { useSiteData } from '../data/store';
import ThemeRepository from './views/ThemeRepository';
import ThemeEditor from './views/ThemeEditor';
import EpisodeAnalysisRepository from './views/EpisodeAnalysisRepository';
import EpisodeAnalysisEditor from './views/EpisodeAnalysisEditor';
import ThemesPageEditor from './views/ThemesPageEditor';
import EssayRepository from './views/EssayRepository';
import EssayEditor from './views/EssayEditor';
import EssaysPageEditor from './views/EssaysPageEditor';
import CollaboratorRepository from './views/CollaboratorRepository';
import CollaboratorEditor from './views/CollaboratorEditor';
import KeywordRepository from './views/KeywordRepository';
import ReferenceRepository from './views/ReferenceRepository';
import type { ViewName } from './types';
import { NAV_SECTION } from './nav';
import type { ComponentType } from 'react';

const VIEWS: Partial<Record<ViewName, ComponentType>> = {
  themes: ThemeRepository,
  themeEditor: ThemeEditor,
  episodeAnalysis: EpisodeAnalysisRepository,
  episodeAnalysisEditor: EpisodeAnalysisEditor,
  themesPage: ThemesPageEditor,
  essays: EssayRepository,
  essayEditor: EssayEditor,
  essaysPage: EssaysPageEditor,
  collaborators: CollaboratorRepository,
  collaboratorEditor: CollaboratorEditor,
  keywords: KeywordRepository,
  references: ReferenceRepository,
};

const MOBILE_NAV: [ViewName, string][] = [
  ['themes', 'Themes'], ['essays', 'Essays'], ['episodeAnalysis', 'Episodes'],
  ['collaborators', 'Collaborators'], ['keywords', 'Keywords'], ['references', 'References'],
];

/**
 * The BetterArch Console, mounted at /console/* in the main site's router.
 * It keeps its own internal navigation (no nested routes) so it can be
 * dropped in as a single, self-contained unit; the browser address bar
 * stays on /console while you move between its views.
 *
 * Everything below is wrapped in `.consoleApp`, which scopes the console's
 * own colour and type tokens (defined in ./console.css) so they never leak
 * into the public site, and vice versa.
 */
export default function ConsoleApp() {
  const { remote } = useSiteData();
  // On the shared-database build the console is behind the admin password.
  // (Browser-only builds, and a database that can't be reached, keep today's open console.)
  if (remote.enabled && remote.available && !remote.admin) return <ConsoleLogin />;
  return <ConsoleShell />;
}

function ConsoleShell() {
  const state = useConsoleState();
  const ViewComponent = VIEWS[state.view] || ThemeRepository;

  return (
    <div className="consoleApp">
      <ConsoleContext.Provider value={state}>
        <Topbar />
        <div className="md:hidden fixed top-[60px] inset-x-0 z-40 bg-card border-b border-hair px-3 py-2 overflow-x-auto whitespace-nowrap">
          {MOBILE_NAV.map(([v, label]) => (
            <button
              key={v}
              onClick={() => state.go(v)}
              className={`inline-block mr-2 px-3 py-1.5 rounded-full text-[12.5px] font-sans font-medium ${
                (NAV_SECTION[state.view] ?? state.view) === v ? 'bg-rust text-white' : 'text-muted bg-ink/[0.05]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-[248px_1fr] pt-[60px] md:pt-[60px]">
          <div className="md:contents">
            <Sidebar />
          </div>
          <main className="px-4 sm:px-6 md:px-8 pt-16 md:pt-8 pb-28 max-w-[1080px]">
            <ViewComponent />
          </main>
        </div>
        <Toast />
      </ConsoleContext.Provider>
    </div>
  );
}
