import type { ReactNode } from 'react'
import { Toggle } from './ui'

export default function SectionHead({
  id, num, title, mirror, on, onToggle, hiddenOnPage, children,
}: {
  id: string
  num: string
  title: string
  mirror: string
  on?: boolean
  onToggle?: (v: boolean) => void
  /** The admin has switched this heading off in "Page sections" — it won't appear on the published page. */
  hiddenOnPage?: boolean
  children: ReactNode
}) {
  return (
    <div id={id} className="border-t border-hair pt-7 mt-3 scroll-mt-[78px]">
      <div className="flex items-center gap-3.5 flex-wrap mb-4">
        <span className="font-mono text-[13px] font-semibold text-rust bg-rust/[0.08] rounded-full px-2.5 py-1 leading-none">{num}</span>
        <span className="font-display italic font-medium text-[20px] tracking-tight flex-1">{title}</span>
        {hiddenOnPage && (
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] rounded-full px-2.5 py-1 text-amber bg-amberBg" title="Switched off in Page sections — not shown on the published page">
            Hidden on published page
          </span>
        )}
        <span className="font-mono text-[11px] text-faint hidden sm:inline">renders: {mirror}</span>
        {onToggle && <Toggle checked={!!on} onChange={onToggle} label="renders" />}
      </div>
      <div className={on === false ? 'opacity-40 pointer-events-none' : ''}>{children}</div>
    </div>
  )
}
