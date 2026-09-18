import { useConsole } from '../store/useConsole'
import { seedDB } from '../lib/seed'
import { Btn, Field, Grid2, Panel, TextInput, VHead } from '../components/ui'

export default function Settings() {
  const { db, setDB, go, toast } = useConsole()

  function setSite<K extends keyof typeof db.site>(key: K, value: (typeof db.site)[K]) {
    setDB((d) => { (d.site as any)[key] = value })
  }
  function setSocial(i: number, part: 0 | 1, value: string) {
    setDB((d) => { d.site.socials[i][part] = value })
  }
  function resetAll() {
    if (confirm('Reset the Console to seed data? Unexported edits are lost.')) {
      setDB((d) => Object.assign(d, seedDB()))
      go('dashboard')
      toast('Reset.')
    }
  }

  return (
    <div>
      <VHead title="Settings" sub="Site identity and the footer strip, plus the Console's own housekeeping." />

      <Panel>
        <h3 className="font-display font-semibold text-[16px] mb-3.5">Site</h3>
        <Field label="Site title"><TextInput value={db.site.title} onChange={(e) => setSite('title', e.target.value)} /></Field>
        <Field label="Footer line"><TextInput value={db.site.footer} onChange={(e) => setSite('footer', e.target.value)} /></Field>
      </Panel>

      <Panel>
        <h3 className="font-display font-semibold text-[16px] mb-3.5">Social links</h3>
        {db.site.socials.map((s, i) => (
          <Grid2 key={i}>
            <Field label="Label"><TextInput value={s[0]} onChange={(e) => setSocial(i, 0, e.target.value)} /></Field>
            <Field label="URL"><TextInput type="url" value={s[1]} onChange={(e) => setSocial(i, 1, e.target.value)} /></Field>
          </Grid2>
        ))}
      </Panel>

      <Panel>
        <h3 className="font-display font-semibold text-[16px] mb-3.5">Console</h3>
        <p className="text-[13.5px] text-faint mb-3.5">
          Export writes the whole database — seasons, episode records, pages and settings — to one JSON file; Import restores it.
          Reset returns the Console to its seeded state; the inbox is kept.
        </p>
        <Btn variant="danger" onClick={resetAll}>Reset to seed data</Btn>
      </Panel>
    </div>
  )
}
