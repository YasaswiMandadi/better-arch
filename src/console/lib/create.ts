import type { SiteDB } from '../../data/types'
import { slugify } from '../../lib/slug'
import { randId } from './storage'

type Update = (fn: (d: SiteDB) => void) => void

/** Adds a new draft theme (same defaults the Theme Repository always used) and returns its slug. */
export function createTheme(data: SiteDB, update: Update): string {
  const n = data.themes.length + 1
  const title = `New Theme ${n}`
  const slug = slugify(`${title}-${Date.now().toString(36)}`)
  update((d) => {
    d.themes.push({
      slug,
      no: `S${n}`,
      title,
      period: '',
      statusLabel: 'draft',
      one: '',
      summary: [],
      darkHex: '#E0825C',
      lightHex: '#C75B39',
      investigatorSlugs: [],
      keyConcepts: [],
      subThemes: [],
      future: { header: 'Future directions', desc: '' },
      keywords: [],
      links: [],
      status: 'draft',
    })
  })
  return slug
}

/** Adds a new draft essay and returns its id. Drafts never reach the public site. */
export function createEssay(data: SiteDB, update: Update, season?: string): string {
  const id = randId('es')
  const n = data.essays.length + 1
  let slug = slugify(`new-essay-${n}`)
  while (data.essays.some((e) => e.slug === slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`
  update((d) => {
    d.essays.unshift({
      id,
      season: season ?? d.themes[0]?.slug ?? '',
      title: `New essay ${n}`,
      slug,
      author: '',
      sub: '',
      body: [],
      keywords: [],
      status: 'draft',
    })
  })
  return id
}
