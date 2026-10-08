/**
 * Turns a title into a URL-friendly slug: lowercase, punctuation stripped,
 * spaces collapsed to single hyphens. Used for theme and collaborator pages
 * that don't have a hand-authored slug of their own.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
