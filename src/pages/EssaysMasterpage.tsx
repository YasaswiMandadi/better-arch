import InnerLayout from '../components/InnerLayout';
import SiteFooter from '../components/SiteFooter';
import ExpandableCard from '../components/ExpandableCard';
import { useSiteData } from '../data/store';

/**
 * The Essays Masterpage — reached from the header's "Essays" link. The doc
 * names this page in its sitemap but doesn't detail its layout the way it
 * does the Themes Masterpage, so this mirrors that page's card format
 * (compact/expanded) without the Propose a Project / A Better Vision
 * sections, which the doc specifies only for Themes.
 */
export default function EssaysMasterpage() {
  const { data } = useSiteData();
  const themeTitle = (slug: string) => data.themes.find((t) => t.slug === slug)?.title ?? slug;

  const items = [{ num: '01', label: 'Essays', href: '#essays' }];

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">Essays</p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">
        Writing, alongside the conversations.
      </h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">
        Essays published across every Theme, in one place.
      </p>

      <section id="essays" className="mt-12">
        <div className="grid sm:grid-cols-2 gap-4">
          {data.essays.map((es) => (
            <ExpandableCard
              key={es.id}
              title={es.title}
              shortDesc={es.sub}
              longDesc={es.body.join(' ')}
              meta={`${themeTitle(es.season)}${es.author ? ` · by ${es.author}` : ''}`}
              keywords={(es.keywords ?? []).map((k) => k.word)}
              to={`/essay/${es.slug}`}
            />
          ))}
        </div>
        {data.essays.length === 0 && <p className="text-muted">No essays published yet.</p>}
      </section>

      <SiteFooter />
    </InnerLayout>
  );
}
