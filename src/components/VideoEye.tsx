import EyeField from './eye/EyeField';
import type { HomeEyeModel } from '../data/useHomeEye';

/**
 * Homepage background: the keyword eye (see eye/EyeField.tsx), with the dark pool behind
 * the title and the fades under the menu and footer so text always reads. Its settings,
 * video and keyword sets come from the console's "Home page" screen.
 */
export default function VideoEye({ eye }: { eye: HomeEyeModel }) {
  const bg = eye.settings.bg;
  const rgb = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16)).join(',');
  return (
    <>
      <EyeField fixed crosshair settings={eye.settings} words={eye.words} highlight={eye.highlight} sources={eye.sources} />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background:
            `radial-gradient(ellipse 30% 22% at 50% 50%, rgba(${rgb},.6) 0%, rgba(${rgb},.3) 50%, rgba(${rgb},0) 80%),` +
            `linear-gradient(180deg, rgba(${rgb},.92) 0, rgba(${rgb},.55) 90px, rgba(${rgb},0) 170px, rgba(${rgb},0) calc(100% - 150px), rgba(${rgb},.6) calc(100% - 70px), rgba(${rgb},.92) 100%)`,
        }}
      />
    </>
  );
}
