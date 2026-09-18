import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import Home from './pages/Home';
import Project from './pages/Project';
import EpisodesIndex from './pages/Episodes';
import Episode from './pages/Episode';
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
          <Route path="/episodes" element={<EpisodesIndex />} />
          <Route path="/episode/:id" element={<Episode />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/console/*" element={<ConsoleApp />} />

          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
