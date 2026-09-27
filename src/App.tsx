import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import Home from './pages/Home';
import Project from './pages/Project';
import SubTheme from './pages/SubTheme';
import EpisodesIndex from './pages/Episodes';
import Episode from './pages/Episode';
import Essay from './pages/Essay';
import Keyword from './pages/Keyword';
import CollaboratorPage from './pages/Collaborator';
import About from './pages/About';
import Contact from './pages/Contact';
import ConsoleApp from './console/App';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/project/:slug" element={<Project />} />
          <Route path="/project/:slug/theme/:themeSlug" element={<SubTheme />} />
          <Route path="/episodes" element={<EpisodesIndex />} />
          <Route path="/episode/:id" element={<Episode />} />
          <Route path="/essay/:slug" element={<Essay />} />
          <Route path="/keyword/:slug" element={<Keyword />} />
          <Route path="/collaborator/:slug" element={<CollaboratorPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/console/*" element={<ConsoleApp />} />

          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
