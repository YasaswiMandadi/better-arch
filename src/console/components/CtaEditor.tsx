import type { CtaBlock } from '../../data/types'
import { isInternalHref } from '../../data/pageCopy'
import { Field, Grid2, TextArea, TextInput, Toggle } from './ui'

/**
 * Edits one titled block with a button (e.g. "Propose a Project"): show/hide, title,
 * description, button label and button link. `value` is the resolved block shown on the
 * site; `onChange` receives only the field that changed.
 */
export default function CtaEditor({ value, onChange }: { value: CtaBlock; onChange: (patch: Partial<CtaBlock>) => void }) {
  const href = value.buttonHref.trim()
  const hrefNote = !href
    ? 'No link: the button is hidden.'
    : isInternalHref(href)
    ? `Opens inside the site: ${href}`
    : /^https?:\/\//i.test(href) || /^mailto:/i.test(href)
    ? 'Opens in a new tab (outside link).'
    : 'Start with / for a page of this site (e.g. /contact#contribute), or https:// for an outside link.'
  return (
    <div>
      <div className="mb-4">
        <Toggle checked={value.show} onChange={(v) => onChange({ show: v })} label={value.show ? 'Shown on the page' : 'Hidden from the page'} />
      </div>
      <div className={value.show ? '' : 'opacity-50'}>
        <Field label="Section title (text box 01)"><TextInput value={value.title} onChange={(e) => onChange({ title: (e.target as any).value })} /></Field>
        <Field label="Section description (text box 02)"><TextArea value={value.desc} onChange={(e) => onChange({ desc: (e.target as any).value })} /></Field>
        <Grid2>
          <Field label="Button label" hint="Leave empty to hide the button."><TextInput value={value.buttonLabel} onChange={(e) => onChange({ buttonLabel: (e.target as any).value })} /></Field>
          <Field label="Button link" hint={hrefNote}>
            <TextInput type="url" value={value.buttonHref} onChange={(e) => onChange({ buttonHref: (e.target as any).value })} placeholder="/contact#propose-a-project" />
          </Field>
        </Grid2>
      </div>
    </div>
  )
}
