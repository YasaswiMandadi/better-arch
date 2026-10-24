import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '../lib/theme';
import { Moon, Sun, ChevronDown } from 'lucide-react';
import VideoEye from '../components/VideoEye';
import { useHomeEye } from '../data/useHomeEye';
import TypeSwap from '../components/TypeSwap';
import HeaderSearch from '../components/HeaderSearch';

/** Live New Delhi time for the corner label. */
function useDelhiClock(): string {
  const fmt = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });
  const [now, setNow] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Home() {
  const { theme, toggle } = useTheme();
  const eye = useHomeEye();
  const clock = useDelhiClock();

  return (
    <div className="hp-eye relative min-h-screen min-h-[100dvh] flex flex-col overflow-hidden" style={{ colorScheme: 'dark', background: eye.settings.bg }}>
      <VideoEye eye={eye} />

      {/* nav */}
      {/* phones: brand + search + Light/Dark on the first row, the four links on a second row */}
      <nav className="relative z-20 flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-1 px-4 sm:px-8 pt-4 pb-2 md:py-5 font-mono text-[12px] tracking-[.12em] text-[#E4E7EA]">
        <Link to="/" className="hp-brand font-bold tracking-[.16em] whitespace-nowrap">
          BETTERARCH<b className="text-[#E0825C]">.ORG</b>
        </Link>
        <span className="flex-1" />
        <div className="order-last md:order-none w-full md:w-auto flex items-center justify-between md:justify-end gap-x-4 md:gap-x-6 text-[11px] md:text-[12px]">
          <Link to="/" className="hp-link uppercase text-[#7A7F84] hover:text-[#E4E7EA] transition-colors py-2">Home</Link>
          <Link to="/themes" className="hp-link uppercase text-[#7A7F84] hover:text-[#E4E7EA] transition-colors py-2">Themes</Link>
          <Link to="/essays" className="hp-link uppercase text-[#7A7F84] hover:text-[#E4E7EA] transition-colors py-2">Essays</Link>
          <Link to="/contact" className="hp-link uppercase text-[#7A7F84] hover:text-[#E4E7EA] transition-colors py-2 whitespace-nowrap">Contact Us</Link>
        </div>
        <HeaderSearch variant="dark" />
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1.5 uppercase text-[#A3A8AD] hover:text-white transition-colors border border-white/20 rounded-full px-3 py-1.5"
        >
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </nav>

      {/* corner labels (wide screens) */}
      <div className="hp-shade pointer-events-none absolute z-10 top-[70px] left-8 hidden md:block font-mono text-[10px] tracking-[.16em] uppercase text-[#5d6166] leading-[1.6]">
        [B.A — Spatial Research]<br />New Delhi {clock}
      </div>
      <div className="hp-shade pointer-events-none absolute z-10 top-[70px] right-8 hidden md:block text-right font-mono text-[10px] tracking-[.16em] uppercase text-[#5d6166] leading-[1.6]">
        The eye is made of<br /><b className="text-[#E0825C] font-semibold">{eye.words.length + eye.highlight.length}</b> keywords
      </div>

      {/* hero: centred over the eye */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
        <p className="hp-shade font-mono text-[11px] tracking-[.34em] uppercase text-[#8e9398] mb-3.5">
          A spatial research agency · <span className="text-[#E0825C]">New Delhi · Kolkata</span> · everywhere virtual
        </p>
        <p className="hp-shade font-mono text-[clamp(.8rem,1.5vw,1rem)] tracking-[.42em] uppercase text-[#E4E7EA] mb-1">This is</p>
        <h1 className="font-num font-normal text-[#E0825C] text-[clamp(2.6rem,6.6vw,6.4rem)] leading-[.9] tracking-[.01em] max-w-[16ch] [text-shadow:0_0_40px_rgba(0,0,0,.6)]">
          The Better Architecture Project
        </h1>
        <p className="hp-shade mt-4 font-mono text-[10.5px] tracking-[.3em] uppercase text-[#5d6166]">
          [ Est. 2025 ] &nbsp;·&nbsp; [ Media as a mirror ]
        </p>
        <p className="hp-shade mt-5 font-mono text-[clamp(.85rem,1.4vw,1rem)] leading-[1.7] tracking-[.06em] text-[#A3A8AD] min-h-[1.7em]">
          <TypeSwap lines={['Make Better Architecture for all...', 'Make architecture better for all...']} />
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3.5">
          <Link
            to="/theme/archxmedia"
            className="hp-solid font-mono font-medium text-[11px] tracking-[.18em] uppercase rounded-full px-6 py-3.5
              bg-[#E4E7EA] text-[#060606] hover:brightness-110 transition-all"
          >
            Enter the conversations
          </Link>
          <Link
            to="/about"
            className="hp-ghost font-mono font-medium text-[11px] tracking-[.18em] uppercase rounded-full px-6 py-3.5
              border border-white/20 bg-[#070707]/40 text-[#E4E7EA] hover:bg-white/[.06] hover:border-white/40 hover:-translate-y-0.5 transition-all"
          >
            What is this?
          </Link>
        </div>
      </div>

      {/* footer */}
      <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2 px-6 sm:px-8 py-5 font-mono text-[10.5px] tracking-[.1em] text-[#8e9398]">
        <a href="https://www.linkedin.com/company/betterarch/" target="_blank" rel="noopener" className="hp-link uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">Linkedin</a>
        <span className="text-[#3a3d40]">/</span>
        <a href="https://www.instagram.com/betterarch_org/" target="_blank" rel="noopener" className="hp-link uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">Instagram</a>
        <span className="text-[#3a3d40]">/</span>
        <a href="https://www.x.com/betterarch_org/" target="_blank" rel="noopener" className="hp-link uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">X</a>
        <span className="text-[#3a3d40]">/</span>
        <a href="https://open.spotify.com/show/7glojNr7jxfFlu5FF9RjjF" target="_blank" rel="noopener" className="hp-link uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">Spotify</a>
        <Link to="/about" className="hp-link uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">About Us</Link>
        <span className="text-[#3a3d40]">/</span>
        <Link to="/disclaimer" className="hp-link uppercase text-[#7a7f84] hover:text-[#E4E7EA] transition-colors">Disclaimer</Link>
        <span className="ml-auto uppercase text-[#7a7f84] hidden sm:inline flex items-center gap-1">
          <ChevronDown size={11} className="rotate-180" /> the eye is watching · move your cursor
        </span>
      </div>
    </div>
  );
}
