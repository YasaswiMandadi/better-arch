import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { useConsole } from '../store/useConsole'
import { useSiteData } from '../../data/store'
import { MESSAGE_TYPES, REMOTE_ENABLED, type ContactMessage } from '../../data/remote'
import { computeSiteStats, bucketMessages, RANGES, type Range } from '../lib/dashboardStats'
import { useMessages } from '../lib/useMessages'
import { ChartCard, DataTable, HBars, Legend, Meter, SERIES_COLORS, StackedColumns, Swatch, type HBarRow, type Series } from '../components/charts'
import { Btn, VHead } from '../components/ui'

/**
 * Console home: what's on the site, what's in draft, and who has written in.
 * Content numbers come from the live site data; Contact-page messages come from the database
 * (/api/messages, saved by /api/contact), so they appear on the live (database) build only.
 */

export const TYPE_LABELS: Record<string, string> = {
  general: 'Enquiry',
  episode: 'Episode request',
  propose: 'Project proposal',
  contribute: 'Contribution',
}
const TYPE_SERIES: Series[] = MESSAGE_TYPES.map((t, i) => ({ label: TYPE_LABELS[t], color: SERIES_COLORS[i] }))
const CONTENT_SERIES: Series[] = [
  { label: 'Episodes', color: SERIES_COLORS[0] },
  { label: 'Essays', color: SERIES_COLORS[1] },
]
const KEYWORD_SERIES: Series[] = [{ label: 'Mentions', color: SERIES_COLORS[0] }]

const fmt = (n: number) => n.toLocaleString('en-GB')
const plural = (n: number, w: string, ws = `${w}s`) => `${fmt(n)} ${n === 1 ? w : ws}`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function when(iso: string, now = Date.now()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const t0 = new Date(now); t0.setHours(0, 0, 0, 0)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (d.getTime() >= t0.getTime()) return `Today ${hm}`
  if (d.getTime() >= t0.getTime() - 86400000) return `Yesterday ${hm}`
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== t0.getFullYear() ? ` ${d.getFullYear()}` : ''}`
}

export default function ConsoleDashboard() {
  const { go } = useConsole()
  const { data, remote } = useSiteData()
  const s = useMemo(() => computeSiteStats(data), [data])
  const canMessages = REMOTE_ENABLED && remote.available && remote.admin
  const m = useMessages(canMessages)

  const unread = m.stats ? m.stats.events.reduce((n, e) => n + e[2], 0) : 0
  const scrollToMessages = () => document.getElementById('dash-messages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div>
      <VHead title="Dashboard" sub="The state of the site at a glance: what's published, what's still in draft, and who has written in through the Contact page." />

      {/* ---------------- KPI row ---------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6" role="list" aria-label="Key numbers">
        <Tile label="Themes" value={s.themes.total} onOpen={() => go('themes')}
          line={<>{fmt(s.themes.published)} published · {fmt(s.themes.draft)} draft</>}
          meter={[s.themes.published, s.themes.total, 'Themes published']}
          extra={plural(s.themes.subThemes, 'sub-theme')} />
        <Tile label="Episodes" value={s.episodes.total} onOpen={() => go('episodeAnalysis')}
          line={<>{fmt(s.episodes.published)} published · {fmt(s.episodes.draft)} draft</>}
          meter={[s.episodes.published, s.episodes.total, 'Episodes published']}
          extra={`${fmt(s.episodes.analysed)} of ${fmt(s.episodes.total)} with an analysis`} />
        <Tile label="Essays" value={s.essays.total} onOpen={() => go('essays')}
          line={<>{fmt(s.essays.published)} published · {fmt(s.essays.draft)} draft</>}
          meter={[s.essays.published, s.essays.total, 'Essays published']}
          extra={plural(s.references.total, 'reference') + ' cited in episodes'} />
        <Tile label="Keywords" value={s.keywords.unique} onOpen={() => go('keywords')}
          line={<>{plural(s.keywords.mentions, 'mention')} across the site</>}
          meter={[s.keywords.unique - s.keywords.noGloss, s.keywords.unique, 'Keywords with a meaning']}
          extra={`${fmt(s.keywords.unique - s.keywords.noGloss)} of ${fmt(s.keywords.unique)} have a meaning`} />
        <Tile label="Collaborators" value={s.collaborators.total} onOpen={() => go('collaborators')}
          line={<>{fmt(s.collaborators.guests)} guests · {fmt(s.collaborators.authors)} authors · {fmt(s.collaborators.investigators)} investigators</>}
          meter={[s.collaborators.total - s.collaborators.noBio, s.collaborators.total, 'Collaborators with a bio']}
          extra={`${fmt(s.collaborators.total - s.collaborators.noBio)} of ${fmt(s.collaborators.total)} have a bio`} />
        <Tile label="Messages" value={m.stats ? m.stats.total : null} onOpen={scrollToMessages}
          line={m.stats ? <>{plural(m.stats.people, 'person', 'people')} wrote · {fmt(unread)} unread</> : canMessages ? (m.status === 'error' ? 'Could not load' : 'Loading…') : 'On the live site only'}
          meter={m.stats ? [m.stats.total - unread, m.stats.total, 'Messages read'] : undefined}
          extra={m.stats ? (unread ? `${plural(unread, 'message')} waiting to be read` : 'All read') : 'Contact-page messages'}
          badge={unread > 0 ? `${unread} new` : undefined} />
      </div>

      {/* ---------------- Messages ---------------- */}
      <MessagesSection m={m} canMessages={canMessages} unread={unread} />

      {/* ---------------- Content ---------------- */}
      <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-faint mt-8 mb-3">Content</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Published content by theme"
          sub="Episodes and essays on each theme's page (drafts not counted)"
          legend={<Legend items={CONTENT_SERIES} />}
          table={<DataTable head={['Theme', 'Episodes', 'Ep. drafts', 'Essays', 'Essay drafts', 'Sub-themes']} numeric={[1, 2, 3, 4, 5]}
            rows={s.byTheme.map((t) => [`${t.no} ${t.title}${t.published ? '' : ' (draft)'}`, t.episodes, t.episodesDraft, t.essays, t.essaysDraft, t.subThemes])} />}
        >
          <HBars
            series={CONTENT_SERIES}
            emptyText="No themes yet."
            rows={s.byTheme.map((t): HBarRow => ({
              key: t.slug,
              label: <><span className="font-mono text-[11px] text-faint mr-1.5">{t.no}</span>{t.title}</>,
              sub: t.published ? undefined : '· draft',
              values: [t.episodes, t.essays],
              aria: `${t.title}: ${t.episodes} episodes, ${t.essays} essays published. Open the theme.`,
              onOpen: () => go('themeEditor', t.slug),
              tip: (
                <>
                  <div className="font-semibold mb-1">{t.title}</div>
                  <TipRow color={CONTENT_SERIES[0].color} label="Episodes" value={t.episodes} note={t.episodesDraft ? `+${t.episodesDraft} draft` : ''} />
                  <TipRow color={CONTENT_SERIES[1].color} label="Essays" value={t.essays} note={t.essaysDraft ? `+${t.essaysDraft} draft` : ''} />
                  <div className="text-muted mt-1">{plural(t.subThemes, 'sub-theme')} · click to edit</div>
                </>
              ),
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Most-used keywords"
          sub="Top 10 by mentions across episodes, essays and themes"
          table={<DataTable head={['Keyword', 'Mentions', 'Places', 'Episodes', 'Essays', 'Themes']} numeric={[1, 2, 3, 4, 5]}
            rows={s.keywords.top.map((k) => [k.word, k.total, k.places, k.episodes, k.essays, k.themes])} />}
        >
          <HBars
            series={KEYWORD_SERIES}
            emptyText="No keywords yet."
            rows={s.keywords.top.map((k): HBarRow => ({
              key: k.slug,
              label: k.word,
              values: [k.total],
              aria: `${k.word}: ${k.total} mentions in ${k.places} places. Open the Keyword Repository.`,
              onOpen: () => go('keywords'),
              tip: (
                <>
                  <div className="font-semibold mb-1">{k.word}</div>
                  <div className="flex justify-between gap-4"><span className="text-muted">Mentions</span><b className="viz-num">{fmt(k.total)}</b></div>
                  <div className="text-muted mt-1">
                    In {[k.episodes && plural(k.episodes, 'episode'), k.essays && plural(k.essays, 'essay'), k.themes && plural(k.themes, 'theme page')].filter(Boolean).join(', ') || 'no places'}
                  </div>
                </>
              ),
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <section className="c-card bg-card border border-hair rounded-md p-4 sm:p-5" aria-label="Needs attention">
          <h3 className="font-sans text-[15px] font-semibold text-ink">Needs attention</h3>
          <p className="text-[12.5px] text-muted mt-0.5 mb-3">Unfinished work, most useful first. Click one to open it.</p>
          {s.attention.length === 0 ? (
            <p className="flex items-center gap-2 text-[13.5px] text-ink"><StatusIcon kind="good" /> Nothing waiting — everything is published and complete.</p>
          ) : (
            <ul className="divide-y divide-hair2">
              {s.attention.map((a) => (
                <li key={a.key}>
                  <button type="button" onClick={() => go(a.view)} className="w-full flex items-start gap-2.5 text-left py-2.5 px-1 -mx-1 rounded hover:bg-ink/[0.04]">
                    <StatusIcon kind="warning" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-semibold text-ink">{a.label}</span>
                      {a.detail && <span className="block text-[12px] text-muted truncate">{a.detail}{a.count > 3 ? '…' : ''}</span>}
                    </span>
                    <span className="text-[12px] text-faint shrink-0 pt-0.5">Open →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="c-card bg-card border border-hair rounded-md p-4 sm:p-5" aria-label="Homepage eye">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-sans text-[15px] font-semibold text-ink">Homepage eye</h3>
              <p className="text-[12.5px] text-muted mt-0.5">The keyword field on the home page.</p>
            </div>
            <Btn size="sm" onClick={() => go('homepage')}>Open</Btn>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-muted">Video</dt>
            <dd className="text-ink min-w-0">
              {s.eye.custom ? (
                <><span className="font-semibold">Uploaded</span><span className="block text-[12px] text-muted truncate">{s.eye.name || 'video'} · {s.eye.duration.toFixed(1)} s · {s.eye.sizeMB.toFixed(1)} MB{s.eye.uploadedAt ? ` · ${when(s.eye.uploadedAt)}` : ''}</span></>
              ) : <span className="font-semibold">Built-in eye</span>}
            </dd>
            <dt className="text-muted">Yellow set</dt>
            <dd className="text-ink"><span className="font-semibold">{plural(s.eye.highlight, 'word')}</span>{s.eye.highlight === 0 && <span className="text-muted"> — none picked yet</span>}</dd>
            <dt className="text-muted">Normal set</dt>
            <dd className="text-ink">All live keywords{s.eye.extra ? ` + ${s.eye.extra} extra` : ''}{s.eye.excluded ? ` − ${s.eye.excluded} left out` : ''}</dd>
            <dt className="text-muted">References</dt>
            <dd className="text-ink">{plural(s.references.total, 'reference')} in {plural(s.references.episodes, 'episode')} <button type="button" onClick={() => go('references')} className="text-rust font-semibold hover:underline ml-1">View</button></dd>
          </dl>
        </section>
      </div>
    </div>
  )
}

function TipRow({ color, label, value, note }: { color: string; label: string; value: number; note?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Swatch color={color} />
      <span className="flex-1 text-muted">{label}</span>
      <b className="viz-num">{fmt(value)}</b>
      {note && <span className="text-faint text-[11.5px]">{note}</span>}
    </div>
  )
}

function StatusIcon({ kind }: { kind: 'warning' | 'good' }) {
  return kind === 'warning' ? (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-label="Needs attention" role="img" className="shrink-0 mt-0.5">
      <path d="M8 1.5 15 14H1z" style={{ fill: 'var(--st-warning)' }} />
      <path d="M8 6v3.6" stroke="#0b0b0b" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r=".95" fill="#0b0b0b" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-label="All good" role="img" className="shrink-0">
      <circle cx="8" cy="8" r="7" style={{ fill: 'var(--st-good)' }} />
      <path d="m4.8 8.2 2.1 2.1 4.3-4.5" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Tile({ label, value, line, extra, meter, onOpen, badge }: {
  label: string; value: number | null; line: ReactNode; extra?: ReactNode; meter?: [number, number, string]; onOpen: () => void; badge?: string
}) {
  return (
    <button type="button" role="listitem" onClick={onOpen} className="c-card c-card-hover text-left bg-card border border-hair rounded-md p-4 min-w-0 flex flex-col gap-1.5">
      <span className="flex items-center gap-2">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-muted flex-1">{label}</span>
        {badge && <span className="font-sans text-[10.5px] font-bold rounded-full px-2 py-0.5 bg-rust text-white">{badge}</span>}
      </span>
      <span className="font-sans text-[30px] sm:text-[34px] font-semibold leading-none text-ink tracking-tight">{value === null ? '—' : fmt(value)}</span>
      <span className="text-[12.5px] text-ink/85 leading-snug">{line}</span>
      {meter && <span className="mt-1"><Meter value={meter[0]} max={meter[1]} label={meter[2]} /></span>}
      {extra && <span className="text-[11.5px] text-faint leading-snug">{extra}</span>}
    </button>
  )
}

// ---------------------------------------------------------------- messages

type Msgs = ReturnType<typeof useMessages>

function MessagesSection({ m, canMessages, unread }: { m: Msgs; canMessages: boolean; unread: number }) {
  const { remote } = useSiteData()
  const [range, setRange] = useState<Range>('12w')
  const now = Date.now()
  const events = m.stats?.events ?? []
  const buckets = bucketMessages(events, range, now, MESSAGE_TYPES.length)
  const prev = bucketMessages(events, range, now, MESSAGE_TYPES.length, 1)
  const cur = buckets.reduce((n, b) => n + b.total, 0)
  const before = prev.reduce((n, b) => n + b.total, 0)
  const flagged = events.reduce((n, e) => n + e[3], 0)
  const r = RANGES.find((x) => x.id === range)!
  const byType = MESSAGE_TYPES.map((_, i) => buckets.reduce((n, b) => n + b.counts[i], 0))

  return (
    <section id="dash-messages" className="scroll-mt-24" aria-label="Contact messages">
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-faint flex-1">Contact messages</h2>
        {m.status === 'ready' && (
          <Btn size="sm" onClick={() => void m.reload()} disabled={m.refreshing}>{m.refreshing ? 'Refreshing…' : 'Refresh'}</Btn>
        )}
      </div>

      {!canMessages ? (
        <div className="c-card bg-card border border-hair rounded-md p-5 mb-4 text-[13.5px] text-muted">
          {!REMOTE_ENABLED
            ? 'Messages sent through the Contact page are saved in the database and listed here on the live site. This preview copy of the console has no database, so there is nothing to show.'
            : !remote.available
              ? 'The database is not reachable right now, so messages cannot be shown. Try again in a moment.'
              : 'Sign in to see the messages.'}
        </div>
      ) : m.status === 'loading' ? (
        <div className="c-card bg-card border border-hair rounded-md p-5 mb-4 text-[13.5px] text-muted" role="status">Loading messages…</div>
      ) : m.status === 'error' && !m.stats ? (
        <div className="c-card bg-card border border-hair rounded-md p-5 mb-4 text-[13.5px]" role="alert">
          <p className="text-danger font-semibold mb-2">{m.error}</p>
          <Btn size="sm" onClick={() => void m.reload()}>Try again</Btn>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 mb-4 dash-fade ${m.refreshing ? 'opacity-70' : ''}`}>
            <ChartCard
              title="Messages received"
              sub={
                <>
                  <b className="text-ink">{plural(cur, 'message')}</b> in the last {r.label} ({fmt(before)} in the {r.label} before)
                  {flagged > 0 && <> · {plural(flagged, 'possible spam message')} kept in total</>}
                </>
              }
              controls={
                <div className="flex rounded-full border border-hair p-0.5" role="group" aria-label="Time range">
                  {RANGES.map((x) => (
                    <button key={x.id} type="button" aria-pressed={range === x.id} onClick={() => setRange(x.id)}
                      className={`font-sans text-[11.5px] font-semibold px-2.5 py-1 rounded-full transition-colors ${range === x.id ? 'bg-ink text-card' : 'text-muted hover:text-ink'}`}>
                      {x.label}
                    </button>
                  ))}
                </div>
              }
              legend={<Legend items={TYPE_SERIES.map((sr, i) => ({ ...sr, label: `${sr.label} · ${byType[i]}` }))} />}
              table={<DataTable head={[r.unit[0].toUpperCase() + r.unit.slice(1), ...TYPE_SERIES.map((x) => x.label), 'Total']} numeric={[1, 2, 3, 4, 5]}
                rows={[...buckets].reverse().map((b) => [b.long, ...b.counts, b.total])} />}
            >
              <StackedColumns buckets={buckets} series={TYPE_SERIES} unit={['message', 'messages']} emptyText={`No messages in the last ${r.label}`} />
            </ChartCard>
            <Senders m={m} />
          </div>
          <Inbox m={m} unread={unread} />
        </>
      )}
    </section>
  )
}

function Senders({ m }: { m: Msgs }) {
  const [all, setAll] = useState(false)
  const list = m.stats?.senders ?? []
  const shown = all ? list : list.slice(0, 7)
  const active = m.filter.email?.toLowerCase()
  return (
    <section className="c-card bg-card border border-hair rounded-md p-4 sm:p-5 min-w-0" aria-label="Who wrote">
      <h3 className="font-sans text-[15px] font-semibold text-ink leading-tight">Who wrote</h3>
      <p className="text-[12.5px] text-muted mt-0.5 mb-3">
        <b className="text-ink">{plural(m.stats?.people ?? 0, 'person', 'people')}</b> so far, most recent first. Click a name to see their messages.
      </p>
      {list.length === 0 ? (
        <p className="text-[13px] text-muted py-4">Nobody yet.</p>
      ) : (
        <ul className={`divide-y divide-hair2 ${all ? 'max-h-[360px] overflow-y-auto thin-scroll pr-1' : ''}`}>
          {shown.map((p) => {
            const on = active === p.email.toLowerCase()
            return (
              <li key={p.email}>
                <button type="button" aria-pressed={on} onClick={() => m.setFilter(on ? {} : { email: p.email })}
                  className={`w-full flex items-center gap-2.5 text-left py-2 px-1.5 -mx-1.5 rounded ${on ? 'bg-rust/[0.1]' : 'hover:bg-ink/[0.04]'}`}>
                  <span aria-hidden className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold shrink-0 bg-ink/[0.07] text-ink">{initials(p.name || p.email)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-ink truncate">{p.name || p.email}{p.unread > 0 && <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-rust align-middle" aria-label={`${p.unread} unread`} />}</span>
                    <span className="block text-[11.5px] text-muted truncate">{p.email}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-[12px] font-semibold text-ink viz-num">{p.count}×</span>
                    <span className="block text-[11px] text-faint">{when(p.last)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {list.length > 7 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-[12.5px] font-semibold text-rust hover:underline">
          {all ? 'Show fewer' : `Show all ${list.length}`}
        </button>
      )}
    </section>
  )
}

function initials(s: string) {
  const parts = s.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function Inbox({ m, unread }: { m: Msgs; unread: number }) {
  const { toast } = useConsole()
  const [open, setOpen] = useState<string | null>(null)
  const f = m.filter
  const set = (patch: Partial<typeof f>) => { setOpen(null); m.setFilter({ ...f, ...patch }) }
  const pill = (on: boolean) => `font-sans text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${on ? 'bg-rust text-white border-rust' : 'bg-card text-muted border-hair hover:text-ink'}`

  async function toggle(msg: ContactMessage) {
    const next = open === msg.id ? null : msg.id
    setOpen(next)
    if (next && !msg.read) { const err = await m.mark([msg.id], true); if (err) toast(err) }
  }
  async function markAll() {
    if (!window.confirm(`Mark all ${unread} unread messages as read?`)) return
    const err = await m.mark('all', true)
    toast(err || 'All messages marked as read.')
  }

  return (
    <section className="c-card bg-card border border-hair rounded-md p-4 sm:p-5" aria-label="Inbox">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="font-sans text-[15px] font-semibold text-ink mr-auto">Inbox</h3>
        {unread > 0 && <Btn size="sm" onClick={() => void markAll()}>Mark all as read</Btn>}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filter messages">
        <button type="button" className={pill(!f.unread && !f.type)} aria-pressed={!f.unread && !f.type} onClick={() => set({ unread: false, type: undefined })}>All</button>
        <button type="button" className={pill(!!f.unread)} aria-pressed={!!f.unread} onClick={() => set({ unread: !f.unread })}>Unread{unread ? ` (${unread})` : ''}</button>
        {MESSAGE_TYPES.map((t) => (
          <button key={t} type="button" className={pill(f.type === t)} aria-pressed={f.type === t} onClick={() => set({ type: f.type === t ? undefined : t })}>{TYPE_LABELS[t]}</button>
        ))}
        {f.email && (
          <span className="inline-flex items-center gap-1 font-sans text-[12px] font-semibold pl-3 pr-1 py-1 rounded-full bg-ink/[0.07] text-ink">
            From {f.email}
            <button type="button" onClick={() => set({ email: undefined })} aria-label="Show everyone" className="w-5 h-5 rounded-full hover:bg-ink/[0.1] grid place-items-center">×</button>
          </span>
        )}
      </div>

      {m.error && m.status === 'error' && <p className="text-[13px] text-danger mb-2" role="alert">{m.error}</p>}
      {m.items.length === 0 ? (
        <p className="text-[13.5px] text-muted py-6 text-center">
          {f.email || f.type || f.unread ? 'No messages match.' : 'No messages yet. Messages sent through the Contact page appear here.'}
        </p>
      ) : (
        <ul className="border border-hair rounded-md overflow-y-auto max-h-[640px] thin-scroll">
          {m.items.map((msg) => (
            <MessageRow key={msg.id} msg={msg} open={open === msg.id} onToggle={() => void toggle(msg)} m={m} onClosed={() => setOpen(null)} />
          ))}
        </ul>
      )}
      {m.next && (
        <div className="mt-3 text-center">
          <Btn size="sm" onClick={() => void m.loadMore()} disabled={m.loadingMore}>{m.loadingMore ? 'Loading…' : 'Load older messages'}</Btn>
        </div>
      )}
    </section>
  )
}

function MessageRow({ msg, open, onToggle, m, onClosed }: { msg: ContactMessage; open: boolean; onToggle: () => void; m: Msgs; onClosed: () => void }) {
  const { toast } = useConsole()
  const typeIdx = Math.max(0, (MESSAGE_TYPES as readonly string[]).indexOf(msg.type))
  const preview = (msg.subject || msg.msg).replace(/\s+/g, ' ').slice(0, 140)
  const replySubject = `Re: ${msg.subject || `your message to BetterArch`}`
  const details: [string, string][] = ([
    ['Organisation', msg.org], ['Subject', msg.subject], ['Proposed guest', msg.guest], ['Topic', msg.topic],
  ] as [string, string][]).filter(([, v]) => v)

  async function del() {
    if (!window.confirm(`Delete this message from ${msg.name}? This can't be undone.`)) return
    const err = await m.remove(msg.id)
    if (err) toast(err); else { onClosed(); toast('Message deleted.') }
  }
  async function markUnread() {
    const err = await m.mark([msg.id], false)
    if (err) toast(err); else onClosed()
  }

  return (
    <li className={`border-b border-hair2 last:border-none ${open ? 'bg-ink/[0.025]' : ''}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full text-left flex items-start gap-3 px-3.5 py-3 hover:bg-ink/[0.035]">
        <span className="pt-1.5 w-2 shrink-0">{!msg.read && <span className="block w-2 h-2 rounded-full bg-rust" aria-label="Unread" />}</span>
        <span className="flex-1 min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`text-[13.5px] text-ink truncate ${msg.read ? 'font-medium' : 'font-bold'}`}>{msg.name}</span>
            <span className="inline-flex items-center gap-1 text-[11.5px] text-muted"><Swatch color={SERIES_COLORS[typeIdx]} />{TYPE_LABELS[msg.type] ?? msg.type}</span>
            {msg.flags.length > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted"><StatusIcon kind="warning" /> Possible spam</span>}
          </span>
          <span className={`block text-[12.5px] truncate ${msg.read ? 'text-muted' : 'text-ink'}`}>{preview}</span>
        </span>
        <span className="text-[11.5px] text-faint shrink-0 pt-0.5 viz-num">{when(msg.createdAt)}</span>
      </button>
      {open && (
        <div className="px-3.5 pb-4 pl-[38px]">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px] mb-3">
            <dt className="text-muted">From</dt>
            <dd className="text-ink min-w-0 break-words">{msg.name} · <a className="text-rust font-semibold hover:underline" href={`mailto:${msg.email}`}>{msg.email}</a></dd>
            <dt className="text-muted">Sent</dt>
            <dd className="text-ink">{new Date(msg.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {TYPE_LABELS[msg.type] ?? msg.type} form</dd>
            {details.map(([k, v]) => (<Fragment key={k}><dt className="text-muted">{k}</dt><dd className="text-ink break-words">{v}</dd></Fragment>))}
          </dl>
          <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink border-l-[3px] border-rust pl-3.5 py-0.5 mb-3">{msg.msg}</div>
          {msg.flags.length > 0 && (
            <p className="flex items-start gap-2 text-[12.5px] text-ink mb-2"><StatusIcon kind="warning" /><span><b>Possible spam:</b> {msg.flags.join('; ')}. It was kept in case it's genuine.</span></p>
          )}
          {!msg.emailed && <p className="text-[12.5px] text-muted mb-2">The notification email for this message did not go out; it is only saved here.</p>}
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${msg.email}?subject=${encodeURIComponent(replySubject)}`} className="inline-flex items-center gap-1.5 font-sans font-semibold rounded-full border text-[12px] px-3 py-1.5 bg-rust text-white border-rust hover:bg-rustDeep">Reply by email</a>
            <Btn size="sm" onClick={() => void markUnread()}>Mark as unread</Btn>
            <Btn size="sm" variant="danger" onClick={() => void del()}>Delete</Btn>
          </div>
        </div>
      )}
    </li>
  )
}
