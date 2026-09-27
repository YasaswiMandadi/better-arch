import { DB } from './db';
import { slugify } from '../lib/slug';

/**
 * Collaborators are not a hand-authored list, they're derived directly from
 * the `guest` field already present on every episode. This is deliberate:
 * a guest's name is written once, on the episode, and this module is the
 * only place that turns those names into a de-duplicated, linkable roster.
 * There is nothing here to keep in sync by hand, add a guest to an episode
 * in the console and their collaborator page appears automatically.
 *
 * Bios are intentionally left blank rather than invented. A real bio can be
 * added later (in the console, once collaborator profiles are editable
 * there) without changing this derivation.
 */
export interface Collaborator {
  slug: string;
  name: string;
  bio: string;
  episodeIds: string[];
}

function buildCollaborators(): Collaborator[] {
  const bySlug = new Map<string, Collaborator>();
  for (const ep of DB.episodes) {
    const guest = (ep as { guest: string }).guest;
    if (!guest) continue;
    const slug = slugify(guest);
    const existing = bySlug.get(slug);
    if (existing) {
      existing.episodeIds.push(ep.id);
    } else {
      bySlug.set(slug, { slug, name: guest, bio: '', episodeIds: [ep.id] });
    }
  }
  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export const COLLABORATORS: Collaborator[] = buildCollaborators();

export function getCollaborator(slug: string): Collaborator | undefined {
  return COLLABORATORS.find((c) => c.slug === slug);
}

export function collaboratorSlugForGuest(guest: string): string {
  return slugify(guest);
}

/** Collaborators who appear in at least one episode belonging to the given category (season). */
export function collaboratorsForSeason(seasonSlug: string): Collaborator[] {
  const idsInSeason = new Set<string>(
    DB.episodes.filter((e) => (e as { season: string }).season === seasonSlug).map((e) => e.id)
  );
  return COLLABORATORS.filter((c) => c.episodeIds.some((id) => idsInSeason.has(id)));
}
