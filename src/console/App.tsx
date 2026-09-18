import './console.css';
import { ConsoleContext, useConsoleState } from './store/useConsole';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Dashboard from './views/Dashboard';
import Seasons from './views/Seasons';
import Episodes from './views/Episodes';
import Editor from './views/Editor';
import Pages from './views/Pages';
import Inbox from './views/Inbox';
import Settings from './views/Settings';
import type { ViewName } from './types';
import type { ComponentType } from 'react';

const VIEWS: Record<ViewName, ComponentType> = {
  dashboard: Dashboard,
  seasons: Seasons,
  episodes: Episodes,
  editor: Editor,
  pages: Pages,
  inbox: Inbox,
  settings: Settings,
};

const MOBILE_NAV: [ViewName, string][] = [
  ['dashboard', 'Dashboard'], ['seasons', 'Seasons'], ['episodes', 'Episodes'],
  ['pages', 'Pages'], ['inbox', 'Inbox'], ['settings', 'Settings'],
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
  const state = useConsoleState();
  const ViewComponent = VIEWS[state.view] || Dashboard;

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
                state.view === v ? 'bg-rust text-white' : 'text-muted bg-ink/[0.05]'
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
