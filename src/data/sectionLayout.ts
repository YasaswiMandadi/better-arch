/**
 * Page-section layout: which headings a published page shows, and in what
 * order. Stored on the record itself (episode, theme, sub-theme) as
 * `sectionLayout`, edited from the console's "Page sections" panel and read
 * by the public page. A record with no layout behaves exactly as before —
 * every section on, in the default order.
 */
export interface SectionLayout {
  /** Section keys in the order they should appear. Keys that are missing
   * (e.g. a section added in a later release) fall in after these, in their
   * default order; unknown keys are ignored. */
  order?: string[];
  /** Section keys that are switched off — not rendered on the public page. */
  hidden?: string[];
}

export interface SectionDef {
  key: string;
  /** Heading as shown in the console panel and on the page. */
  label: string;
  /** Shorter text for the page's side navigator (defaults to label). */
  nav?: string;
}

/** Every section, in the order the page should show them (hidden ones included). */
export function orderedKeys(defs: SectionDef[], layout?: SectionLayout | null): string[] {
  const known = new Set(defs.map((d) => d.key));
  const out: string[] = [];
  for (const k of layout?.order ?? []) if (known.has(k) && !out.includes(k)) out.push(k);
  for (const d of defs) if (!out.includes(d.key)) out.push(d.key);
  return out;
}

export function isSectionHidden(layout: SectionLayout | null | undefined, key: string): boolean {
  return !!layout?.hidden?.includes(key);
}

/** The sections a public page should actually render, in order. `available`
 * lets a page drop sections that have nothing to show regardless of layout. */
export function visibleKeys(defs: SectionDef[], layout?: SectionLayout | null, available?: (key: string) => boolean): string[] {
  return orderedKeys(defs, layout).filter((k) => !isSectionHidden(layout, k) && (!available || available(k)));
}

export const sectionNum = (i: number) => String(i + 1).padStart(2, '0');

/** Layout after moving `key` to position `to` (index into the full ordered list). */
export function moveSection(defs: SectionDef[], layout: SectionLayout | undefined, key: string, to: number): SectionLayout {
  const keys = orderedKeys(defs, layout);
  const from = keys.indexOf(key);
  if (from < 0) return { order: keys, hidden: layout?.hidden ?? [] };
  const clamped = Math.max(0, Math.min(keys.length - 1, to));
  keys.splice(from, 1);
  keys.splice(clamped, 0, key);
  return { order: keys, hidden: layout?.hidden ?? [] };
}

/** Layout after switching a section on or off. */
export function setSectionHidden(defs: SectionDef[], layout: SectionLayout | undefined, key: string, hidden: boolean): SectionLayout {
  const set = new Set(layout?.hidden ?? []);
  if (hidden) set.add(key);
  else set.delete(key);
  return { order: orderedKeys(defs, layout), hidden: defs.map((d) => d.key).filter((k) => set.has(k)) };
}

/** True when the layout differs from "everything on, default order". */
export function isCustomLayout(defs: SectionDef[], layout?: SectionLayout | null): boolean {
  if (!layout) return false;
  if (layout.hidden?.some((k) => defs.some((d) => d.key === k))) return true;
  const keys = orderedKeys(defs, layout);
  return keys.some((k, i) => k !== defs[i].key);
}

/* ---- the three page types ---- */

export const EPISODE_SECTIONS: SectionDef[] = [
  { key: 'reading', label: 'A Reading of the Conversation', nav: 'A Reading of the Conversation' },
  { key: 'lexical', label: 'Lexical Terrain' },
  { key: 'themes', label: 'Key Themes', nav: 'Key Themes Explained' },
  { key: 'phrases', label: 'Selected Highlights / Quotes', nav: 'Key Phrases & Codes' },
  { key: 'lived', label: 'Lived Experience' },
  { key: 'sentiment', label: 'Sentiment Register' },
  { key: 'criticality', label: 'Criticality Register' },
  { key: 'references', label: 'References' },
  { key: 'related', label: 'Related Episodes & Material', nav: 'Related & materials' },
  { key: 'collaborators', label: 'Collaborators' },
  { key: 'spectacle', label: 'SPECTACLE profile' },
  { key: 'cite', label: 'Cite this episode' },
];

export const THEME_SECTIONS: SectionDef[] = [
  { key: 'about', label: 'About this theme' },
  { key: 'investigators', label: 'Investigator Team' },
  { key: 'concepts', label: 'Key Concepts' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'subthemes', label: 'Sub-themes' },
  { key: 'essays', label: 'Essays' },
  { key: 'future', label: 'Future Directions' },
  { key: 'collaborators', label: 'Collaborators' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'links', label: 'Further reading' },
];

export const SUBTHEME_SECTIONS: SectionDef[] = [
  { key: 'about', label: 'About this sub-theme' },
  { key: 'episodes', label: 'Episodes' },
  { key: 'essays', label: 'Essays' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'collaborators', label: 'Collaborators' },
  { key: 'tertiary', label: 'Tertiary themes' },
];
