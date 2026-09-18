import type { Episode } from '../types'

export const SECDEFS: [string, string, string, string][] = [
  ['s00', '00', 'Auto-populate', 'pipeline HTML'],
  ['s01', '01', 'Identity & hero', 'hero block'],
  ['s02', '02', 'Corrected transcript', 'transcript overlay'],
  ['s03', '03', 'A Reading of the Conversation', 'section 01'],
  ['s04', '04', 'Lexical Terrain', 'section 02'],
  ['s05', '05', 'Key Themes', 'section 03'],
  ['s06', '06', 'Key Phrases', 'section 04 · flagged cards'],
  ['s07', '07', 'Lived Experience', 'section 05'],
  ['s08', '08', 'Verbatim Quotes', 'section 04 · card list'],
  ['s09', '09', 'Sentiment Register', 'section 06'],
  ['s10', '10', 'Criticality Register', 'section 07'],
  ['s11', '11', 'References', 'section 08'],
  ['s12', '12', 'Related Episodes', 'section 09'],
  ['s13', '13', 'Related Links & Material', 'section 10'],
]

export function secState(e: Episode, key: string): 0 | 1 | 2 {
  switch (key) {
    case 's00': return 0
    case 's01': return (e.title && e.sub && e.bio && e.url) ? 2 : (e.title || e.sub ? 1 : 0)
    case 's02': return e.transcript ? 2 : 0
    case 's03': return e.reading ? 2 : 0
    case 's04': return e.keywords.length >= 10 ? 2 : e.keywords.length ? 1 : 0
    case 's05': return e.themes.length >= 3 ? 2 : e.themes.length ? 1 : 0
    case 's06': return e.phrases.length >= 4 ? 2 : e.phrases.length ? 1 : 0
    case 's07': return e.lived ? 2 : 0
    case 's08': return e.quotes.length >= 6 ? 2 : e.quotes.length ? 1 : 0
    case 's09': { const p = e.sentiments.filter((s) => s.present).length; return p >= 12 ? 2 : p ? 1 : 0 }
    case 's10': return e.compass.prose ? 2 : 1
    case 's11': return e.refs.length >= 8 ? 2 : e.refs.length ? 1 : 0
    case 's12': return e.related.length ? 2 : 0
    case 's13': return e.materials.length ? 2 : 0
    default: return 0
  }
}
