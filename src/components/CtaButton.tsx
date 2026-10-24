import { Link } from 'react-router-dom';
import { isInternalHref } from '../data/pageCopy';
import type { CtaBlock } from '../data/types';

/** A master-page button: inside links use the router, outside links open in a new tab. Empty label = no button. */
export default function CtaButton({ cta, solid }: { cta: CtaBlock; solid?: boolean }) {
  if (!cta.buttonLabel.replace(/<[^>]*>/g, '').trim() || !cta.buttonHref.trim()) return null;
  const cls = solid
    ? 'inline-flex items-center gap-2 font-head font-bold text-[.82rem] bg-ink text-paper rounded-lg px-5 py-3 hover:bg-deep hover:text-white transition-colors'
    : 'inline-flex items-center gap-2 font-head font-bold text-[.82rem] border border-hair rounded-lg px-5 py-3 hover:border-muted transition-colors';
  const label = <span dangerouslySetInnerHTML={{ __html: cta.buttonLabel }} />;
  return isInternalHref(cta.buttonHref)
    ? <Link to={cta.buttonHref} className={cls}>{label}</Link>
    : <a href={cta.buttonHref} target="_blank" rel="noopener" className={cls}>{label}</a>;
}

