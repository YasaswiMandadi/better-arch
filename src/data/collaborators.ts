import type { SiteDB, Collaborator as CollaboratorRecord } from './types';
import { slugify } from '../lib/slug';

export interface Collaborator {
  slug: string;
  name: string;
  designation?: string;
  bio: string;
  episodeIds: string[];
  essayIds: string[];
}

export function collaboratorSlugForName(name: string): string {
  return slugify(name);
}

/**
 * Builds the full collaborator roster: explicit collaborators added in the
 * console, merged with ones implied by an episode guest or essay author that
 * doesn't yet have an explicit record. Either way the result is keyed by
 * slug, so console-authored bio/designation always wins over the derived
 * stub.
 */
export function buildCollaboratorRoster(data: SiteDB): Collaborator[] {
  const bySlug = new Map<string, Collaborator>();

  for (const c of data.collaborators) {
    bySlug.set(c.slug, { ...c, episodeIds: [], essayIds: [] });
  }

  for (const ep of data.episodes) {
    if (!ep.guest) continue;
    const slug = slugify(ep.guest);
    const existing = bySlug.get(slug);
    if (existing) existing.episodeIds.push(ep.id);
    else bySlug.set(slug, { slug, name: ep.guest, bio: '', episodeIds: [ep.id], essayIds: [] });
  }

  for (const es of data.essays) {
    if (!es.author) continue;
    const slug = slugify(es.author);
    const existing = bySlug.get(slug);
    if (existing) existing.essayIds.push(es.id);
    else bySlug.set(slug, { slug, name: es.author, bio: '', episodeIds: [], essayIds: [es.id] });
  }

  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getCollaborator(data: SiteDB, slug: string): Collaborator | undefined {
  return buildCollaboratorRoster(data).find((c) => c.slug === slug);
}

export function collaboratorsForTheme(data: SiteDB, themeSlug: string): Collaborator[] {
  const roster = buildCollaboratorRoster(data);
  const episodeIdsInTheme = new Set(data.episodes.filter((e) => e.season === themeSlug).map((e) => e.id));
  const essayIdsInTheme = new Set(data.essays.filter((es) => es.season === themeSlug).map((es) => es.id));
  const theme = data.themes.find((t) => t.slug === themeSlug);
  const investigatorSlugs = new Set(theme?.investigatorSlugs ?? []);
  return roster.filter(
    (c) =>
      investigatorSlugs.has(c.slug) ||
      c.episodeIds.some((id) => episodeIdsInTheme.has(id)) ||
      c.essayIds.some((id) => essayIdsInTheme.has(id))
  );
}

export type { CollaboratorRecord };
