import type { Collaborator, SiteDB } from '../../data/types'
import { slugify } from '../../lib/slug'

/**
 * Collaborators are linked by NAME on the site: an episode's `guest`, an essay's `author`
 * (matched through slugify(name)), and by slug in a theme's `investigatorSlugs`. These helpers
 * keep all three in step when a collaborator is created, renamed or deleted.
 */

/** Makes sure an explicit record exists for this collaborator (one implied only by a guest/author name gets one). */
export function ensureRecord(d: SiteDB, slug: string, name: string): Collaborator {
  let c = d.collaborators.find((x) => x.slug === slug)
  if (!c) {
    c = { slug, name, bio: '' }
    d.collaborators.push(c)
  }
  return c
}

/** Renames everywhere. Returns the new slug. Caller checks the new slug is free first. */
export function renameCollaborator(d: SiteDB, oldSlug: string, oldName: string, newName: string): string {
  const newSlug = slugify(newName)
  const rec = ensureRecord(d, oldSlug, oldName)
  rec.name = newName
  rec.slug = newSlug
  for (const e of d.episodes) if (e.guest && slugify(e.guest) === oldSlug) e.guest = newName
  for (const es of d.essays) if (es.author && slugify(es.author) === oldSlug) es.author = newName
  for (const t of d.themes) t.investigatorSlugs = t.investigatorSlugs.map((s) => (s === oldSlug ? newSlug : s))
  return newSlug
}

/** Removes the record and every link to this collaborator (guest/author fields are emptied). */
export function deleteCollaborator(d: SiteDB, slug: string) {
  d.collaborators = d.collaborators.filter((c) => c.slug !== slug)
  for (const e of d.episodes) if (e.guest && slugify(e.guest) === slug) e.guest = ''
  for (const es of d.essays) if (es.author && slugify(es.author) === slug) es.author = ''
  for (const t of d.themes) t.investigatorSlugs = t.investigatorSlugs.filter((s) => s !== slug)
}
