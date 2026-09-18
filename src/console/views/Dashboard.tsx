import { useConsole, loadInbox } from '../store/useConsole'
import { blankEp } from '../lib/seed'
import { Btn, Panel, Rich, StatusPill, VHead } from '../components/ui'

export default function Dashboard() {
  const { db, setDB, go } = useConsole()
  const pub = db.episodes.filter((e) => e.status === 'published').length
  const ana = db.episodes.filter((e) => e.analysis).length
  const newMail = loadInbox().filter((m) => m.status === 'new').length

  const kpis: [number, string, string][] = [
    [db.seasons.length, 'Seasons', '#29447A'],
    [db.episodes.length, 'Episodes', '#8F600C'],
    [pub, 'Published', '#276A5C'],
    [ana, 'Analysis records', '#7A3B6E'],
    [newMail, 'New in inbox', '#A8372A'],
  ]

  function addEpisode() {
    const e = blankEp()
    setDB((d) => { d.episodes.unshift(e) })
    go('editor', e.id)
  }

  return (
    <div>
      <VHead title="Console" sub="The editorial backend of BetterArch.org. Everything the public site renders — seasons, episode records, page copy, and the contact inbox — is edited here and exported as one JSON payload." />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-5">
        {kpis.map(([n, label, color]) => (
          <div key={label} className="relative bg-card border border-hair rounded-sm p-4 overflow-hidden">
            <span className="absolute top-0 left-0 w-9 h-[3px]" style={{ background: color }} />
            <div className="font-display italic text-[2.2rem] leading-none" style={{ color }}>{n}</div>
            <div className="font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted mt-2">{label}</div>
          </div>
        ))}
      </div>

      <Panel>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-display font-semibold text-[16px]">Recent episodes</h3>
          <span className="flex-1" />
          <Btn size="sm" variant="primary" onClick={addEpisode}>+ New episode</Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left">
                {['Ep', 'Title', 'Season', 'Status', 'Analysis'].map((h) => (
                  <th key={h} className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted pb-2.5 border-b border-hair">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {db.episodes.slice(0, 6).map((e) => {
                const s = db.seasons.find((x) => x.slug === e.season)
                return (
                  <tr key={e.id} onClick={() => go('editor', e.id)} className="cursor-pointer hover:bg-rust/[0.04]">
                    <td className="py-2.5 border-t border-hair2">{e.no}</td>
                    <td className="py-2.5 border-t border-hair2"><b><Rich html={e.title} /></b>{e.guest && <span className="text-faint"> · <Rich html={e.guest} /></span>}</td>
                    <td className="py-2.5 border-t border-hair2">{s?.title}</td>
                    <td className="py-2.5 border-t border-hair2"><StatusPill status={e.status === 'published' ? 'pub' : 'draft'} /></td>
                    <td className="py-2.5 border-t border-hair2"><span className={`inline-block w-2 h-2 rounded-full ${e.analysis ? 'bg-moss' : 'bg-hair'}`} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <h3 className="font-display font-semibold text-[16px] mb-2">How this feeds the site</h3>
        <p className="text-[13.5px] text-faint leading-relaxed">
          The public frontend carries a DB object with exactly this shape. Export JSON here, and the payload drops into the frontend master
          without transformation: seasons render as project pages, episode records render as the ten-section analysis pages, page copy fills
          home, about and contact, and the contact form writes back into this Console&rsquo;s inbox through the shared{' '}
          <span className="font-mono">ba-inbox</span> key when both run in the same browser.
        </p>
      </Panel>
    </div>
  )
}
