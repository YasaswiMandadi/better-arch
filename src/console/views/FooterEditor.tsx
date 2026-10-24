import { useMemo, useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import type { SiteDB } from '../../data/types';
import { isEpisodePublished, isEssayPublished } from '../../data/types';
import {
  DEFAULT_FOOTER_LINKS, FOOTER_PAGES, defaultFooter, resolveFooter, safeHref,
  type FooterConfig, type FooterLink, type FooterPageKey, type FooterSettings,
} from '../../data/footer';
import { Btn, Field, MoveBtn, Panel, PanelNote, PanelTitle, PlainInput, Toggle, VHead } from '../components/ui';
import { collectKeywordRows } from '../lib/keywordsAdmin';

/**
 * Footer screen: the site-wide footer, and an optional "own footer" for any page type.
 * The default's social links and copyright are the same values the site always used
 * (site.socials, also shown in the side menu, and site.footer). The "Designed & developed
 * by PTG" credit is fixed and cannot be edited here.
 */
export default function FooterEditor() {
  const { toast } = useConsole();
  const { data, update } = useSiteData();
  const def = defaultFooter(data.site);
  const [openKey, setOpenKey] = useState<FooterPageKey | null>(null);
  const samples = useMemo(() => samplePaths(data), [data]);

  function settings(d: SiteDB): FooterSettings {
    return (d.site.footerSettings ??= {});
  }
  function setDefault(next: FooterConfig) {
    update((d) => {
      d.site.socials = next.socials.map(([a, b]) => [a, b] as [string, string]);
      d.site.footer = next.copyright;
      const s = settings(d);
      s.default = { ...(s.default ?? {}), show: next.show, links: next.links.map((l) => ({ ...l })) };
    });
  }
  function setPage(key: FooterPageKey, next: FooterConfig) {
    update((d) => {
      const s = settings(d);
      s.pages = { ...(s.pages ?? {}), [key]: { custom: true, ...clone(next) } };
    });
  }
  function setCustom(key: FooterPageKey, on: boolean) {
    update((d) => {
      const s = settings(d);
      const pages = { ...(s.pages ?? {}) };
      if (on) {
        // keep an earlier own footer if there is one; otherwise start from the default
        const prev = pages[key];
        pages[key] = prev && (prev.socials || prev.links || prev.copyright !== undefined) ? { ...prev, custom: true } : { custom: true, ...clone(defaultFooter(d.site)) };
      } else if (pages[key]) {
        pages[key] = { ...pages[key], custom: false };
      }
      s.pages = pages;
    });
    if (on) setOpenKey(key);
    toast(on ? 'This page type now has its own footer.' : 'This page type follows the default footer again.');
  }
  function copyDefault(key: FooterPageKey) {
    if (!window.confirm('Replace this page type\'s footer with a copy of the default footer?')) return;
    setPage(key, defaultFooter(data.site));
    toast('Copied from the default footer.');
  }
  function resetLinks() {
    if (!window.confirm('Put the footer links back to "About Us" and "Disclaimer"?')) return;
    setDefault({ ...def, links: DEFAULT_FOOTER_LINKS.map((l) => ({ ...l })) });
  }

  const customCount = FOOTER_PAGES.filter((p) => resolveFooter(data.site, p.key).custom).length;

  return (
    <div>
      <VHead
        title="Footer"
        sub="The footer at the bottom of every page: social links, page links and the copyright line. Set the default once; give any page type its own footer if it should differ. Changes save instantly."
      />

      <Panel>
        <PanelTitle num="01" title="Default footer (all pages)" right={<Toggle checked={def.show} onChange={(v) => setDefault({ ...def, show: v })} label={def.show ? 'Shown' : 'Hidden'} />} />
        <PanelNote>
          Used on every page type that doesn't have its own footer ({FOOTER_PAGES.length - customCount} of {FOOTER_PAGES.length} right now).
          The social links here also appear in the site's side menu.
        </PanelNote>
        <FooterFields value={def} onChange={setDefault} onResetLinks={resetLinks} />
        <FooterPreview value={def} />
      </Panel>

      <Panel>
        <PanelTitle num="02" title="Footer per page type" />
        <PanelNote>
          Switch on <b>Own footer</b> for a page type to give it a different footer; it starts as a copy of the default.
          Switch it off to go back to the default (its own version is kept in case you switch it on again).
        </PanelNote>
        <ul className="border border-hair rounded-md overflow-hidden">
          {FOOTER_PAGES.map((p) => {
            const f = resolveFooter(data.site, p.key);
            const open = openKey === p.key && f.custom;
            const sample = samples[p.key];
            return (
              <li key={p.key} className="border-b border-hair2 last:border-none bg-card">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3">
                  <span className="flex-1 min-w-[160px]">
                    <span className="block font-sans text-[14px] font-semibold text-ink">{p.label}</span>
                    <span className="block font-mono text-[11px] text-faint">
                      {p.hint} · {f.custom ? (f.show ? 'own footer' : 'own footer, hidden') : 'default footer'}
                    </span>
                  </span>
                  {sample && (
                    <a href={sample} target="_blank" rel="noopener" className="font-sans text-[12px] font-semibold text-muted hover:text-rust">View ↗</a>
                  )}
                  <Toggle checked={f.custom} onChange={(v) => setCustom(p.key, v)} label="Own footer" />
                  {f.custom && (
                    <Btn size="sm" onClick={() => setOpenKey(open ? null : p.key)} aria-expanded={open}>{open ? 'Close' : 'Edit'}</Btn>
                  )}
                </div>
                {open && (
                  <div className="px-3.5 pb-4 pt-1 border-t border-hair2 bg-paper/50">
                    <div className="flex flex-wrap items-center gap-3 py-3">
                      <Toggle checked={f.show} onChange={(v) => setPage(p.key, { ...f, show: v })} label={f.show ? 'Footer shown' : 'Footer hidden'} />
                      <span className="flex-1" />
                      <Btn size="sm" onClick={() => copyDefault(p.key)}>Copy the default again</Btn>
                    </div>
                    <FooterFields value={f} onChange={(next) => setPage(p.key, next)} />
                    <FooterPreview value={f} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel>
        <PanelTitle num="03" title="Developer credit" />
        <PanelNote>
          Every footer ends with “Designed &amp; developed by” and the PTG logo (Pinnacle Tech Group); clicking the logo shows PTG's
          Instagram and email. It is part of the site itself and stays in place even when a footer is hidden, so it isn't edited here.
        </PanelNote>
      </Panel>
    </div>
  );
}

const clone = (f: FooterConfig): FooterConfig => ({
  show: f.show,
  socials: f.socials.map(([a, b]) => [a, b] as [string, string]),
  links: f.links.map((l) => ({ ...l })),
  copyright: f.copyright,
});

/** Example pages to open for each page type (the first published item of that kind). */
function samplePaths(data: SiteDB): Partial<Record<FooterPageKey, string>> {
  const t = data.themes.find((x) => x.status === 'published');
  const st = t?.subThemes?.[0];
  const ep = data.episodes.find(isEpisodePublished);
  const es = data.essays.find(isEssayPublished);
  const kw = collectKeywordRows(data)[0];
  return {
    home: '/', themes: '/themes', episodes: '/episodes', essays: '/essays', about: '/about', disclaimer: '/disclaimer', contact: '/contact',
    theme: t ? `/theme/${t.slug}` : undefined,
    subtheme: t && st ? `/theme/${t.slug}/subtheme/${st.slug}` : undefined,
    episode: ep ? `/episode/${ep.id}` : undefined,
    essay: es ? `/essay/${es.slug}` : undefined,
    keyword: kw ? `/keyword/${kw.slug}` : undefined,
  };
}

function hrefProblem(href: string): string | null {
  if (!href.trim()) return 'Add a link, or this item is not shown.';
  return safeHref(href) ? null : 'Use a web address (https://…), an email (mailto:…) or a site path (/about). This link is not shown until fixed.';
}

/** Social links, page links and copyright for one footer. */
function FooterFields({ value, onChange, onResetLinks }: { value: FooterConfig; onChange: (next: FooterConfig) => void; onResetLinks?: () => void }) {
  const set = (patch: Partial<FooterConfig>) => onChange({ ...value, ...patch });
  const socials = value.socials;
  const links = value.links;

  function moveSocial(i: number, d: -1 | 1) {
    const s = socials.map((x) => [...x] as [string, string]);
    [s[i], s[i + d]] = [s[i + d], s[i]];
    set({ socials: s });
  }
  function moveLink(i: number, d: -1 | 1) {
    const l = links.map((x) => ({ ...x }));
    [l[i], l[i + d]] = [l[i + d], l[i]];
    set({ links: l });
  }

  return (
    <div className={value.show ? '' : 'opacity-60'}>
      <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink/80 mb-2">Social links</h3>
      <ListRows
        rows={socials.map(([label, href]) => ({ label, href }))}
        labelPh="Name, e.g. Instagram"
        hrefPh="https://…"
        onEdit={(i, r) => set({ socials: socials.map((s, k) => (k === i ? [r.label, r.href] : [...s] as [string, string])) })}
        onMove={moveSocial}
        onRemove={(i) => set({ socials: socials.filter((_, k) => k !== i) })}
        addLabel="+ Add social link"
        onAdd={() => set({ socials: [...socials, ['', 'https://']] })}
      />

      <div className="flex items-center gap-3 mt-5 mb-2">
        <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink/80 flex-1">Page links</h3>
        {onResetLinks && <Btn size="sm" onClick={onResetLinks}>Reset to About Us + Disclaimer</Btn>}
      </div>
      <ListRows
        rows={links}
        labelPh="Label, e.g. About Us"
        hrefPh="/about or https://…"
        onEdit={(i, r) => set({ links: links.map((l, k) => (k === i ? r : { ...l })) })}
        onMove={moveLink}
        onRemove={(i) => set({ links: links.filter((_, k) => k !== i) })}
        addLabel="+ Add page link"
        onAdd={() => set({ links: [...links, { label: '', href: '/' }] })}
      />

      <div className="mt-5">
        <Field label="Copyright line" hint="Leave empty to show no copyright line.">
          <PlainInput value={value.copyright} onChange={(e) => set({ copyright: e.target.value })} placeholder="Copyright © 2026 The Better Architecture Project" aria-label="Copyright line" />
        </Field>
      </div>
    </div>
  );
}

function ListRows({
  rows, labelPh, hrefPh, onEdit, onMove, onRemove, onAdd, addLabel,
}: {
  rows: FooterLink[]; labelPh: string; hrefPh: string
  onEdit: (i: number, r: FooterLink) => void; onMove: (i: number, d: -1 | 1) => void; onRemove: (i: number) => void
  onAdd: () => void; addLabel: string
}) {
  return (
    <div>
      {rows.length === 0 && <p className="text-[13px] text-muted mb-2">None.</p>}
      <ol className="space-y-2">
        {rows.map((r, i) => {
          const problem = hrefProblem(r.href);
          return (
            <li key={i} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] gap-2 items-start">
              <PlainInput value={r.label} placeholder={labelPh} aria-label={`${labelPh} (${i + 1})`} onChange={(e) => onEdit(i, { ...r, label: e.target.value })} />
              <div>
                <PlainInput value={r.href} placeholder={hrefPh} aria-label={`Link ${i + 1}`} onChange={(e) => onEdit(i, { ...r, href: e.target.value })} className={problem ? '!border-amber' : ''} />
                {problem && <span className="block text-[12px] text-amber mt-1">{problem}</span>}
              </div>
              <span className="flex gap-1 pt-1.5">
                <MoveBtn dir="up" label="Move up" disabled={i === 0} onClick={() => onMove(i, -1)} />
                <MoveBtn dir="down" label="Move down" disabled={i === rows.length - 1} onClick={() => onMove(i, 1)} />
                <button type="button" aria-label="Remove" onClick={() => onRemove(i)} className="w-7 h-7 grid place-items-center rounded border border-hair bg-card text-muted hover:text-danger hover:border-danger transition-colors">×</button>
              </span>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onAdd} className="mt-2 font-sans text-[12.5px] font-semibold text-rust hover:underline">{addLabel}</button>
    </div>
  );
}

/** How the footer will read on the site (text only; the real one uses the site's fonts and colours). */
function FooterPreview({ value }: { value: FooterConfig }) {
  const items = [
    ...value.socials.filter(([l, u]) => l.trim() && safeHref(u)).map(([l]) => l),
    ...value.links.filter((l) => l.label.trim() && safeHref(l.href)).map((l) => l.label.toUpperCase()),
  ];
  return (
    <div className="mt-5">
      <span className="block font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink/80 mb-1.5">Preview</span>
      <div className="rounded-md border border-hair bg-paper px-4 py-3 font-mono text-[11.5px] leading-[1.8] text-faint" aria-label="Footer preview">
        {value.show ? (
          <>
            <div className="text-muted">{items.length ? items.join('  /  ') : <i className="text-faint">No links</i>}</div>
            <div className="flex flex-wrap justify-between gap-x-6">
              <span>{value.copyright}</span>
              <span>Designed &amp; developed by <b className="text-ink">PTG</b></span>
            </div>
          </>
        ) : (
          <div className="text-right">Footer hidden · only “Designed &amp; developed by <b className="text-ink">PTG</b>” is shown</div>
        )}
      </div>
    </div>
  );
}
