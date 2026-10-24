import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useSiteData } from '../data/store';
import { resolveFooter, safeHref, type FooterPageKey } from '../data/footer';
import PtgCredit from './PtgCredit';

/** One footer link: in-site paths use the router, web links open in a new tab, mailto opens the mail app. */
export function FooterAnchor({ label, href, className }: { label: string; href: string; className: string }) {
  const h = safeHref(href);
  if (!h || !label.trim()) return null;
  if (h.startsWith('/')) return <Link to={h} className={className}>{label}</Link>;
  if (h.startsWith('mailto:')) return <a href={h} className={className}>{label}</a>;
  return <a href={h} target="_blank" rel="noopener" className={className}>{label}</a>;
}

/**
 * The footer at the bottom of every inner page. What it shows is edited in the console
 * (Footer screen): a site-wide default, or this page type's own footer.
 */
export default function SiteFooter({ page }: { page?: FooterPageKey }) {
  const { data } = useSiteData();
  const f = resolveFooter(data.site, page);
  const items = [
    ...f.socials.filter(([l, u]) => l.trim() && safeHref(u)).map(([label, href]) => ({ label, href, upper: false })),
    ...f.links.filter((l) => l.label.trim() && safeHref(l.href)).map((l) => ({ ...l, upper: true })),
  ];

  if (!f.show) {
    return (
      <footer className="border-t border-hair mt-16 pt-5 flex justify-end font-mono text-[.7rem] leading-[1.7] text-faint">
        <PtgCredit />
      </footer>
    );
  }

  return (
    <footer className="border-t border-hair mt-16 pt-6 flex flex-wrap gap-3 items-center font-mono text-[.74rem] leading-[1.7] text-faint">
      {items.map((it, i) => (
        <Fragment key={`${it.label}-${i}`}>
          {i > 0 && <span className="text-hair">/</span>}
          <FooterAnchor label={it.label} href={it.href} className={`${it.upper ? 'uppercase ' : ''}text-muted hover:text-deep`} />
        </Fragment>
      ))}
      <span className="basis-full h-0" />
      <span className="w-full flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        {f.copyright.trim() ? <span>{f.copyright}</span> : <span />}
        <PtgCredit className="ml-auto text-[.7rem]" />
      </span>
    </footer>
  );
}
