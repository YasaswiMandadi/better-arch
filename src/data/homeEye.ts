/**
 * Settings for the homepage eye (the keyword field drawn from a looping video).
 * Edited in the console's "Home page" screen; saved in site.homeEye. Anything not
 * saved falls back to HOME_EYE_DEFAULTS, which reproduce the look the client approved
 * (coral words on near-black, "Fine" size, eye ~15% larger, 1.5x speed).
 */

export type EyeFont = 'robotomono' | 'jetbrains' | 'plexmono' | 'spacemono' | 'roboto' | 'montserrat' | 'inter' | 'system';

export interface EyeVideoInfo {
  /** Version id of the uploaded video (served at /api/eye-video?v=<id>). */
  id: string;
  mime: string;
  size: number; // bytes, after conversion
  duration: number; // seconds
  name: string; // original file name
  uploadedAt: string;
}

export interface HomeEyeSettings {
  // ---- video ----
  /** null = the built-in eye video (public/home/eye-loop.*) */
  video: EyeVideoInfo | null;
  speed: number; // playback rate, 0.25–3

  // ---- characters ----
  mode: 'words' | 'random';
  upper: boolean;
  gapMark: string; // separator between words: any characters (max 8); empty = blank cell
  gapFill: number; // 0–1, opacity of the gap mark
  // ---- keyword sets ----
  /** live keywords left OUT of the normal set */
  excludeWords: string[];
  /** extra words added to the normal set */
  extraWords: string[];
  /** the small set drawn in the highlight colour */
  highlightWords: string[];
  highlightColor: string;
  /** share of words drawn from the highlight set, 0–0.5 */
  highlightShare: number;
  /** extra brightness for highlight words inside the eye, 0–1 */
  highlightBoost: number;

  // ---- grid ----
  density: number; // font px on laptops/desktops (7–16)
  densityPhone: number; // font px on phones (6–14)

  // ---- tone ----
  autoLevels: boolean; // stretch each frame's own dark→bright range first
  contrast: number; // 0.5–3
  bright: number; // -0.4–0.4
  thresh: number; // 0–0.3: below this a cell stays empty
  invert: boolean;
  intensity: number; // 0.3–1: brightest words' opacity

  // ---- motion ----
  churn: number; // 0–100: how often words swap in place
  burst: number; // 0–400 ms: scramble before a swapped word settles
  smooth: number; // 0–0.9: temporal smoothing of brightness
  statics: boolean; // faint flickering words in the dark areas

  // ---- loop ----
  blend: number; // 0.1–1.5 s crossfade at the loop seam
  seam: boolean; // scramble burst at the seam

  // ---- look ----
  font: EyeFont;
  fit: 'cover' | 'contain';
  ink: string;
  bg: string;
  zoom: number; // 1–1.6, size of the eye on laptops (cover)
  phoneSize: number; // 0.8–2.5: eye width as a multiple of the phone screen width (upright phones)
  torch: boolean; // soft light around the cursor
  parallax: boolean; // eye drifts slightly toward the cursor
}

export const HOME_EYE_DEFAULTS: HomeEyeSettings = {
  video: null,
  speed: 1.5,
  mode: 'words',
  upper: false,
  gapMark: ' ',
  gapFill: 0.35,
  excludeWords: [],
  extraWords: [],
  highlightWords: [],
  highlightColor: '#F2C14E',
  highlightShare: 0.12,
  highlightBoost: 0.35,
  density: 9,
  densityPhone: 8,
  autoLevels: true,
  contrast: 1,
  bright: 0,
  thresh: 0.07,
  invert: false,
  intensity: 0.83,
  churn: 10,
  burst: 120,
  smooth: 0.3,
  statics: true,
  blend: 0.5,
  seam: true,
  font: 'robotomono',
  fit: 'cover',
  ink: '#E0825C',
  bg: '#070707',
  zoom: 1.2,
  phoneSize: 1.55,
  torch: true,
  parallax: true,
};

export const EYE_FONTS: Record<EyeFont, { label: string; css: string; google?: string }> = {
  robotomono: { label: 'Roboto Mono (site)', css: '"Roboto Mono", ui-monospace, monospace' },
  jetbrains: { label: 'JetBrains Mono', css: '"JetBrains Mono", ui-monospace, monospace', google: 'JetBrains+Mono:wght@400;700' },
  plexmono: { label: 'IBM Plex Mono', css: '"IBM Plex Mono", ui-monospace, monospace', google: 'IBM+Plex+Mono:wght@400;700' },
  spacemono: { label: 'Space Mono', css: '"Space Mono", ui-monospace, monospace', google: 'Space+Mono:wght@400;700' },
  roboto: { label: 'Roboto', css: '"Roboto", system-ui, sans-serif' },
  montserrat: { label: 'Montserrat', css: '"Montserrat", system-ui, sans-serif' },
  inter: { label: 'Inter', css: '"Inter", system-ui, sans-serif', google: 'Inter:wght@400;700' },
  system: { label: 'System mono', css: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
};

/** Largest video file the client may pick (checked before converting). */
export const EYE_MAX_UPLOAD_MB = 100;
/** Longest clip kept after trimming, in seconds. */
export const EYE_MAX_CLIP_SECONDS = 20;
/** Largest converted video that can be saved (the server checks this too). */
export const EYE_MAX_STORED_MB = 3;

const num = (v: unknown, d: number, lo: number, hi: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : d;
  return Math.min(hi, Math.max(lo, n));
};
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const color = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const words = (v: unknown) =>
  Array.isArray(v) ? Array.from(new Set(v.filter((w): w is string => typeof w === 'string').map((w) => w.trim()).filter(Boolean))).slice(0, 500) : [];

/** Saved (possibly partial / older) settings → complete, range-checked settings. */
export function resolveHomeEye(saved: Partial<HomeEyeSettings> | undefined): HomeEyeSettings {
  const s = saved ?? {};
  const D = HOME_EYE_DEFAULTS;
  const v = s.video;
  return {
    video: v && typeof v.id === 'string' && v.id ? v : null,
    speed: num(s.speed, D.speed, 0.25, 3),
    mode: s.mode === 'random' ? 'random' : 'words',
    upper: bool(s.upper, D.upper),
    gapMark: typeof s.gapMark === 'string' ? s.gapMark.slice(0, 8) : D.gapMark,
    gapFill: num(s.gapFill, D.gapFill, 0, 1),
    excludeWords: words(s.excludeWords),
    extraWords: words(s.extraWords),
    highlightWords: words(s.highlightWords),
    highlightColor: color(s.highlightColor, D.highlightColor),
    highlightShare: num(s.highlightShare, D.highlightShare, 0, 0.5),
    highlightBoost: num(s.highlightBoost, D.highlightBoost, 0, 1),
    density: Math.round(num(s.density, D.density, 7, 16)),
    densityPhone: Math.round(num(s.densityPhone, D.densityPhone, 6, 14)),
    autoLevels: bool(s.autoLevels, D.autoLevels),
    contrast: num(s.contrast, D.contrast, 0.5, 3),
    bright: num(s.bright, D.bright, -0.4, 0.4),
    thresh: num(s.thresh, D.thresh, 0, 0.3),
    invert: bool(s.invert, D.invert),
    intensity: num(s.intensity, D.intensity, 0.3, 1),
    churn: num(s.churn, D.churn, 0, 100),
    burst: num(s.burst, D.burst, 0, 400),
    smooth: num(s.smooth, D.smooth, 0, 0.9),
    statics: bool(s.statics, D.statics),
    blend: num(s.blend, D.blend, 0.1, 1.5),
    seam: bool(s.seam, D.seam),
    font: s.font && s.font in EYE_FONTS ? s.font : D.font,
    fit: s.fit === 'contain' ? 'contain' : 'cover',
    ink: color(s.ink, D.ink),
    bg: color(s.bg, D.bg),
    zoom: num(s.zoom, D.zoom, 1, 1.6),
    phoneSize: num(s.phoneSize, D.phoneSize, 0.8, 2.5),
    torch: bool(s.torch, D.torch),
    parallax: bool(s.parallax, D.parallax),
  };
}

/** Where the browser loads the eye video from: the uploaded one first, then the built-in loop. */
export function eyeVideoSources(s: HomeEyeSettings, remote: boolean): { src: string; type: string }[] {
  const builtIn = [
    { src: '/home/eye-loop.webm', type: 'video/webm' },
    { src: '/home/eye-loop.mp4', type: 'video/mp4' },
  ];
  if (s.video && remote) return [{ src: `/api/eye-video?v=${encodeURIComponent(s.video.id)}`, type: s.video.mime.split(';')[0] }, ...builtIn];
  return builtIn;
}
