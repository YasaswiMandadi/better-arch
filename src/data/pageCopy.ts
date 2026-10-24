import type { CtaBlock, EssaysPageCopy, SiteSettings, ThemesPageCopy } from './types';

/**
 * Text of the Themes (/themes) and Essays (/essays) masterpages. The console's
 * "Themes page" / "Essays page" editors save overrides in site.themesPage /
 * site.essaysPage; anything not set falls back to these defaults, which are the
 * wording the pages had before they became editable — so nothing changes until
 * the client edits a field.
 */

export const THEMES_PAGE_DEFAULTS = {
  eyebrow: 'Themes',
  title: "Every conversation sorted by what it's actually about.",
  // intro defaults to the site tagline (site.line), as before
  propose: {
    show: true,
    title: 'Propose a Project',
    desc: "Have an idea for a Theme or a season we haven't covered? Pitch it — the sharper the provocation, the better.",
    buttonLabel: 'Propose a project',
    buttonHref: '/contact#propose-a-project',
  } as CtaBlock,
  vision: {
    show: true,
    title: 'A Better Vision',
    desc:
      "BetterArch.org exists on the bet that architecture gets better when the media around it gets more honest. That's a standing invitation, not a finished project — there's always another gap in the record, another voice missing from the conversation.",
    buttonLabel: 'How can I contribute?',
    buttonHref: '/contact#contribute',
  } as CtaBlock,
};

export const ESSAYS_PAGE_DEFAULTS = {
  eyebrow: 'Essays',
  title: 'Writing, alongside the conversations.',
  intro: 'Essays published across every Theme, in one place.',
  cta: {
    show: false,
    title: 'Write for BetterArch',
    desc: 'Have an essay that belongs alongside these conversations? Tell us what you want to write.',
    buttonLabel: 'Pitch an essay',
    buttonHref: '/contact#contribute',
  } as CtaBlock,
};

const pick = (v: string | undefined, d: string) => (typeof v === 'string' && v.trim() !== '' ? v : d);
const cta = (v: Partial<CtaBlock> | undefined, d: CtaBlock): CtaBlock => ({
  show: typeof v?.show === 'boolean' ? v.show : d.show,
  title: pick(v?.title, d.title),
  desc: pick(v?.desc, d.desc),
  buttonLabel: typeof v?.buttonLabel === 'string' ? v.buttonLabel : d.buttonLabel, // may be emptied to hide the button
  buttonHref: pick(v?.buttonHref, d.buttonHref),
});

export interface ResolvedThemesPage { eyebrow: string; title: string; intro: string; propose: CtaBlock; vision: CtaBlock }
export interface ResolvedEssaysPage { eyebrow: string; title: string; intro: string; cta: CtaBlock }

export function themesPageCopy(site: SiteSettings): ResolvedThemesPage {
  const c: ThemesPageCopy = site.themesPage ?? {};
  return {
    eyebrow: pick(c.eyebrow, THEMES_PAGE_DEFAULTS.eyebrow),
    title: pick(c.title, THEMES_PAGE_DEFAULTS.title),
    intro: pick(c.intro, site.line ?? ''),
    propose: cta(c.propose, THEMES_PAGE_DEFAULTS.propose),
    vision: cta(c.vision, THEMES_PAGE_DEFAULTS.vision),
  };
}

export function essaysPageCopy(site: SiteSettings): ResolvedEssaysPage {
  const c: EssaysPageCopy = site.essaysPage ?? {};
  return {
    eyebrow: pick(c.eyebrow, ESSAYS_PAGE_DEFAULTS.eyebrow),
    title: pick(c.title, ESSAYS_PAGE_DEFAULTS.title),
    intro: pick(c.intro, ESSAYS_PAGE_DEFAULTS.intro),
    cta: cta(c.cta, ESSAYS_PAGE_DEFAULTS.cta),
  };
}

/** True for links that stay inside the site (rendered with the router); others open in a new tab. */
export const isInternalHref = (href: string) => href.startsWith('/') && !href.startsWith('//');

/** Removes HTML tags (rich-text fields) for places that need plain text, e.g. card previews. */
export const plainText = (html: string) =>
  html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
