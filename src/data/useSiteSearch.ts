import { useMemo } from 'react';
import { useSiteData } from './store';
import { useAllKeywords } from './useKeywords';
import { useCollaboratorRoster } from './useCollaborators';
import { keywordHref } from './keywords';
import { isEpisodePublished } from './types';

export interface SearchResult {
  group: 'Themes' | 'Episodes' | 'Essays' | 'Keywords' | 'Collaborators';
  label: string;
  sub?: string;
  href: string;
}

/** Feeds the Universal Side Panel / header search box into the keyword and
 * collaborator index, plus themes, episodes and essays. Simple, live,
 * case-insensitive substring match — capped per group so results stay
 * scannable. */
export function useSiteSearch(query: string): SearchResult[] {
  const { data } = useSiteData();
  const keywords = useAllKeywords();
  const collaborators = useCollaboratorRoster();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: SearchResult[] = [];

    for (const t of data.themes) {
      if (results.filter((r) => r.group === 'Themes').length >= 5) break;
      if (t.title.toLowerCase().includes(q)) {
        results.push({ group: 'Themes', label: t.title, sub: t.one, href: `/theme/${t.slug}` });
      }
      for (const st of t.subThemes) {
        if (st.title.toLowerCase().includes(q)) {
          results.push({ group: 'Themes', label: st.title, sub: t.title, href: `/theme/${t.slug}/subtheme/${st.slug}` });
        }
      }
    }

    for (const e of data.episodes) {
      if (!isEpisodePublished(e)) continue;
      if (results.filter((r) => r.group === 'Episodes').length >= 5) break;
      if (e.title.toLowerCase().includes(q) || e.guest.toLowerCase().includes(q)) {
        results.push({ group: 'Episodes', label: e.title, sub: e.guest ? `with ${e.guest}` : undefined, href: `/episode/${e.id}` });
      }
    }

    for (const es of data.essays) {
      if (results.filter((r) => r.group === 'Essays').length >= 5) break;
      if (es.title.toLowerCase().includes(q)) {
        results.push({ group: 'Essays', label: es.title, sub: es.author ? `by ${es.author}` : undefined, href: `/essay/${es.slug}` });
      }
    }

    for (const k of keywords) {
      if (results.filter((r) => r.group === 'Keywords').length >= 6) break;
      if (k.word.toLowerCase().includes(q)) {
        results.push({ group: 'Keywords', label: k.word, sub: `${k.occurrences.length} occurrence${k.occurrences.length === 1 ? '' : 's'}`, href: keywordHref(k.word) });
      }
    }

    for (const c of collaborators) {
      if (results.filter((r) => r.group === 'Collaborators').length >= 5) break;
      if (c.name.toLowerCase().includes(q)) {
        results.push({ group: 'Collaborators', label: c.name, href: '#collaborator:' + c.slug });
      }
    }

    return results;
  }, [query, data, keywords, collaborators]);
}
