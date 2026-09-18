import { useConsole } from '../store/useConsole'
import { Field, Grid2, Panel, TextArea, TextInput, VHead } from '../components/ui'

export default function Pages() {
  const { db, setDB } = useConsole()
  const p = db.pages

  function setPage<K extends keyof typeof p>(key: K, value: (typeof p)[K]) {
    setDB((d) => { (d.pages as any)[key] = value })
  }
  function setSiteLine(v: string) {
    setDB((d) => { d.site.line = v })
  }

  return (
    <div>
      <VHead title="Pages" sub="The copy the public site renders outside the seasons: the homepage word-field, the About page blocks, and the contact settings." />

      <Panel>
        <h3 className="font-display font-semibold text-[16px] mb-3.5">Home · word-field</h3>
        <Field label="Hero line"><TextInput value={p.heroLine} onChange={(e) => setPage('heroLine', e.target.value)} /></Field>
        <Grid2>
          <Field label="Tagline A"><TextInput value={p.tagA} onChange={(e) => setPage('tagA', e.target.value)} /></Field>
          <Field label="Tagline B (alternates by scramble)"><TextInput value={p.tagB} onChange={(e) => setPage('tagB', e.target.value)} /></Field>
        </Grid2>
        <Field label="Field words (comma-separated)" hint="These populate the animated field. Keep them short; the engine fits them to slots per row.">
          <TextArea className="font-mono min-h-[84px]" value={p.fieldWords} onChange={(e) => setPage('fieldWords', e.target.value)} />
        </Field>
        <Grid2>
          <Field label="Gap mark"><TextInput value={p.gapMark} onChange={(e) => setPage('gapMark', e.target.value)} /></Field>
          <Field label="Churn (0 calm – 100 restless)">
            <TextInput type="number" min={0} max={100} value={p.churn} onChange={(e) => setPage('churn', +e.target.value)} />
          </Field>
        </Grid2>
      </Panel>

      <Panel>
        <h3 className="font-display font-semibold text-[16px] mb-3.5">About</h3>
        <Field label="Site line (hero sub on About; meta description)">
          <TextArea className="min-h-[84px]" value={db.site.line} onChange={(e) => setSiteLine(e.target.value)} />
        </Field>
        <Field
          label="Additional About blocks (blank line between; heading | body per block)"
          hint="Leave empty to keep the built-in About structure on the public page."
        >
          <TextArea className="min-h-[120px]" placeholder="What we do | The Better Architecture Project is…" value={p.about} onChange={(e) => setPage('about', e.target.value)} />
        </Field>
      </Panel>

      <Panel>
        <h3 className="font-display font-semibold text-[16px] mb-3.5">Contact</h3>
        <Field label="Recipient email (mailto fallback)">
          <TextInput type="email" value={p.contactEmail} onChange={(e) => setPage('contactEmail', e.target.value)} />
        </Field>
        <Field label="Points to note (one per line)">
          <TextArea className="min-h-[110px]" value={p.contactNotes} onChange={(e) => setPage('contactNotes', e.target.value)} />
        </Field>
      </Panel>
    </div>
  )
}
