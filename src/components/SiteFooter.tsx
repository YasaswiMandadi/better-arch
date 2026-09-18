import { DB } from '../data/db';

export default function SiteFooter() {
  return (
    <footer className="border-t border-hair mt-16 pt-6 flex flex-wrap gap-3 items-center font-mono text-[.74rem] leading-[1.7] text-faint">
      {DB.site.socials.map((s, i) => (
        <span key={s[0]} className="flex items-center gap-3">
          <a href={s[1]} target="_blank" rel="noopener" className="text-muted hover:text-deep">{s[0]}</a>
          {i < DB.site.socials.length - 1 && <span className="text-hair">/</span>}
        </span>
      ))}
      <span className="basis-full h-0" />
      <span>{DB.site.footer}</span>
    </footer>
  );
}
