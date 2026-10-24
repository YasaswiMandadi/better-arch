import InnerLayout from '../components/InnerLayout';
import SiteFooter from '../components/SiteFooter';
import ExpandableCard from '../components/ExpandableCard';
import CtaButton from '../components/CtaButton';
import { useSiteData } from '../data/store';
import { essaysPageCopy, plainText } from '../data/pageCopy';
import { isEssayPublished } from '../data/types';

/**
 * The Essays Masterpage — reached from the header's "Essays" link: every published essay as a
 * compact/expanded card. The page's own text (header, description, optional call-to-action) is
 * edited in the console's "Essays page" editor (site.essaysPage).
 */
export default function EssaysMasterpage() {
  const { data } = useSiteData();
  const copy = essaysPageCopy(data.site);
  const essays = data.essays.filter(isEssayPublished);
  const themeTitle = (slug: string) => plainText(data.themes.find((t) => t.slug === slug)?.title ?? '') || slug;
  const items = [
    { num: '01', label: 'Essays', href: '#essays' },
    ...(copy.cta.show ? [{ num: '02', label: plainText(copy.cta.title) || 'More', href: '#essays-cta' }] : []),
  ];

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5" dangerouslySetInnerHTML={{ __html: copy.eyebrow }} />
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4" dangerouslySetInnerHTML={{ __html: copy.title }} />
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]" dangerouslySetInnerHTML={{ __html: copy.intro }} />

      <section id="essays" className="mt-12">
        <div className="grid sm:grid-cols-2 gap-4">
          {essays.map((es) => (
            <ExpandableCard
              key={es.id}
              title={es.title}
              shortDesc={es.sub}
              longDesc={plainText(es.body.join(' '))}
              meta={`${themeTitle(es.season)}${es.author ? ` · by ${es.author}` : ''}`}
              keywords={(es.keywords ?? []).map((k) => k.word)}
              to={`/essay/${es.slug}`}
            />
          ))}
        </div>
        {essays.length === 0 && <p className="text-muted">No essays published yet.</p>}
      </section>

      {copy.cta.show && (
        <section id="essays-cta" className="mt-14 border-t border-hair pt-9">
          <div className="bg-card border border-hair border-t-[3px] border-t-red rounded-[10px] px-6.5 py-6 shadow-[var(--sh)]">
            <h2 className="font-head font-extrabold text-[1.4rem] tracking-tight mb-2.5" dangerouslySetInnerHTML={{ __html: copy.cta.title }} />
            <p className="text-[.97rem] leading-[1.6] text-muted max-w-[60ch] mb-4" dangerouslySetInnerHTML={{ __html: copy.cta.desc }} />
            <CtaButton cta={copy.cta} solid />
          </div>
        </section>
      )}

      <SiteFooter />
    </InnerLayout>
  );
}
