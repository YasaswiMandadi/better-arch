import InnerLayout from '../components/InnerLayout';
import SiteFooter from '../components/SiteFooter';
import ExpandableCard from '../components/ExpandableCard';
import { useSiteData } from '../data/store';
import { themesPageCopy } from '../data/pageCopy';
import CtaButton from '../components/CtaButton';

/**
 * The Themes Masterpage — reached from the header's "Themes" link. Lists
 * every published Theme as a compact/expanded card, plus the "Propose a
 * Project" and "A Better Vision" sections. The page's own text (header,
 * description, both sections and their buttons) is edited in the console's
 * "Themes page" editor (site.themesPage); the cards come from the Themes.
 */
export default function ThemesMasterpage() {
  const { data } = useSiteData();
  const themes = data.themes.filter((t) => t.status === 'published');
  const copy = themesPageCopy(data.site);
  const strip = (h: string) => h.replace(/<[^>]*>/g, '').trim();

  const items = [
    { label: 'Themes', href: '#themes' },
    ...(copy.propose.show ? [{ label: strip(copy.propose.title) || 'Propose a Project', href: '#propose' }] : []),
    ...(copy.vision.show ? [{ label: strip(copy.vision.title) || 'A Better Vision', href: '#vision' }] : []),
  ].map((it, i) => ({ ...it, num: String(i + 1).padStart(2, '0') }));

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5" dangerouslySetInnerHTML={{ __html: copy.eyebrow }} />
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4" dangerouslySetInnerHTML={{ __html: copy.title }} />
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]" dangerouslySetInnerHTML={{ __html: copy.intro }} />

      <section id="themes" className="mt-12">
        <div className="grid sm:grid-cols-2 gap-4">
          {themes.map((t) => {
            const topKeywords = t.keywords.length
              ? t.keywords.slice(0, 5).map((k) => k.word)
              : Array.from(
                  new Set(t.subThemes.flatMap((st) => (st.keywords ?? []).map((k) => k.word)))
                ).slice(0, 5);
            return (
              <ExpandableCard
                key={t.slug}
                title={t.title}
                shortDesc={t.one}
                longDesc={t.summary.join(' ')}
                meta={`${t.period} · ${t.statusLabel}`}
                keywords={topKeywords}
                to={`/theme/${t.slug}`}
                darkHex={t.darkHex}
                lightHex={t.lightHex}
              />
            );
          })}
        </div>
        {themes.length === 0 && <p className="text-muted">No themes published yet.</p>}
      </section>

      {copy.propose.show && (
        <section id="propose" className="mt-14 border-t border-hair pt-9">
          <div className="bg-card border border-hair border-t-[3px] border-t-red rounded-[10px] px-6.5 py-6 shadow-[var(--sh)]">
            <h2 className="font-head font-extrabold text-[1.4rem] tracking-tight mb-2.5" dangerouslySetInnerHTML={{ __html: copy.propose.title }} />
            <p className="text-[.97rem] leading-[1.6] text-muted max-w-[60ch] mb-4" dangerouslySetInnerHTML={{ __html: copy.propose.desc }} />
            <CtaButton cta={copy.propose} solid />
          </div>
        </section>
      )}

      {copy.vision.show && (
        <section id="vision" className="mt-9 border-t border-hair pt-9">
          <h2 className="font-head font-extrabold text-[1.4rem] tracking-tight mb-2.5" dangerouslySetInnerHTML={{ __html: copy.vision.title }} />
          <p className="text-[.97rem] leading-[1.6] max-w-[64ch] mb-4" dangerouslySetInnerHTML={{ __html: copy.vision.desc }} />
          <CtaButton cta={copy.vision} />
        </section>
      )}

      <SiteFooter page="themes" />
    </InnerLayout>
  );
}
