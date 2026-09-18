import type { ReactNode } from 'react'
import { RichText } from './RichText'

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative bg-card border border-hair border-l-[3px] border-l-rust/60 rounded-sm pl-5 pr-5 sm:pl-6 sm:pr-6 py-5 sm:py-6 mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function Field({
  label, hint, children,
}: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1.5">
        {label}
      </label>
      {children}
      {hint && <span className="block text-[13px] text-faint mt-1.5">{hint}</span>}
    </div>
  )
}

const inputCls =
  'w-full bg-paper text-ink border border-hair rounded px-3 py-2.5 text-[14px] font-sans focus:outline-none focus:border-rust transition-colors placeholder:text-faint'

const PLAIN_TYPES = new Set(['number', 'url', 'email', 'date', 'checkbox', 'range', 'file'])

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { type, disabled, value, onChange, placeholder, className, list } = props
  // Number/url/email/etc. and anything backed by a <datalist> keep the native input;
  // rich formatting doesn't apply to those, and <input list> has no contentEditable equivalent.
  if (disabled || list || (type && PLAIN_TYPES.has(String(type)))) {
    return <input {...props} className={`${inputCls} disabled:opacity-60 ${className || ''}`} />
  }
  return (
    <RichText
      value={String(value ?? '')}
      onChange={(html) => onChange?.({ target: { value: html } } as unknown as React.ChangeEvent<HTMLInputElement>)}
      multiline={false}
      placeholder={placeholder as string}
      className={className}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { disabled, value, onChange, placeholder, className, style } = props
  if (disabled) {
    return <textarea {...props} className={`${inputCls} resize-y min-h-[96px] disabled:opacity-60 ${className || ''}`} />
  }
  const minHeight = typeof style?.minHeight === 'number' ? style.minHeight : undefined
  return (
    <RichText
      value={String(value ?? '')}
      onChange={(html) => onChange?.({ target: { value: html } } as unknown as React.ChangeEvent<HTMLTextAreaElement>)}
      multiline
      minHeight={minHeight}
      placeholder={placeholder as string}
      className={className}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className || ''}`} />
}

export function Btn({
  children, variant = 'default', size = 'md', className = '', ...rest
}: {
  children: ReactNode
  variant?: 'default' | 'primary' | 'danger'
  size?: 'md' | 'sm'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center gap-1.5 font-sans font-semibold rounded-full border transition-transform active:translate-y-0 hover:-translate-y-px cursor-pointer'
  const sizeCls = size === 'sm' ? 'text-[12px] px-3 py-1.5' : 'text-[13px] px-4 py-2.5'
  const variantCls =
    variant === 'primary'
      ? 'bg-ink text-paper border-ink hover:bg-rustDeep hover:border-rustDeep hover:text-white'
      : variant === 'danger'
      ? 'bg-card text-danger border-hair hover:border-danger'
      : 'bg-card text-ink border-hair hover:border-rust'
  return (
    <button {...rest} className={`${base} ${sizeCls} ${variantCls} ${className}`}>
      {children}
    </button>
  )
}

export function Pill({ active, children, ...rest }: { active?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`font-sans text-[13px] font-semibold px-3.5 py-2 rounded-full border transition-colors ${
        active ? 'bg-rust text-white border-rust' : 'bg-ink/[0.04] text-muted border-transparent hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

export function StatusPill({ status, children }: { status: string; children?: ReactNode }) {
  const map: Record<string, string> = {
    published: 'text-moss bg-mossBg',
    pub: 'text-moss bg-mossBg',
    draft: 'text-amber bg-amberBg',
    new: 'text-white bg-danger',
    replied: 'text-moss bg-mossBg',
    archived: 'text-muted bg-ink/[0.06]',
  }
  return (
    <span className={`inline-block font-sans text-[10px] font-bold uppercase tracking-[0.1em] rounded-full px-2.5 py-1 ${map[status] || 'text-muted bg-ink/[0.06]'}`}>
      {children ?? status}
    </span>
  )
}

export function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-[12px] font-medium text-rustDeep bg-rust/[0.09] pl-2.5 pr-1.5 py-1.5 rounded-full">
      {children}
      <button onClick={onRemove} className="font-bold text-rust px-1 hover:text-rustDeep">×</button>
    </span>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-muted select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <span className="w-9 h-5 rounded-full bg-hair relative transition-colors peer-checked:bg-moss after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-4" />
      {label}
    </label>
  )
}

export function AddRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full border border-dashed border-hair text-muted font-sans text-[12px] font-semibold uppercase tracking-[0.08em] rounded py-3 hover:border-muted hover:text-ink transition-colors"
    >
      {children}
    </button>
  )
}

export function RepCard({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className="relative border border-hair rounded-sm p-4 pt-5 mb-3 bg-paper/60">
      <span className="absolute top-3 right-4 font-mono text-[11px] text-faint">{String(index + 1).padStart(2, '0')}</span>
      {children}
    </div>
  )
}

export function VHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-end gap-4 flex-wrap mb-6 pb-5 border-b border-hair">
      <div>
        <span className="block w-8 h-[3px] bg-rust mb-3" />
        <h1 className="font-display italic text-[clamp(1.7rem,3.8vw,2.5rem)] font-medium leading-[1.05] tracking-tight mb-1.5">{title}</h1>
        {sub && <p className="text-muted max-w-[64ch] text-[14.5px] leading-relaxed font-sans">{sub}</p>}
      </div>
      <span className="flex-1" />
      {children}
    </div>
  )
}

export function Rich({ html, className = '' }: { html: string; className?: string }) {
  return <span className={`rte-content ${className}`} dangerouslySetInnerHTML={{ __html: html || '' }} />
}

export function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">{children}</div>
}
export function Grid3({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">{children}</div>
}

export function SlRow({
  label, sub, value, onChange, disabled,
}: { label: string; sub?: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[200px_1fr_46px] gap-3 items-center py-2.5 border-b border-hair2 last:border-none">
      <div className="font-sans text-[13px] font-semibold">
        {label}
        {sub && <small className="block font-mono text-[11px] font-normal text-faint">{sub}</small>}
      </div>
      <input
        type="range" min={0} max={100} value={value} disabled={disabled}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full disabled:opacity-40 col-span-2 sm:col-span-1"
      />
      <span className="font-mono text-[13px] text-right">{value}</span>
    </div>
  )
}
