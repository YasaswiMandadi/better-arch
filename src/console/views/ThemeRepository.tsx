import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { Btn, Panel, StatusPill, VHead } from '../components/ui';
import { createTheme } from '../lib/create';

/**
 * Lists every Theme added to the site, published and unpublished, per the
 * client's spec ("This section lists out all the Themes added to the
 * website, both published and unpublished."). Clicking a card opens the
 * Theme Template Backend form (ThemeEditor) for that theme.
 */
export default function ThemeRepository() {
  const { go } = useConsole();
  const { data, update } = useSiteData();

  function addTheme() {
    const slug = createTheme(data, update);
    go('themeEditor', slug);
  }

  return (
    <div>
      <VHead
        title="Theme Repository"
        sub="Every Theme added to the site — published and unpublished. Click a card to edit it; these render directly as the Themes Masterpage and the individual Theme pages on the public site."
      >
        <div className="flex flex-wrap gap-2.5">
          <Btn onClick={() => go('themesPage')} title="Edit the text visitors see on the /themes page">Edit Themes page</Btn>
          <Btn variant="primary" onClick={addTheme}>+ Add Theme</Btn>
        </div>
      </VHead>

      {data.themes.length === 0 && (
        <Panel>
          <p className="text-muted text-[14.5px]">No themes yet. Add one to get started.</p>
        </Panel>
      )}

      {data.themes.map((t) => (
        <Panel key={t.slug} className="c-card-hover cursor-pointer">
          <button onClick={() => go('themeEditor', t.slug)} className="text-left w-full">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-[13px] font-semibold text-rust bg-rust/[0.08] rounded-full px-2.5 py-1">{t.no}</span>
              <b className="font-display italic font-medium text-[17px]">{t.title}</b>
              <StatusPill status={t.status === 'published' ? 'published' : 'draft'} />
              <span
                className="w-4 h-4 rounded-full border border-hair shrink-0"
                style={{ background: t.lightHex }}
                title={`Accent: ${t.lightHex}`}
              />
              <span className="flex-1" />
              <span className="text-[12px] text-faint font-mono">{t.subThemes.length} sub-theme{t.subThemes.length === 1 ? '' : 's'}</span>
            </div>
            <p className="text-[13.5px] text-muted font-sans">{t.one || 'No compact description yet.'}</p>
          </button>
        </Panel>
      ))}
    </div>
  );
}
