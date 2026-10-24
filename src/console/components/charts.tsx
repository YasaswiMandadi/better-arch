import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Bucket } from '../lib/dashboardStats'
import { niceTicks } from '../lib/dashboardStats'

/**
 * Small, dependency-free charts for the console Dashboard.
 * Rules they follow (dataviz method): one axis; thin marks (bars ≤ 24px, 4px rounded data end,
 * 2px surface gap between stacked segments); hairline grid; categorical colours in fixed order
 * from the validated --viz-1…4 tokens; text always in ink tokens; a legend for 2+ series;
 * a hover/focus tooltip on every mark; and a table view twin for every chart.
 */

export const SERIES_COLORS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)']
export interface Series { label: string; color: string }

const fmt = (n: number) => n.toLocaleString('en-GB')

/** Width of an element, kept up to date (charts draw at real pixel size so text never scales). */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setW(Math.round(el.getBoundingClientRect().width))
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref as React.RefObject<T>, w]
}

export function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: color }} />
}

export function Legend({ items }: { items: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted font-sans" aria-label="Legend">
      {items.map((s) => (
        <li key={s.label} className="inline-flex items-center gap-1.5"><Swatch color={s.color} />{s.label}</li>
      ))}
    </ul>
  )
}

/** A chart card: title, optional controls, legend, and a Chart/Table switch (the table is the accessible twin). */
export function ChartCard({
  title, sub, controls, legend, table, children, id,
}: { title: string; sub?: ReactNode; controls?: ReactNode; legend?: ReactNode; table: ReactNode; children: ReactNode; id?: string }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <section id={id} className="c-card bg-card border border-hair rounded-md p-4 sm:p-5 min-w-0" aria-label={title}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 mb-3">
        <div className="flex-1 min-w-[160px]">
          <h3 className="font-sans text-[15px] font-semibold text-ink leading-tight">{title}</h3>
          {sub && <p className="text-[12.5px] text-muted mt-0.5">{sub}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            className="font-sans text-[11.5px] font-semibold px-2.5 py-1 rounded-full border border-hair text-muted hover:text-ink hover:border-rust transition-colors"
          >
            {asTable ? 'Show chart' : 'Show table'}
          </button>
        </div>
      </div>
      {legend && !asTable && <div className="mb-3">{legend}</div>}
      {asTable ? <div className="overflow-x-auto max-h-[340px] overflow-y-auto thin-scroll">{table}</div> : children}
    </section>
  )
}

/** A compact HTML table for the "Show table" view. */
export function DataTable({ head, rows, numeric = [] }: { head: string[]; rows: (string | number)[][]; numeric?: number[] }) {
  return (
    <table className="w-full text-[12.5px] font-sans">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h + i} className={`sticky top-0 bg-card text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted px-2.5 py-2 border-b border-hair ${numeric.includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="border-b border-hair2 last:border-none">
            {r.map((c, ci) => (
              <td key={ci} className={`px-2.5 py-1.5 ${numeric.includes(ci) ? 'text-right viz-num' : 'text-ink'}`}>{typeof c === 'number' ? fmt(c) : c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Path for a bar with only its data end rounded (top for columns, right for rows). */
function barPath(x: number, y: number, w: number, h: number, r: number, end: 'top' | 'right'): string {
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  if (end === 'top') return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`
}

/** Stacked columns over time (one column per bucket, one segment per series). */
export function StackedColumns({ buckets, series, unit, height = 236, emptyText }: { buckets: Bucket[]; series: Series[]; unit: [string, string]; height?: number; emptyText: string }) {
  const [wrap, W] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const n = buckets.length
  const max = Math.max(0, ...buckets.map((b) => b.total))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] || 1
  const padL = 30, padR = 6, padT = 8, axisH = 24
  const plotW = Math.max(0, W - padL - padR)
  const band = n ? plotW / n : 0
  const bw = Math.min(24, Math.max(3, band * 0.62))
  const y = (v: number) => padT + height - (v / top) * height
  const labelStep = Math.max(1, Math.ceil(52 / Math.max(1, band)))
  const word = (c: number) => (c === 1 ? unit[0] : unit[1])
  const tipX = active === null ? 0 : padL + active * band + band / 2
  const tipLeft = Math.max(0, Math.min(tipX - 85, W - 190))

  return (
    <div ref={wrap} className="relative" onMouseLeave={() => setActive(null)}>
      {W > 0 && (
        <svg width={W} height={padT + height + axisH} role="group" aria-label={`Number of ${unit[1]} per period`} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={padL - 7} y={y(t)} dy="0.34em" textAnchor="end" className="viz-num" style={{ fill: 'var(--faint)', fontSize: 10.5, fontFamily: 'var(--font-mono)' }}>{t}</text>
            </g>
          ))}
          {buckets.map((b, i) => {
            const x = padL + i * band + (band - bw) / 2
            const nonZero = b.counts.map((c, k) => (c ? k : -1)).filter((k) => k >= 0)
            const lastK = nonZero[nonZero.length - 1]
            let cum = 0
            const segs = b.counts.map((c, k) => {
              if (!c) return null
              const y0 = y(cum), y1 = y(cum + c)
              const gap = cum > 0 ? 2 : 0
              cum += c
              const h = Math.max(1, y0 - y1 - gap)
              return k === lastK
                ? <path key={k} d={barPath(x, y1, bw, h, 4, 'top')} style={{ fill: series[k]?.color }} />
                : <rect key={k} x={x} y={y1} width={bw} height={h} style={{ fill: series[k]?.color }} />
            })
            const parts = b.counts.map((c, k) => `${series[k]?.label}: ${c}`).join(', ')
            const showLabel = (n - 1 - i) % labelStep === 0
            return (
              <g
                key={b.start}
                className="viz-hit"
                tabIndex={0}
                role="img"
                aria-label={`${b.long}: ${b.total} ${word(b.total)}${b.total ? ` (${parts})` : ''}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(i)}
              >
                <rect className="viz-hit-bg" x={padL + i * band} y={padT} width={band} height={height} style={{ fill: active === i ? 'color-mix(in srgb, var(--ink) 6%, transparent)' : 'transparent' }} />
                <g className="viz-grow" style={{ animationDelay: `${Math.min(i, 30) * 12}ms` }}>{segs}</g>
                {showLabel && (
                  <text x={padL + i * band + band / 2} y={padT + height + 16} textAnchor="middle" style={{ fill: 'var(--faint)', fontSize: 10.5, fontFamily: 'var(--font-sans)' }}>{b.label}</text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {W > 0 && max === 0 && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-center pointer-events-none" style={{ height: padT + height }}>
          <span className="text-[13px] text-muted bg-card/90 px-3 py-1 rounded-full">{emptyText}</span>
        </div>
      )}
      {active !== null && buckets[active] && (
        <div className="viz-tip" style={{ left: tipLeft, top: 0 }} role="status">
          <div className="font-semibold mb-1">{buckets[active].long}</div>
          {series.map((s, k) => (
            <div key={s.label} className="flex items-center gap-2">
              <Swatch color={s.color} />
              <span className="flex-1 text-muted">{s.label}</span>
              <span className="viz-num font-semibold">{buckets[active].counts[k]}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-hair2 mt-1.5 pt-1.5"><span className="text-muted">Total</span><span className="viz-num font-semibold">{buckets[active].total}</span></div>
        </div>
      )}
    </div>
  )
}

export interface HBarRow { key: string; label: ReactNode; sub?: ReactNode; values: number[]; tip: ReactNode; aria: string; onOpen?: () => void }

/** Horizontal bars, one row per item; several values per row stack left to right. */
export function HBars({ rows, series, emptyText }: { rows: HBarRow[]; series: Series[]; emptyText: string }) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(1, ...rows.map((r) => r.values.reduce((a, b) => a + b, 0)))
  if (!rows.length) return <p className="text-[13px] text-muted py-6 text-center">{emptyText}</p>
  return (
    <ol className="space-y-2.5" onMouseLeave={() => setActive(null)}>
      {rows.map((r, ri) => {
        const total = r.values.reduce((a, b) => a + b, 0)
        const nz = r.values.map((v, k) => (v ? k : -1)).filter((k) => k >= 0)
        const lastK = nz[nz.length - 1]
        return (
          <li key={r.key} className="relative">
            <button
              type="button"
              className="viz-hit w-full text-left grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(110px,34%)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md px-1.5 py-1 -mx-1.5 hover:bg-ink/[0.04] focus-visible:bg-ink/[0.06] focus-visible:outline-none"
              aria-label={r.aria}
              onMouseEnter={() => setActive(r.key)}
              onFocus={() => setActive(r.key)}
              onBlur={() => setActive(null)}
              onClick={r.onOpen}
            >
              <span className="min-w-0 text-[12.5px] text-ink truncate">{r.label}{r.sub && <span className="text-faint"> {r.sub}</span>}</span>
              <span className="hidden sm:flex h-3 items-stretch viz-grow-x" style={{ width: `${(total / max) * 100}%`, minWidth: total ? 4 : 0, animationDelay: `${ri * 30}ms` }} aria-hidden>
                {r.values.map((v, k) => v ? (
                  <span
                    key={k}
                    style={{ flexGrow: v, flexBasis: 0, background: series[k]?.color, marginLeft: k === nz[0] ? 0 : 2, borderRadius: k === lastK ? '0 4px 4px 0' : 0, minWidth: 2 }}
                  />
                ) : null)}
              </span>
              <span className="text-[12.5px] font-semibold text-ink viz-num text-right">{fmt(total)}</span>
              <span className="sm:hidden col-span-2 flex h-2.5 items-stretch" style={{ width: `${(total / max) * 100}%`, minWidth: total ? 4 : 0 }} aria-hidden>
                {r.values.map((v, k) => v ? (
                  <span key={k} style={{ flexGrow: v, flexBasis: 0, background: series[k]?.color, marginLeft: k === nz[0] ? 0 : 2, borderRadius: k === lastK ? '0 4px 4px 0' : 0, minWidth: 2 }} />
                ) : null)}
              </span>
            </button>
            {active === r.key && (
              <div className="viz-tip" style={{ left: '34%', top: '100%', marginTop: 2 }} role="status">{r.tip}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** A thin progress track (e.g. share of items published). */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--viz-track)' }} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--viz-1)', transition: 'width .5s' }} />
    </div>
  )
}
