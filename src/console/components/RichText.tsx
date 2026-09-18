import { useEffect, useRef, useState } from 'react'

const FONTS: [string, string][] = [
  ['Sans', 'Space Grotesk, sans-serif'],
  ['Serif', 'Newsreader, serif'],
  ['Mono', 'JetBrains Mono, monospace'],
  ['Classic', 'Georgia, serif'],
  ['System', 'system-ui, sans-serif'],
]
const SIZES: [string, string][] = [
  ['XS', '1'], ['S', '2'], ['M', '3'], ['L', '4'], ['XL', '5'], ['XXL', '6'], ['Huge', '7'],
]
const BLOCKS: [string, string][] = [
  ['Paragraph', 'P'], ['Heading 1', 'H1'], ['Heading 2', 'H2'], ['Heading 3', 'H3'], ['Quote', 'BLOCKQUOTE'],
]
const SWATCHES = ['#121418', '#29447A', '#8F600C', '#276A5C', '#7A3B6E', '#A8372A', '#5C6068', '#FFFFFF']

function ToolBtn({ active, title, onClick, children }: { active?: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(ev) => { ev.preventDefault(); onClick() }}
      className={`min-w-[24px] h-6 px-1.5 rounded text-[12px] font-sans font-semibold leading-none flex items-center justify-center transition-colors ${
        active ? 'bg-ink text-paper' : 'text-muted hover:bg-ink/[0.08] hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="w-px h-4 bg-hair mx-0.5" />
}

export function RichText({
  value, onChange, multiline = true, placeholder, minHeight, className = '', disabled,
}: {
  value: string
  onChange: (html: string) => void
  multiline?: boolean
  placeholder?: string
  minHeight?: number
  className?: string
  disabled?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const [openPanel, setOpenPanel] = useState<'text' | 'mark' | null>(null)

  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== (value || '')) {
      el.innerHTML = value || ''
    }
  }, [value])

  function exec(cmd: string, arg?: string) {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    onChange(ref.current?.innerHTML || '')
  }

  function insertLink() {
    const url = window.prompt('Link URL')
    if (url) exec('createLink', url)
  }

  const isEmpty = !value || value === '<br>'

  if (disabled) {
    return (
      <div
        className={`w-full bg-paper text-faint border border-hair rounded px-3 py-2.5 text-[14px] font-sans opacity-70 ${className}`}
        style={{ minHeight: multiline ? minHeight || 96 : undefined }}
      >
        {value}
      </div>
    )
  }

  return (
    <div className={`border border-hair rounded overflow-hidden bg-paper transition-colors ${focused ? 'border-rust' : ''} ${className}`}>
      <div className="flex items-center gap-0.5 flex-wrap px-1.5 py-1 border-b border-hair bg-card/70">
        {multiline && (
          <>
            <select
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => { exec('formatBlock', e.target.value); e.target.selectedIndex = 0 }}
              defaultValue=""
              className="h-6 text-[10.5px] font-sans bg-transparent border border-hair rounded px-1 mr-0.5 text-muted focus:outline-none max-w-[86px]"
              title="Paragraph style"
            >
              <option value="" disabled>Style</option>
              {BLOCKS.map(([label, tag]) => <option key={tag} value={tag}>{label}</option>)}
            </select>
            <Sep />
          </>
        )}
        <select
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => exec('fontName', e.target.value)}
          defaultValue=""
          className="h-6 text-[10.5px] font-sans bg-transparent border border-hair rounded px-1 mr-0.5 text-muted focus:outline-none"
          title="Font"
        >
          <option value="" disabled>Font</option>
          {FONTS.map(([label, css]) => <option key={label} value={css}>{label}</option>)}
        </select>
        <select
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => exec('fontSize', e.target.value)}
          defaultValue=""
          className="h-6 text-[10.5px] font-sans bg-transparent border border-hair rounded px-1 mr-1 text-muted focus:outline-none"
          title="Size"
        >
          <option value="" disabled>Size</option>
          {SIZES.map(([label, v]) => <option key={label} value={v}>{label}</option>)}
        </select>

        <ToolBtn title="Bold (Ctrl+B)" onClick={() => exec('bold')}><b>B</b></ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" onClick={() => exec('italic')}><i>I</i></ToolBtn>
        <ToolBtn title="Underline (Ctrl+U)" onClick={() => exec('underline')}><u>U</u></ToolBtn>
        <ToolBtn title="Strikethrough" onClick={() => exec('strikeThrough')}><s>S</s></ToolBtn>
        <ToolBtn title="Superscript" onClick={() => exec('superscript')}>x²</ToolBtn>
        <ToolBtn title="Subscript" onClick={() => exec('subscript')}>x₂</ToolBtn>

        <Sep />

        <div className="relative">
          <ToolBtn title="Text colour" onClick={() => setOpenPanel(openPanel === 'text' ? null : 'text')}>
            <span style={{ color: '#29447A' }}>A</span>
          </ToolBtn>
          {openPanel === 'text' && (
            <div className="absolute z-10 top-7 left-0 bg-card border border-hair rounded p-1.5 grid grid-cols-4 gap-1 shadow-lg">
              {SWATCHES.map((c) => (
                <button key={c} onMouseDown={(ev) => { ev.preventDefault(); exec('foreColor', c); setOpenPanel(null) }}
                  className="w-4 h-4 rounded-sm border border-hair" style={{ background: c }} title={c} />
              ))}
              <input type="color" onChange={(ev) => exec('foreColor', ev.target.value)} className="w-4 h-4 p-0 border border-hair rounded-sm col-span-1" title="Custom colour" />
            </div>
          )}
        </div>
        <div className="relative">
          <ToolBtn title="Highlight" onClick={() => setOpenPanel(openPanel === 'mark' ? null : 'mark')}>
            <span className="px-0.5" style={{ background: '#F4E9D2' }}>H</span>
          </ToolBtn>
          {openPanel === 'mark' && (
            <div className="absolute z-10 top-7 left-0 bg-card border border-hair rounded p-1.5 grid grid-cols-4 gap-1 shadow-lg">
              {SWATCHES.map((c) => (
                <button key={c} onMouseDown={(ev) => { ev.preventDefault(); exec('hiliteColor', c); setOpenPanel(null) }}
                  className="w-4 h-4 rounded-sm border border-hair" style={{ background: c }} title={c} />
              ))}
              <input type="color" onChange={(ev) => exec('hiliteColor', ev.target.value)} className="w-4 h-4 p-0 border border-hair rounded-sm col-span-1" title="Custom colour" />
            </div>
          )}
        </div>

        <Sep />
        <ToolBtn title="Link" onClick={insertLink}>🔗</ToolBtn>
        <ToolBtn title="Remove link" onClick={() => exec('unlink')}>🔗⨯</ToolBtn>

        {multiline && (
          <>
            <Sep />
            <ToolBtn title="Bullet list" onClick={() => exec('insertUnorderedList')}>≡•</ToolBtn>
            <ToolBtn title="Numbered list" onClick={() => exec('insertOrderedList')}>≡1.</ToolBtn>
            <ToolBtn title="Decrease indent" onClick={() => exec('outdent')}>⇤</ToolBtn>
            <ToolBtn title="Increase indent" onClick={() => exec('indent')}>⇥</ToolBtn>

            <Sep />
            <ToolBtn title="Align left" onClick={() => exec('justifyLeft')}>⟸</ToolBtn>
            <ToolBtn title="Align centre" onClick={() => exec('justifyCenter')}>⟺</ToolBtn>
            <ToolBtn title="Align right" onClick={() => exec('justifyRight')}>⟹</ToolBtn>
            <ToolBtn title="Justify" onClick={() => exec('justifyFull')}>☰</ToolBtn>
          </>
        )}

        <Sep />
        <ToolBtn title="Undo (Ctrl+Z)" onClick={() => exec('undo')}>↺</ToolBtn>
        <ToolBtn title="Redo (Ctrl+Y)" onClick={() => exec('redo')}>↻</ToolBtn>

        <span className="flex-1" />
        <ToolBtn title="Clear formatting" onClick={() => exec('removeFormat')}>⨯</ToolBtn>
      </div>

      <div className="relative">
        {isEmpty && !focused && placeholder && (
          <span className="absolute left-3 top-2.5 text-faint text-[14px] pointer-events-none font-sans">{placeholder}</span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setOpenPanel(null) }}
          onInput={() => onChange(ref.current?.innerHTML || '')}
          onKeyDown={(ev) => { if (!multiline && ev.key === 'Enter') ev.preventDefault() }}
          className="rte-content px-3 py-2.5 text-[14px] font-sans outline-none"
          style={{ minHeight: multiline ? (minHeight || 96) : 22, whiteSpace: multiline ? 'pre-wrap' : 'nowrap', overflowX: multiline ? undefined : 'auto' }}
        />
      </div>
    </div>
  )
}

