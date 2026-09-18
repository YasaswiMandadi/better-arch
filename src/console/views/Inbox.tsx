import { Fragment, useState } from 'react'
import { loadInbox, saveInbox } from '../store/useConsole'
import type { InboxMessage } from '../types'
import { Btn, Panel, StatusPill, VHead } from '../components/ui'

export default function Inbox() {
  const [mail, setMail] = useState<InboxMessage[]>(() => loadInbox())
  const [openIdx, setOpenIdx] = useState(-1)

  function refresh() { setMail(loadInbox()) }
  function persist(next: InboxMessage[]) { saveInbox(next); setMail(next) }

  function open(i: number) {
    if (openIdx !== i && mail[i] && mail[i].status === 'new') {
      const next = [...mail]; next[i] = { ...next[i], status: 'read' }
      persist(next)
    }
    setOpenIdx(openIdx === i ? -1 : i)
  }
  function setStatus(i: number, status: InboxMessage['status']) {
    const next = [...mail]; next[i] = { ...next[i], status }; persist(next)
  }
  function remove(i: number) {
    if (!confirm('Delete this note?')) return
    const next = mail.slice(); next.splice(i, 1); persist(next); setOpenIdx(-1)
  }

  return (
    <div>
      <VHead
        title="Inbox"
        sub={<>Submissions from the public contact form. When frontend and Console run in the same browser they share the <span className="font-mono">ba-inbox</span> key, so notes arrive here as they are sent.</>}
      >
        <Btn size="sm" onClick={refresh}>Refresh</Btn>
      </VHead>

      {!mail.length ? (
        <Panel>
          <div className="text-center py-9 text-faint">
            <b className="block font-display text-[16px] text-muted mb-1.5">Nothing yet.</b>
            When someone writes through the contact page, the note appears here with its type, sender and status.
          </div>
        </Panel>
      ) : (
        <div className="bg-card border border-hair rounded overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left">
                {['Received', 'From', 'Type', 'Subject', 'Status'].map((h) => (
                  <th key={h} className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted px-3.5 py-2.5 border-b border-hair bg-ink/[0.02]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mail.map((m, i) => (
                <Fragment key={i}>
                  <tr className="cursor-pointer hover:bg-rust/[0.04]" onClick={() => open(i)}>
                    <td className="px-3.5 py-2.5 border-t border-hair2 font-mono text-[12px]">{(m.ts || '').replace('T', ' ').slice(0, 16)}</td>
                    <td className="px-3.5 py-2.5 border-t border-hair2"><b>{m.name}</b><br /><span className="text-faint text-[12.5px]">{m.email}</span></td>
                    <td className="px-3.5 py-2.5 border-t border-hair2">{m.type === 'episode' ? 'Episode request' : 'General'}</td>
                    <td className="px-3.5 py-2.5 border-t border-hair2">{m.subject || '–'}</td>
                    <td className="px-3.5 py-2.5 border-t border-hair2"><StatusPill status={m.status || 'new'} /></td>
                  </tr>
                  {openIdx === i && (
                    <tr>
                      <td colSpan={5} className="px-3.5 pb-4 border-t-0">
                        <div className="border-l-2 border-rust pl-4 py-1">
                          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Message</span>
                          <p className="my-1.5 mb-2.5 text-[14px]">{m.msg}</p>
                          {m.org && <><span className="font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Organisation</span><p className="my-1.5 mb-2.5 text-[14px]">{m.org}</p></>}
                          {m.guest && <><span className="font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Proposed guest</span><p className="my-1.5 mb-2.5 text-[14px]">{m.guest}</p></>}
                          {m.topic && <><span className="font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Proposed topic</span><p className="my-1.5 mb-2.5 text-[14px]">{m.topic}</p></>}
                          <div className="flex gap-2 flex-wrap">
                            <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'your note to BetterArch'}`)}`}>
                              <Btn size="sm" variant="primary">Reply by mail</Btn>
                            </a>
                            <Btn size="sm" onClick={() => setStatus(i, 'replied')}>Mark replied</Btn>
                            <Btn size="sm" onClick={() => setStatus(i, 'archived')}>Archive</Btn>
                            <Btn size="sm" variant="danger" onClick={() => remove(i)}>Delete</Btn>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
