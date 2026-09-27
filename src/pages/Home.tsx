import { Link } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import { Moon, Sun, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import WordField from '../components/WordField';
import WatchingEye from '../components/WatchingEye';
import TypeSwap from '../components/TypeSwap';
import { DB } from '../data/db';

export default function Home() {
  const { theme, toggle } = useTheme();
  const [projOpen, setProjOpen] = useState(false);
  const projRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projOpen) return;
    function onOutside(ev: MouseEvent) {
      if (projRef.current && !projRef.current.contains(ev.target as Node)) setProjOpen(false);
    }
    function onEscape(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setProjOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [projOpen]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070707]" style={{ colorScheme: 'dark' }}>
      <WordField />

      {/* nav */}
      <nav className="relative z-20 flex items-center gap-6 px-6 sm:px-8 py-5 font-mono text-[12px] tracking-[.12em] text-[#E4E7EA]">
        <Link to="/" className="font-bold tracking-[.16em] whitespace-nowrap">
          BETTERARCH<b className="text-[#E0825C]">.ORG</b>
        </Link>
        <span className="flex-1" />
        <div className="relative hidden sm:block" ref={projRef}>
          <button
            onClick={() => setProjOpen((o) => !o)}
            aria-expanded={projOpen}
            className="uppercase text-[#7A7F84] hover:text-[#E4E7EA] transition-colors py-2 border-b border-transparent hover:border-[#3a3d40]"
          >
            Categories ▾
          </button>
          {projOpen && (
            <div className="absolute top-full left-0 mt-3 min-w-[280px] bg-[rgba(10,10,11,.92)] backdrop-blur-md border border-white/10 rounded-[10px] p-2 shadow-[0_26px_70px_rgba(0,0,0,.6)]">
              {DB.seasons.map((s, i) => (
                <Link
                  key={s.slug}
                  to={`/project/${s.slug}`}
                  onClick={() => setProjOpen(false)}
                  className="flex gap-3 items-baseline px-3 py-2.5 rounded-lg text-[#7A7F84] hover:bg-white/[.06] hover:text-[#E4E7EA] transition-colors"
                >
                  <span className="font-num text-[15px] text-[#6b6f73] w-5 shrink-0">0{i + 1}</span>
                  <span>{s.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Link to="/contact" className="uppercase text-[#7A7F84] hover:text-[#E4E7EA] transition-colors py-2">Contact Us</Link>
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1.5 uppercase text-[#7A7F84] hover:text-[#E4E7EA] transition-colors border border-white/15 rounded-full px-3 py-1.5"
        >
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </nav>

      {/* hero */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 px-6 sm:px-10 lg:px-[min(9vw,120px)] pt-6 pb-16 lg:pt-10 lg:min-h-[calc(100vh-180px)]">
        <div className="flex-1 max-w-[20ch] lg:max-w-none">
          <p className="font-mono text-[11px] tracking-[.34em] uppercase text-[#6b6f73] mb-5">
            A spatial research agency · New Delhi · Kolkata · everywhere virtual
          </p>
          <h1 className="font-mono font-bold text-[clamp(1.9rem,5.4vw,4.1rem)] leading-[1.1] tracking-[.01em] text-[#E4E7EA] max-w-[18ch]">
            This is <span className="text-[#E0825C]">The Better Architecture Project</span>.
          </h1>
          <p className="mt-6 font-mono text-[clamp(.85rem,1.5vw,1.02rem)] leading-[1.7] tracking-[.06em] text-[#7A7F84] min-h-[1.7em]">
            <TypeSwap lines={['Make Better Architecture for all...', 'Make architecture better for all...']} />
          </p>
          <div className="mt-10 flex flex-wrap gap-3.5">
            <Link
              to="/project/archxmedia"
              className="font-mono font-medium text-[11px] tracking-[.18em] uppercase rounded-full px-6 py-3.5
                bg-[#E4E7EA] text-[#060606] hover:brightness-110 transition-all"
            >
              Enter the conversations
            </Link>
            <Link
              to="/about"
              className="font-mono font-medium text-[11px] tracking-[.18em] uppercase rounded-full px-6 py-3.5
                border border-white/20 text-[#E4E7EA] hover:bg-white/[.06] hover:border-white/40 hover:-translate-y-0.5 transition-all"
            >
              What is this?
            </Link>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md lg:max-w-lg flex justify-center" style={{ animation: 'float-slow 7s ease-in-out infinite' }}>
          <WatchingEye className="w-full drop-shadow-[0_30px_60px_rgba(224,130,92,0.15)]" />
        </div>
      </div>

      {/* footer */}
      <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2 px-6 sm:px-8 py-5 font-mono text-[10.5px] tracking-[.1em] text-[#5c6065]">
        <a href="https://www.linkedin.com/company/betterarch/" target="_blank" rel="noopener" className="uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">Linkedin</a>
        <span className="text-[#3a3d40]">/</span>
        <a href="https://www.instagram.com/betterarch_org/" target="_blank" rel="noopener" className="uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">Instagram</a>
        <span className="text-[#3a3d40]">/</span>
        <a href="https://www.x.com/betterarch_org/" target="_blank" rel="noopener" className="uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">X</a>
        <span className="text-[#3a3d40]">/</span>
        <a href="https://open.spotify.com/show/7glojNr7jxfFlu5FF9RjjF" target="_blank" rel="noopener" className="uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">Spotify</a>
        <span className="ml-auto uppercase text-[#45484c] hidden sm:inline flex items-center gap-1">
          <ChevronDown size={11} className="rotate-180" /> the eye is watching · move your cursor
        </span>
      </div>
    </div>
  );
}
