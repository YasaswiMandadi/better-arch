import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { ESSAYS_PAGE_DEFAULTS, essaysPageCopy } from '../../data/pageCopy';
import type { CtaBlock, EssaysPageCopy } from '../../data/types';
import { isEssayPublished } from '../../data/types';
import { Btn, Field, MoveBtn, Panel, PanelNote, PanelTitle, StatusPill, TextArea, TextInput, VHead } from '../components/ui';
import CtaEditor from '../components/CtaEditor';
import { createEssay } from '../lib/create';

/**
 * Backend for the public Essays Masterpage (/essays): page header (title 01, description 02),
 * the published essays in their order (cards come from the essays themselves), and an optional
 * call-to-action section at the bottom (off by default). Saved in site.essaysPage.
 */
export default function EssaysPageEditor() {
  const { go, toast } = useConsole();
  const { data, update } = useSiteData();
  const copy = essaysPageCopy(data.site);
  const published = data.essays.filter(isEssayPublished);
  const drafts = data.essays.length - published.length;
  const themeTitle = (slug: string) => (data.themes.find((t) => t.slug === slug)?.title ?? '').replace(/<[^>]*>/g, '');

  function setCopy(fn: (c: EssaysPageCopy) => void) {
    update((d) => { fn(d.site.essaysPage ?? (d.site.essaysPage = {})); });
  }
  const setCta = (patch: Partial<CtaBlock>) => setCopy((c) => { c.cta = { ...(c.cta ?? {}), ...patch }; });

  function move(id: string, dir: -1 | 1) {
    update((d) => {
      const pubIdx = d.essays.map((e, i) => (isEssayPublished(e) ? i : -1)).filter((i) => i >= 0);
      const at = d.essays.findIndex((e) => e.id === id);
      const k = pubIdx.indexOf(at);
      const other = pubIdx[k + dir];
      if (k < 0 || other === undefined) return;
      [d.essays[at], d.essays[other]] = [d.essays[other], d.essays[at]];
    });
  }

  return (
    <div>
      <VHead
        title="Essays page"
        sub="Everything visitors read on the Essays masterpage (/essays). The essay cards come from the essays you add; the text around them is edited here. Changes save instantly."
      >
        <a href="/essays" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-sans font-semibold rounded-full border text-[13px] px-4 py-2.5 bg-card !text-ink border-hair hover:border-rust transition-colors" style={{ color: "var(--ink)" }}>View page ↗</a>
      </VHead>

      <Panel>
        <PanelTitle
          num="01"
          title="Page header"
          right={<Btn size="sm" onClick={() => { if (window.confirm('Reset the page header to the original wording?')) { setCopy((c) => { delete c.eyebrow; delete c.title; delete c.intro; }); toast('Page header reset.'); } }}>Reset to original</Btn>}
        />
        <PanelNote>The top of the page. Leave a box empty to go back to its original wording.</PanelNote>
        <Field label="Small label above the title" hint={`Original: "${ESSAYS_PAGE_DEFAULTS.eyebrow}"`}>
          <TextInput value={copy.eyebrow} onChange={(e) => setCopy((c) => { c.eyebrow = (e.target as any).value; })} />
        </Field>
        <Field label="Page title (text box 01)"><TextInput value={copy.title} onChange={(e) => setCopy((c) => { c.title = (e.target as any).value; })} /></Field>
        <Field label="Page description (text box 02)"><TextArea value={copy.intro} onChange={(e) => setCopy((c) => { c.intro = (e.target as any).value; })} /></Field>
      </Panel>

      <Panel>
        <PanelTitle
          num="02"
          title={`Essays on the page (${published.length} published)`}
          right={
            <div className="flex flex-wrap gap-2">
              <Btn variant="primary" size="sm" onClick={() => go('essayEditor', createEssay(data, update))}>+ Add Essay</Btn>
              <Btn size="sm" onClick={() => go('essays')}>Go to Essay Repository</Btn>
            </div>
          }
        />
        <PanelNote>
          These cards appear on /essays, in this order. Use the arrows to reorder.
          {drafts > 0 && <> {drafts} draft essay{drafts === 1 ? ' is' : 's are'} hidden until published.</>}
        </PanelNote>
        {published.length === 0 ? (
          <p className="text-muted text-[14px]">No published essays yet.</p>
        ) : (
          <ol className="border border-hair rounded-md overflow-hidden">
            {published.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-hair2 last:border-none bg-card">
                <span className="font-mono text-[11px] text-faint w-5 text-right">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-display italic text-[16px]">{e.title}</span>
                  <span className="block truncate text-[12px] text-faint font-sans">{[e.author && `by ${e.author}`, themeTitle(e.season)].filter(Boolean).join(' · ')}</span>
                </span>
                <StatusPill status="published" />
                <span className="flex gap-1">
                  <MoveBtn dir="up" label="Move up" disabled={i === 0} onClick={() => move(e.id, -1)} />
                  <MoveBtn dir="down" label="Move down" disabled={i === published.length - 1} onClick={() => move(e.id, 1)} />
                </span>
                <Btn size="sm" onClick={() => go('essayEditor', e.id)}>Edit</Btn>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel>
        <PanelTitle
          num="03"
          title="Call-to-action section (bottom of the page)"
          right={<Btn size="sm" onClick={() => { if (window.confirm('Reset this section to its original wording?')) { setCopy((c) => { delete c.cta; }); toast('Section reset.'); } }}>Reset to original</Btn>}
        />
        <PanelNote>Optional, and hidden until you switch it on: e.g. invite readers to pitch an essay.</PanelNote>
        <CtaEditor value={copy.cta} onChange={setCta} />
      </Panel>
    </div>
  );
}
