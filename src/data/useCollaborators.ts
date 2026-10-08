import { useMemo } from 'react';
import { useSiteData } from './store';
import { buildCollaboratorRoster, collaboratorsForTheme, getCollaborator, type Collaborator } from './collaborators';

export function useCollaboratorRoster(): Collaborator[] {
  const { data } = useSiteData();
  return useMemo(() => buildCollaboratorRoster(data), [data]);
}

export function useCollaborator(slug: string | undefined): Collaborator | undefined {
  const roster = useCollaboratorRoster();
  return slug ? roster.find((c) => c.slug === slug) : undefined;
}

export function useCollaboratorsForTheme(themeSlug: string | undefined): Collaborator[] {
  const { data } = useSiteData();
  return useMemo(() => (themeSlug ? collaboratorsForTheme(data, themeSlug) : []), [data, themeSlug]);
}

export { getCollaborator };
