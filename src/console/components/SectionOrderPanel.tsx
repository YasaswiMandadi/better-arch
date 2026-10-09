import { useState } from 'react';
import {
  isCustomLayout, isSectionHidden, moveSection, orderedKeys, setSectionHidden,
  type SectionDef, type SectionLayout,
} from '../../data/sectionLayout';

/**
 * "Page sections": the headings of the published page, as a list the admin
 * can drag into a new order and switch on or off. A switched-off heading
 * (and everything under it) is simply not rendered on the public page.
 * Drag a row by its handle, or use the arrow buttons / keyboard.
 */
export default function SectionOrderPanel({
  title = 'Page sections',
  hint,
  defs,
  layout,
  onChange,
  anchors,
  available,
  compact = false,
}: {
  title?: string;
  hint?: string;
  defs: SectionDef[];
  layout: SectionLayout | undefined;
  /** Called with the new layout, or undefined to go back to the default. */
  onChange: (next: SectionLayout | undefined) => void;
  /** Optional: section key → element id in the form, so a click on the heading scrolls to it. */
  anchors?: Record<string, string>;
  /** Optional: keys with nothing to show right now (listed, but marked "no content yet"). */
  available?: (key: string) => boolean;
  compact?: boolean;
}) {
  const keys = orderedKeys(defs, layout);
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const wide = typeof window !== 'undefined' && window.matchMedia?.('(min-width:1280px)').matches;
  const [open, setOpen] = useState(compact ? false : wide);

  const custom = isCustomLayout(defs, layout);
  const shown = keys.filter((k) => !isSectionHidden(layout, k)).length;

  function drop(index: number) {
    if (dragKey) onChange(moveSection(defs, layout, dragKey, index));
    setDragKey(null);
    setOverIndex(null);
  }

  return (
    <div className="bg-card border border-hair rounded-lg shadow-[0_1px_0_rgba(0,0,0,.03)]" data-testid="section-order-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <span className="font-display italic text-[16px] flex-1">{title}</span>
        <span className="font-mono text-[11px] text-faint">{shown}/{keys.length} shown</span>
        <span className="text-muted text-[12px]" aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <p className="text-[12px] leading-snug text-muted px-1 mb-2.5">
            {hint ?? 'Drag to reorder. Switch a heading off to leave it out of the published page.'}
          </p>
          <ol className="m-0 p-0 list-none" onDragLeave={() => setOverIndex(null)}>
            {keys.map((k, i) => {
              const def = byKey.get(k)!;
              const off = isSectionHidden(layout, k);
              const empty = available ? !available(k) : false;
              return (
                <li
                  key={k}
                  draggable
                  onDragStart={(ev) => { setDragKey(k); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', k); } catch { /* some browsers */ } }}
                  onDragEnd={() => { setDragKey(null); setOverIndex(null); }}
                  onDragOver={(ev) => { if (dragKey) { ev.preventDefault(); setOverIndex(i); } }}
                  onDrop={(ev) => { ev.preventDefault(); drop(i); }}
                  data-section-key={k}
                  className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1.5 mb-1 bg-paper/60 transition-colors ${
                    overIndex === i && dragKey && dragKey !== k ? 'border-rust border-dashed' : 'border-hair'
                  } ${dragKey === k ? 'opacity-40' : ''}`}
                >
                  <span className="cursor-grab select-none text-faint px-1 text-[15px] leading-none" title="Drag to reorder" aria-hidden>⠿</span>
                  <span className="font-mono text-[10.5px] text-faint w-5 text-right shrink-0">{i + 1}</span>
                  {anchors?.[k] ? (
                    <a
                      href={`#${anchors[k]}`}
                      style={{ color: 'inherit' }}
                      className={`flex-1 min-w-0 text-[13px] leading-snug no-underline hover:underline ${off ? 'text-faint line-through' : 'text-ink'}`}
                    >
                      {def.label}
                    </a>
                  ) : (
                    <span className={`flex-1 min-w-0 text-[13px] leading-snug ${off ? 'text-faint line-through' : 'text-ink'}`}>{def.label}</span>
                  )}
                  {empty && !off && <span className="text-[10px] text-faint shrink-0" title="Nothing to show yet, so this heading won't appear until it has content">empty</span>}
                  <button
                    type="button"
                    aria-label={`Move ${def.label} up`}
                    disabled={i === 0}
                    onClick={() => onChange(moveSection(defs, layout, k, i - 1))}
                    className="px-1 text-muted hover:text-ink disabled:opacity-25 text-[12px]"
                  >▲</button>
                  <button
                    type="button"
                    aria-label={`Move ${def.label} down`}
                    disabled={i === keys.length - 1}
                    onClick={() => onChange(moveSection(defs, layout, k, i + 1))}
                    className="px-1 text-muted hover:text-ink disabled:opacity-25 text-[12px]"
                  >▼</button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!off}
                    aria-label={`${def.label}: ${off ? 'off' : 'on'}`}
                    title={off ? 'Off — not on the published page' : 'On — shown on the published page'}
                    onClick={() => onChange(setSectionHidden(defs, layout, k, !off))}
                    className="relative shrink-0 w-9 h-5 rounded-full border-0 p-0 cursor-pointer transition-colors"
                    style={{ background: off ? 'var(--hair)' : 'var(--moss)' }}
                  >
                    <span
                      className="absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow transition-transform"
                      style={{ transform: off ? 'translateX(0)' : 'translateX(16px)' }}
                    />
                  </button>
                </li>
              );
            })}
          </ol>
          {custom && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="mt-1.5 text-[12px] text-muted underline hover:text-ink px-1"
            >
              Reset to the default order, all on
            </button>
          )}
        </div>
      )}
    </div>
  );
}
