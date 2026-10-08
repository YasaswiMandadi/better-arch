import { Link } from 'react-router-dom';
import { useSiteData } from '../data/store';

export default function SiteFooter() {
  const { data } = useSiteData();
  return (
    <footer className="border-t border-hair mt-16 pt-6 flex flex-wrap gap-3 items-center font-mono text-[.74rem] leading-[1.7] text-faint">
      {data.site.socials.map((s, i) => (
        <span key={s[0]} className="flex items-center gap-3">
          <a href={s[1]} target="_blank" rel="noopener" className="text-muted hover:text-deep">{s[0]}</a>
          {i < data.site.socials.length - 1 && <span className="text-hair">/</span>}
        </span>
      ))}
      <span className="text-hair">/</span>
      <Link to="/about" className="uppercase text-muted hover:text-deep">About Us</Link>
      <span className="text-hair">/</span>
      <Link to="/disclaimer" className="uppercase text-muted hover:text-deep">Disclaimer</Link>
      <span className="basis-full h-0" />
      <span>{data.site.footer}</span>
    </footer>
  );
}
