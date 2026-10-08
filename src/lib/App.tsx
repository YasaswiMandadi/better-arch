import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { SiteDataProvider } from './data/store';
import { CollaboratorPopupProvider } from './lib/collaboratorPopup';
import Home from './pages/Home';
import ThemesMasterpage from './pages/ThemesMasterpage';
import EssaysMasterpage from './pages/EssaysMasterpage';
import Theme from './pages/Theme';
import SubTheme from './pages/SubTheme';
import EpisodesIndex from './pages/Episodes';
import Episode from './pages/Episode';
import Essay from './pages/Essay';
import Keyword from './pages/Keyword';
import About from './pages/About';
import Disclaimer from './pages/Disclaimer';
import Contact from './pages/Contact';
import ConsoleApp from './console/App';
import ContentProtection from './lib/contentProtection';

export default function App() {
  return (
    <SiteDataProvider>
      <ThemeProvider>
        <BrowserRouter>
          <ContentProtection />
          <CollaboratorPopupProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/themes" element={<ThemesMasterpage />} />
              <Route path="/essays" element={<EssaysMasterpage />} />
              <Route path="/theme/:slug" element={<Theme />} />
              <Route path="/theme/:slug/subtheme/:subSlug" element={<SubTheme />} />
              <Route path="/episodes" element={<EpisodesIndex />} />
              <Route path="/episode/:id" element={<Episode />} />
              <Route path="/essay/:slug" element={<Essay />} />
              <Route path="/keyword/:slug" element={<Keyword />} />
              <Route path="/about" element={<About />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/contact" element={<Contact />} />

              <Route path="/console/*" element={<ConsoleApp />} />

              <Route path="*" element={<Home />} />
            </Routes>
          </CollaboratorPopupProvider>
        </BrowserRouter>
      </ThemeProvider>
    </SiteDataProvider>
  );
}
