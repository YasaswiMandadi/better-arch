import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { THEMES_PAGE_DEFAULTS, themesPageCopy } from '../../data/pageCopy';
import type { CtaBlock, ThemesPageCopy } from '../../data/types';
import { Btn, Field, MoveBtn, Panel, PanelNote, PanelTitle, Rich, StatusPill, TextArea, TextInput, VHead } from '../components/ui';
import CtaEditor from '../components/CtaEditor';
import { createTheme } from '../lib/create';

/**
 * Backend for the public Themes Masterpage (/themes), per the client's spec:
 *  1. Page header title (text box 01)   2. Page header description (text box 02)
 *  3. "+ Add Theme" (opens the Theme backend template) with "Go to Theme Repository" beside it
 *  4. Every Theme currently published (the cards on the page come from the Themes themselves)
 *  5. "Propose a Project" section: title (01), description (02), button
 *  6. "A Better Vision" section: same as above
 * Saved in site.themesPage; empty fields fall back to the page's original wording.
 */
export default function ThemesPageEditor() {
  const { go, toast } = useConsole();
  const { data, update } = useSiteData();
  const copy = themesPageCopy(data.site);
  const published = data.themes.filter((t) => t.status === 'published');
  const drafts = data.themes.length - published.length;

  function setCopy(fn: (c: ThemesPageCopy) => void) {
    update((d) => {
      const c: ThemesPageCopy = d.site.themesPage ?? (d.site.themesPage = {});
      fn(c);
    });
  }
  const setBlock = (key: 'propose' | 'vision') => (patch: Partial<CtaBlock>) =>
    setCopy((c) => { c[key] = { ...(c[key] ?? {}), ...patch }; });

  function resetHeader() {
    if (!window.confirm('Reset the page title and description to the original wording?')) return;
    setCopy((c) => { delete c.eyebrow; delete c.title; delete c.intro; });
    toast('Page header reset.');
  }
  function resetBlock(key: 'propose' | 'vision') {
    if (!window.confirm('Reset this section to its original wording and button?')) return;
    setCopy((c) => { delete c[key]; });
    toast('Section reset.');
  }

  /** Moves a published theme up/down among the published ones (the order of the cards on /themes). */
  function move(slug: string, dir: -1 | 1) {
    update((d) => {
      const pubIdx = d.themes.map((t, i) => (t.status === 'published' ? i : -1)).filter((i) => i >= 0);
      const at = d.themes.findIndex((t) => t.slug === slug);
      const k = pubIdx.indexOf(at);
      const other = pubIdx[k + dir];
      if (k < 0 || other === undefined) return;
      [d.themes[at], d.themes[other]] = [d.themes[other], d.themes[at]];
    });
  }

  function addTheme() {
    const slug = createTheme(data, update);
    go('themeEditor', slug);
  }

  return (
    <div>
      <VHead
        title="Themes page"
        sub="Everything visitors read on the Themes masterpage (/themes). The theme cards themselves come from the Themes you add; the text around them is edited here. Changes save instantly."
      >
        <a href="/themes" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-sans font-semibold rounded-full border text-[13px] px-4 py-2.5 bg-card !text-ink border-hair hover:border-rust transition-colors" style={{ color: "var(--ink)" }}>
          View page ↗
        </a>
      </VHead>

      <Panel>
        <PanelTitle num="01" title="Page header" right={<Btn size="sm" onClick={resetHeader}>Reset to original</Btn>} />
        <PanelNote>The top of the page. Leave a box empty to go back to its original wording.</PanelNote>
        <Field label="Small label above the title" hint={`Original: "${THEMES_PAGE_DEFAULTS.eyebrow}"`}>
          <TextInput value={copy.eyebrow} onChange={(e) => setCopy((c) => { c.eyebrow = (e.target as any).value; })} />
        </Field>
        <Field label="Page title (text box 01)">
          <TextInput value={copy.title} onChange={(e) => setCopy((c) => { c.title = (e.target as any).value; })} />
        </Field>
        <Field label="Page description (text box 02)" hint="Original: the site's tagline.">
          <TextArea value={copy.intro} onChange={(e) => setCopy((c) => { c.intro = (e.target as any).value; })} />
        </Field>
      </Panel>

      <Panel>
        <PanelTitle
          num="02"
          title={`Themes on the page (${published.length} published)`}
          right={
            <div className="flex flex-wrap gap-2">
              <Btn variant="primary" size="sm" onClick={addTheme}>+ Add Theme</Btn>
              <Btn size="sm" onClick={() => go('themes')}>Go to Theme Repository</Btn>
            </div>
          }
        />
        <PanelNote>
          These cards appear on /themes, in this order. Use the arrows to reorder; open a theme to edit its card text, colours and page.
          {drafts > 0 && <> {drafts} draft theme{drafts === 1 ? ' is' : 's are'} hidden until published.</>}
        </PanelNote>
        {published.length === 0 ? (
          <p className="text-muted text-[14px]">No published themes yet. Add a theme and publish it to show it here.</p>
        ) : (
          <ol className="border border-hair rounded-md overflow-hidden">
            {published.map((t, i) => (
              <li key={t.slug} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-hair2 last:border-none bg-card">
                <span className="font-mono text-[11px] text-faint w-5 text-right">{i + 1}</span>
                <span className="w-3 h-3 rounded-full border border-hair shrink-0" style={{ background: t.lightHex }} />
                <span className="font-mono text-[12px] font-semibold text-rust">{t.no}</span>
                <span className="flex-1 min-w-0 truncate font-display italic text-[16px]"><Rich html={t.title} /></span>
                <StatusPill status="published" />
                <span className="flex gap-1">
                  <MoveBtn dir="up" label="Move up" disabled={i === 0} onClick={() => move(t.slug, -1)} />
                  <MoveBtn dir="down" label="Move down" disabled={i === published.length - 1} onClick={() => move(t.slug, 1)} />
                </span>
                <Btn size="sm" onClick={() => go('themeEditor', t.slug)}>Edit</Btn>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel>
        <PanelTitle num="03" title="Propose a Project section" right={<Btn size="sm" onClick={() => resetBlock('propose')}>Reset to original</Btn>} />
        <CtaEditor value={copy.propose} onChange={setBlock('propose')} />
      </Panel>

      <Panel>
        <PanelTitle num="04" title="A Better Vision section" right={<Btn size="sm" onClick={() => resetBlock('vision')}>Reset to original</Btn>} />
        <CtaEditor value={copy.vision} onChange={setBlock('vision')} />
      </Panel>
    </div>
  );
}
