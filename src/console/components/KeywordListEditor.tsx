import { useMemo, useState } from 'react'
import type { KeywordItem } from '../../data/types'
import { useSiteData } from '../../data/store'
import { collectKeywordSuggestions } from '../../data/keywords'
import { resolveAnalysis } from '../../data/useEpisodeAnalysis'
import { slugify } from '../../lib/slug'
import { Btn, PlainInput } from './ui'

/**
 * Edits a list of keywords (word, how often it appears, short gloss). While typing a new
 * word it suggests keywords already used elsewhere on the site, so the same word is reused
 * (one keyword page) instead of near-duplicates.
 */
export default function KeywordListEditor({
  items, onChange, listId,
}: { items: KeywordItem[]; onChange: (next: KeywordItem[]) => void; listId: string }) {
  const { data } = useSiteData()
  const [word, setWord] = useState('')
  const [err, setErr] = useState('')
  const suggestions = useMemo(() => collectKeywordSuggestions(data, (ep) => resolveAnalysis(ep)), [data])

  function add() {
    const w = word.trim().replace(/\s+/g, ' ')
    if (!w) return
    if (items.some((k) => slugify(k.word) === slugify(w))) { setErr(`"${w}" is already in this list.`); return }
    const known = suggestions.find((s) => s.slug === slugify(w))
    onChange([...items, { word: known?.word ?? w, freq: 1, gloss: known?.gloss || '' }])
    setWord(''); setErr('')
  }
  const patch = (i: number, p: Partial<KeywordItem>) => onChange(items.map((k, j) => (j === i ? { ...k, ...p } : k)))

  return (
    <div>
      {items.length > 0 && (
        <div className="border border-hair rounded-md overflow-hidden mb-3">
          <div className="hidden sm:grid grid-cols-[1.2fr_80px_2fr_36px] gap-2 px-3 py-2 bg-ink/[0.03] font-sans text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
            <span>Word</span><span>Count</span><span>Short note (gloss)</span><span />
          </div>
          {items.map((k, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_36px] sm:grid-cols-[1.2fr_80px_2fr_36px] gap-2 items-center px-3 py-2 border-t border-hair2 first:border-t-0">
              <PlainInput value={k.word} onChange={(e) => patch(i, { word: e.target.value })} aria-label="Word" />
              <PlainInput type="number" min={1} value={k.freq} onChange={(e) => patch(i, { freq: Math.max(1, Number(e.target.value) || 1) })} aria-label="Count" />
              <PlainInput className="col-span-2 sm:col-span-1 order-last sm:order-none" value={k.gloss ?? ''} onChange={(e) => patch(i, { gloss: e.target.value })} placeholder="optional" aria-label="Gloss" />
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${k.word}`} className="w-8 h-8 rounded border border-hair text-danger hover:border-danger">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <PlainInput
          list={listId}
          value={word}
          onChange={(e) => { setWord(e.target.value); setErr('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Add a keyword (suggestions appear as you type)"
          className="flex-1 min-w-[200px]"
        />
        <Btn onClick={add}>+ Add keyword</Btn>
      </div>
      <datalist id={listId}>
        {suggestions.map((s) => <option key={s.slug} value={s.word}>{`used in ${s.uses} place${s.uses === 1 ? '' : 's'}`}</option>)}
      </datalist>
      {err && <p role="alert" className="text-danger text-[13px] font-semibold mt-1.5">{err}</p>}
    </div>
  )
}
