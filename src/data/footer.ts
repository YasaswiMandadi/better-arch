import type { SiteSettings } from './types';

/**
 * The public footer, edited in the console's "Footer" screen.
 *
 * One site-wide default, plus an optional "own footer" per page type. Backwards compatible:
 * the default's social links and copyright line are the existing site.socials / site.footer
 * (the side menu keeps using the same social links), so nothing changes until it is edited.
 *
 * The "Designed & developed by PTG" credit is NOT part of these settings: it is always shown
 * (see components/PtgCredit.tsx).
 */

export type FooterPageKey =
  | 'home' | 'themes' | 'theme' | 'subtheme' | 'episodes' | 'episode'
  | 'essays' | 'essay' | 'keyword' | 'about' | 'disclaimer' | 'contact';

/** Every page type that shows the footer, in menu order. `path` is an example to preview. */
export const FOOTER_PAGES: { key: FooterPageKey; label: string; hint: string }[] = [
  { key: 'home', label: 'Home page', hint: '/' },
  { key: 'themes', label: 'Themes page', hint: '/themes' },
  { key: 'theme', label: 'Each Theme', hint: '/theme/…' },
  { key: 'subtheme', label: 'Each Sub-theme', hint: '/theme/…/subtheme/…' },
  { key: 'episodes', label: 'Episodes list', hint: '/episodes' },
  { key: 'episode', label: 'Each Episode', hint: '/episode/…' },
  { key: 'essays', label: 'Essays page', hint: '/essays' },
  { key: 'essay', label: 'Each Essay', hint: '/essay/…' },
  { key: 'keyword', label: 'Each Keyword', hint: '/keyword/…' },
  { key: 'about', label: 'About Us', hint: '/about' },
  { key: 'disclaimer', label: 'Disclaimer', hint: '/disclaimer' },
  { key: 'contact', label: 'Contact', hint: '/contact' },
];

export interface FooterLink { label: string; href: string }

export interface FooterConfig {
  /** false hides the footer's links and copyright on those pages (the PTG credit stays). */
  show: boolean;
  socials: [string, string][];
  links: FooterLink[];
  copyright: string;
}

/** A page type's own footer: a full copy of the footer, used while `custom` is on. */
export interface FooterPageOverride extends Partial<FooterConfig> { custom?: boolean }

export interface FooterSettings {
  /** The default's on/off switch and its extra links (its socials/copyright live in site.socials / site.footer). */
  default?: { show?: boolean; links?: FooterLink[] };
  pages?: Partial<Record<FooterPageKey, FooterPageOverride>>;
}

export const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: 'About Us', href: '/about' },
  { label: 'Disclaimer', href: '/disclaimer' },
];

/** Only web, email and in-site links are rendered (anything else — e.g. "javascript:" — is ignored). */
export function safeHref(href: string): string | null {
  const h = String(href ?? '').trim();
  if (!h) return null;
  if (h.startsWith('/') && !h.startsWith('//')) return h;
  if (/^https?:\/\/[^\s]+$/i.test(h)) return h;
  if (/^mailto:[^\s]+$/i.test(h)) return h;
  return null;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const cleanSocials = (v: unknown): [string, string][] =>
  Array.isArray(v) ? v.filter((s): s is [string, string] => Array.isArray(s) && typeof s[0] === 'string' && typeof s[1] === 'string').map(([a, b]) => [a, b]) : [];
const cleanLinks = (v: unknown): FooterLink[] =>
  Array.isArray(v) ? v.filter((l): l is FooterLink => !!l && typeof l.label === 'string' && typeof l.href === 'string').map((l) => ({ label: l.label, href: l.href })) : [];

/** The site-wide default footer. */
export function defaultFooter(site: SiteSettings): FooterConfig {
  const d = site.footerSettings?.default ?? {};
  return {
    show: d.show !== false,
    socials: cleanSocials(site.socials),
    links: d.links ? cleanLinks(d.links) : DEFAULT_FOOTER_LINKS.map((l) => ({ ...l })),
    copyright: str(site.footer),
  };
}

/** The footer a page type shows: its own when switched on, otherwise the default. */
export function resolveFooter(site: SiteSettings, page?: FooterPageKey): FooterConfig & { custom: boolean } {
  const base = defaultFooter(site);
  const o = page ? site.footerSettings?.pages?.[page] : undefined;
  if (!o || !o.custom) return { ...base, custom: false };
  return {
    custom: true,
    show: o.show !== false,
    socials: o.socials ? cleanSocials(o.socials) : base.socials,
    links: o.links ? cleanLinks(o.links) : base.links,
    copyright: typeof o.copyright === 'string' ? o.copyright : base.copyright,
  };
}
