import { useState } from 'react'
import { slugify } from '../../lib/slug'
import { Btn } from './ui'

/**
 * Editable, validated slug (URL part). Typing is tidied (lowercase, hyphens); "Save slug" or
 * Enter applies it; a slug that `takenBy` reports as used elsewhere is refused with its name.
 */
export default function SlugField({
  value, prefix, fromTitle, takenBy, onSave, warning,
}: {
  value: string
  /** shown before the slug in the address preview, e.g. "/essay/" */
  prefix: string
  /** text the "Use title" button turns into a slug */
  fromTitle: string
  /** name of whatever already uses this slug, or null when free */
  takenBy: (slug: string) => string | null
  onSave: (next: string) => void
  /** extra caution shown while a change is pending (e.g. for published items) */
  warning?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? value
  const editing = draft !== null && draft !== value

  function problem(v: string): string | null {
    if (!v) return "The slug can't be empty."
    if (v.length > 80) return 'Keep it under 80 characters.'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) return 'Use only lowercase letters, numbers and single hyphens, e.g. housing-and-labour.'
    const who = v === value ? null : takenBy(v)
    return who ? `Already used by "${who}". Each one needs its own slug.` : null
  }
  const err = editing ? problem(shown) : null

  function type(v: string) {
    setDraft(v.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-'))
  }
  function save() {
    const next = (draft ?? '').replace(/^-+|-+$/g, '')
    if (next === value) { setDraft(null); return }
    if (problem(next)) { setDraft(next); return }
    setDraft(null)
    onSave(next)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={shown}
          onChange={(e) => type(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (!err) save() }
            if (e.key === 'Escape') setDraft(null)
          }}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-invalid={!!err}
          className={`flex-1 min-w-[160px] bg-paper text-ink border rounded-md px-3 py-2.5 text-[14px] font-mono focus:outline-none transition-colors ${err ? 'border-danger' : 'border-hair focus:border-rust'}`}
        />
        {editing ? (
          <>
            <Btn size="sm" variant="primary" onClick={save} disabled={!!err} className="disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">Save slug</Btn>
            <Btn size="sm" onClick={() => setDraft(null)}>Cancel</Btn>
          </>
        ) : (
          <Btn size="sm" onClick={() => type(slugify(fromTitle.replace(/<[^>]*>/g, '')))} title="Fill the slug from the title">Use title</Btn>
        )}
      </div>
      <div className="mt-1.5 text-[12.5px] font-sans">
        {err ? (
          <span role="alert" className="text-danger font-semibold">{err}</span>
        ) : (
          <span className="text-faint">Page address: <span className="font-mono">{prefix}{shown.replace(/^-+|-+$/g, '') || '…'}</span>{editing ? ' · press Enter or Save slug' : ''}</span>
        )}
        {editing && !err && warning && <span className="block mt-1 text-amber font-semibold">{warning}</span>}
      </div>
    </div>
  )
}
