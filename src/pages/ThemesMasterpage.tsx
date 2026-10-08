import { Link } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import SiteFooter from '../components/SiteFooter';
import ExpandableCard from '../components/ExpandableCard';
import { useSiteData } from '../data/store';

/**
 * The Themes Masterpage — reached from the header's "Themes" link. Lists
 * every published Theme as a compact/expanded card, plus the "Propose a
 * Project" and "A Better Vision" sections, per the doc's Theme Masterpage
 * spec.
 */
export default function ThemesMasterpage() {
  const { data } = useSiteData();
  const themes = data.themes.filter((t) => t.status === 'published');

  const items = [
    { num: '01', label: 'Themes', href: '#themes' },
    { num: '02', label: 'Propose a Project', href: '#propose' },
    { num: '03', label: 'A Better Vision', href: '#vision' },
  ];

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">Themes</p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">
        Every conversation sorted by what it's actually about.
      </h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">
        {data.site.line}
      </p>

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

      <section id="propose" className="mt-14 border-t border-hair pt-9">
        <div className="bg-card border border-hair border-t-[3px] border-t-red rounded-[10px] px-6.5 py-6 shadow-[var(--sh)]">
          <h2 className="font-head font-extrabold text-[1.4rem] tracking-tight mb-2.5">Propose a Project</h2>
          <p className="text-[.97rem] leading-[1.6] text-muted max-w-[60ch] mb-4">
            Have an idea for a Theme or a season we haven't covered? Pitch it — the sharper the provocation, the better.
          </p>
          <Link to="/contact#propose-a-project" className="inline-flex items-center gap-2 font-head font-bold text-[.82rem] bg-ink text-paper rounded-lg px-5 py-3 hover:bg-deep hover:text-white transition-colors">
            Propose a project
          </Link>
        </div>
      </section>

      <section id="vision" className="mt-9 border-t border-hair pt-9">
        <h2 className="font-head font-extrabold text-[1.4rem] tracking-tight mb-2.5">A Better Vision</h2>
        <p className="text-[.97rem] leading-[1.6] max-w-[64ch] mb-4">
          BetterArch.org exists on the bet that architecture gets better when the media around it gets more honest.
          That's a standing invitation, not a finished project — there's always another gap in the record, another
          voice missing from the conversation.
        </p>
        <Link to="/contact#contribute" className="inline-flex items-center gap-2 font-head font-bold text-[.82rem] border border-hair rounded-lg px-5 py-3 hover:border-muted transition-colors">
          How can I contribute?
        </Link>
      </section>

      <SiteFooter />
    </InnerLayout>
  );
}
