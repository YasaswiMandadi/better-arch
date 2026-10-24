import { useEffect, useMemo, useRef, useState } from 'react';
import { EYE_FONTS, type HomeEyeSettings } from '../../data/homeEye';
import { EyeFlow } from './flow';

/**
 * The homepage eye: a looping video drawn as a field of words (port of the client's
 * "ASCII_FIELD v6" reference, plus the site's own touches).
 *
 * v6 engine: each text row is cut into fixed slots (word + gap mark). A slot refills IN PLACE
 * when its life runs out (scramble burst, settling left→right), so nothing slides. Brightness
 * per cell comes from the video (auto-levels → contrast/brightness → smoothing → threshold);
 * dark cells may show faint flickering "static" words. The video loops gaplessly with two
 * players crossfading at the seam (optional scramble storm at the seam).
 *
 * Site touches: a small "highlight" keyword set drawn in its own colour; eye size (zoom) and
 * phone sizing; a torch and slight drift toward the mouse; crosshair cursor (homepage only);
 * reduced motion holds the eye still and open.
 *
 * Settings are read every frame, so the console preview reacts instantly.
 */

export interface EyeFieldProps {
  settings: HomeEyeSettings;
  /** the normal keyword set */
  words: string[];
  /** the small highlight set */
  highlight: string[];
  /** video sources, tried in order */
  sources: { src: string; type: string }[];
  /** true: fills the whole window behind the homepage; false: fills its parent (console preview) */
  fixed?: boolean;
  /** show the crosshair cursor (homepage) */
  crosshair?: boolean;
  className?: string;
  /** reports what the video is doing (console preview) */
  onStatus?: (s: { ready: boolean; source: string; duration: number; error?: string }) => void;
}

const RAMP = "`.,:;'^\"~-_+<>i!l?/\\|(){}[]1rcvunxzjftJCLUYXZ234579OQoahkbdpqwm*WMB8%&$#@";
const STAGGER = 16;
const BOLD_AT = 0.55;
const MAX_MARK = 8;
const LENS = 150;
const loadedGoogleFonts = new Set<string>();

function segment(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(s), (x) => x.segment);
  return Array.from(s);
}

function ensureGoogleFont(spec: string | undefined) {
  if (!spec || loadedGoogleFonts.has(spec)) return;
  loadedGoogleFonts.add(spec);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(l);
}

export default function EyeField({ settings, words, highlight, sources, fixed, crosshair, className = '', onStatus }: EyeFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const cfgRef = useRef(settings);
  cfgRef.current = settings;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  // bumps when a newly chosen font finishes loading, so the field re-measures itself
  const [fontTick, setFontTick] = useState(0);
  // Changing any of these rebuilds the glyph atlas and the word rows.
  const layoutKey = useMemo(
    () => JSON.stringify([settings.font, settings.density, settings.densityPhone, settings.ink, settings.highlightColor, settings.mode, settings.upper, settings.gapMark, words, highlight, fontTick]),
    [settings.font, settings.density, settings.densityPhone, settings.ink, settings.highlightColor, settings.mode, settings.upper, settings.gapMark, words, highlight, fontTick],
  );
  const layoutRef = useRef({ key: layoutKey, words, highlight });
  layoutRef.current = { key: layoutKey, words, highlight };
  const sourcesKey = JSON.stringify(sources);
  const sourcesRef = useRef({ key: sourcesKey, list: sources });
  sourcesRef.current = { key: sourcesKey, list: sources };

  useEffect(() => {
    const wrap = wrapRef.current, cvs = canvasRef.current, cross = crossRef.current;
    if (!wrap || !cvs) return;
    const ctx = cvs.getContext('2d', { alpha: false });
    const sample = document.createElement('canvas');
    const sctx = sample.getContext('2d', { willReadFrequently: true });
    const measure = document.createElement('canvas').getContext('2d');
    if (!ctx || !sctx || !measure) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    // ---------------- state ----------------
    let W = 0, H = 0, COLS = 0, ROWS = 0, N = 0, CW = 6, CH = 11, FS = 9, phone = false;
    let builtKey = '', builtW = -1, builtH = -1;
    let GLYPHS: string[] = [];
    let glyphIdx: Record<string, number> = {};
    let MARK: number[] = [-1];
    let NORMAL: string[][] = [], HI: string[][] = [];
    let wordMode = false;
    let rowBuf: Int16Array[] = [], rowHi: Uint8Array[] = [], rowSettle: Float32Array[] = [];
    let rowSpans: { s: number; e: number; next: number }[][] = [];
    let bPrev = new Float32Array(0), ph = new Float32Array(0), sp = new Float32Array(0), nextFlip = new Float32Array(0);
    // cursor flow: the mouse stirs the image like ink in water (see flow.ts); bImg holds this frame's image brightness per cell
    const flow = new EyeFlow();
    const srcXY = new Float32Array(2);
    let bImg = new Float32Array(0), flowT = 0, lastPX = NaN, lastPY = NaN;
    let bgOn = new Uint8Array(0), jit = new Int8Array(0);
    const atlas = { n: document.createElement('canvas'), b: document.createElement('canvas'), hn: document.createElement('canvas'), hb: document.createElement('canvas') };

    const fontCss = (weight: string) => `${weight} ${FS}px ${EYE_FONTS[cfgRef.current.font].css}`;
    const cfg = () => cfgRef.current;

    function lifeRange() {
      const c = cfg();
      const s = reduce ? 0 : c.churn;
      return { min: 40 + (100 - s) * 7, vary: 160 + (100 - s) * 14, off: s <= 0 };
    }
    function spanLife() { const r = lifeRange(); return r.off ? Infinity : r.min * 2.2 + Math.random() * r.vary * 2.6; }
    function burstBase(t: number) { const b = reduce ? 0 : cfg().burst; return b > 0 ? t + b * (0.5 + Math.random() * 1.2) : 0; }

    // ---------------- atlas ----------------
    function fillAtlas(cv: HTMLCanvasElement, weight: string, color: string) {
      cv.width = Math.max(1, GLYPHS.length) * CW * DPR;
      cv.height = CH * DPR;
      const a = cv.getContext('2d');
      if (!a) return;
      a.setTransform(DPR, 0, 0, DPR, 0, 0);
      a.clearRect(0, 0, cv.width, cv.height);
      a.font = fontCss(weight);
      a.textAlign = 'center';
      a.textBaseline = 'middle';
      a.fillStyle = color;
      for (let i = 0; i < GLYPHS.length; i++) a.fillText(GLYPHS[i], i * CW + CW / 2, CH / 2 + 0.5);
    }

    function buildAtlas() {
      const c = cfg();
      const { words: w, highlight: hl } = layoutRef.current;
      const prep = (list: string[]) => list.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).map((s) => segment(c.upper ? s.toUpperCase() : s));
      NORMAL = prep(w);
      HI = prep(hl);
      if (!NORMAL.length && HI.length) NORMAL = HI;
      wordMode = c.mode === 'words' && NORMAL.length > 0;
      const seen = new Set<string>();
      GLYPHS = [];
      if (wordMode) {
        for (const word of [...NORMAL, ...HI]) for (const g of word) if (g !== ' ' && !seen.has(g)) { seen.add(g); GLYPHS.push(g); }
        for (const g of segment(c.gapMark).slice(0, MAX_MARK)) if (g !== ' ' && !seen.has(g)) { seen.add(g); GLYPHS.push(g); }
        if (!GLYPHS.length) GLYPHS = RAMP.split('');
      } else {
        GLYPHS = RAMP.split('');
      }
      glyphIdx = {};
      GLYPHS.forEach((g, i) => { glyphIdx[g] = i; });
      MARK = segment(c.gapMark).slice(0, MAX_MARK).map((g) => (g === ' ' || glyphIdx[g] === undefined ? -1 : -(glyphIdx[g] + 2)));
      if (!MARK.length) MARK = [-1];

      measure!.font = fontCss('400');
      const widths = GLYPHS.map((g) => measure!.measureText(g).width).sort((a, b) => a - b);
      const q90 = widths[Math.min(widths.length - 1, Math.floor(widths.length * 0.9))] || FS * 0.6;
      CW = Math.max(4, Math.ceil(Math.max(q90, FS * 0.42)));
      CH = Math.max(6, Math.round(FS * 1.22));
      fillAtlas(atlas.n, '400', c.ink);
      fillAtlas(atlas.b, '700', c.ink);
      fillAtlas(atlas.hn, '400', c.highlightColor);
      fillAtlas(atlas.hb, '700', c.highlightColor);
    }

    // ---------------- word rows (slots refill in place) ----------------
    function pickFit(maxLen: number, wantHi: boolean): { w: string[]; hi: boolean } | null {
      const lists: [string[][], boolean][] = wantHi && HI.length ? [[HI, true], [NORMAL, false]] : [[NORMAL, false]];
      for (const [list, hi] of lists) {
        for (let tr = 0; tr < 8; tr++) { const w = list[(Math.random() * list.length) | 0]; if (w.length <= maxLen) return { w, hi }; }
        const fits = list.filter((w) => w.length <= maxLen);
        if (fits.length) return { w: fits[(Math.random() * fits.length) | 0], hi };
      }
      return null;
    }
    const wantHi = () => HI.length > 0 && Math.random() < cfg().highlightShare;

    function writeWord(row: number, word: string[], hi: boolean, c0: number, pos: number, end: number, sBase: number, s0: number) {
      const buf = rowBuf[row], hb = rowHi[row], stl = rowSettle[row];
      for (let c = c0; c < word.length && pos < end; c++, pos++) {
        const g = word[c];
        buf[pos] = g === ' ' ? MARK[0] : glyphIdx[g] !== undefined ? glyphIdx[g] : -1;
        hb[pos] = hi ? 1 : 0;
        stl[pos] = sBase ? sBase + (pos - s0) * STAGGER : 0;
      }
      return pos;
    }
    function writeMark(row: number, pos: number, end: number, sBase: number, s0: number) {
      const buf = rowBuf[row], hb = rowHi[row], stl = rowSettle[row];
      for (let m = 0; m < MARK.length && pos < end; m++, pos++) { buf[pos] = MARK[m]; hb[pos] = 0; stl[pos] = sBase ? sBase + (pos - s0) * STAGGER : 0; }
      return pos;
    }
    function buildRow(row: number, t: number) {
      const spans: { s: number; e: number; next: number }[] = [];
      rowSpans[row] = spans;
      let pos = 0, first = true;
      while (pos < COLS) {
        const hiPick = wantHi() && HI.length ? true : false;
        const list = hiPick ? HI : NORMAL;
        const word = list[(Math.random() * list.length) | 0];
        const c0 = first ? (Math.random() * word.length) | 0 : 0; // phase break
        first = false;
        const sBase = burstBase(t), s0 = pos;
        pos = writeWord(row, word, hiPick, c0, pos, COLS, sBase, s0);
        pos = writeMark(row, pos, COLS, sBase, s0);
        spans.push({ s: s0, e: pos, next: t + Math.random() * spanLife() });
      }
    }
    function fillSlot(row: number, s: number, e: number, t: number) {
      const sBase = burstBase(t);
      let pos = s;
      while (pos < e) {
        // leave room for the gap mark, so a refilled word never touches the next slot
        const room = e - pos - MARK.length;
        if (room < 1) break;
        const p = pickFit(room, wantHi());
        if (!p) break;
        pos = writeWord(row, p.w, p.hi, 0, pos, e, sBase, s);
        pos = writeMark(row, pos, e, sBase, s);
      }
      let phase = 0;
      while (pos < e) { rowBuf[row][pos] = MARK[phase % MARK.length]; rowHi[row][pos] = 0; rowSettle[row][pos] = sBase ? sBase + (pos - s) * STAGGER : 0; phase++; pos++; }
    }
    function rebuildRows() {
      rowBuf = []; rowHi = []; rowSettle = []; rowSpans = [];
      if (!wordMode) return;
      const t = performance.now();
      for (let r = 0; r < ROWS; r++) {
        rowBuf.push(new Int16Array(COLS)); rowHi.push(new Uint8Array(COLS)); rowSettle.push(new Float32Array(COLS));
        buildRow(r, t);
      }
    }
    function churnRows(t: number, storm: number) {
      for (let r = 0; r < ROWS; r++) {
        const spans = rowSpans[r];
        if (!spans || !spans.length) continue;
        for (const sp2 of spans) if (sp2.next < t) { fillSlot(r, sp2.s, sp2.e, t); sp2.next = t + spanLife(); }
        if (storm > 0 && Math.random() < storm) { const sp3 = spans[(Math.random() * spans.length) | 0]; fillSlot(r, sp3.s, sp3.e, t); sp3.next = t + spanLife(); }
      }
    }

    // ---------------- grid ----------------
    function layout() {
      const rect = wrap!.getBoundingClientRect();
      W = Math.max(1, Math.round(fixed ? window.innerWidth : rect.width));
      H = Math.max(1, Math.round(fixed ? window.innerHeight : rect.height));
      phone = W < 768 && H > W;
      const c = cfg();
      FS = phone ? c.densityPhone : c.density;
      cvs!.width = Math.round(W * DPR);
      cvs!.height = Math.round(H * DPR);
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildAtlas();
      COLS = Math.ceil(W / CW);
      ROWS = Math.ceil(H / CH);
      N = COLS * ROWS;
      sample.width = COLS;
      sample.height = ROWS;
      bPrev = new Float32Array(N); ph = new Float32Array(N); sp = new Float32Array(N); nextFlip = new Float32Array(N);
      bImg = new Float32Array(N); flow.resize(COLS, ROWS); lastPX = lastPY = NaN;
      bgOn = new Uint8Array(N); jit = new Int8Array(N);
      for (let i = 0; i < N; i++) {
        ph[i] = Math.random() * Math.PI * 2; sp[i] = 0.5 + Math.random() * 2.2; bgOn[i] = Math.random() < 0.45 ? 1 : 0;
        jit[i] = ((Math.random() * 19) | 0) - 9; nextFlip[i] = Math.random() * 600;
      }
      rebuildRows();
      builtKey = layoutRef.current.key; builtW = W; builtH = H;
    }

    // ---------------- video (two players for a gapless loop) ----------------
    const mkVideo = () => {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.loop = false; v.crossOrigin = 'anonymous';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      return v;
    };
    const vA = mkVideo(), vB = mkVideo();
    let act = vA, sby = vB, sbyStarted = false, seamW = 0, loadedKey = '', held = false;
    const setRate = (v: HTMLVideoElement) => { v.defaultPlaybackRate = cfg().speed; v.playbackRate = cfg().speed; };
    function loadSources() {
      loadedKey = sourcesRef.current.key;
      held = false;
      for (const v of [vA, vB]) {
        v.pause();
        while (v.firstChild) v.removeChild(v.firstChild);
        for (const s of sourcesRef.current.list) { const el = document.createElement('source'); el.src = s.src; el.type = s.type; v.appendChild(el); }
        v.load();
      }
      act = vA; sby = vB; sbyStarted = false; seamW = 0;
      playAct();
    }
    function playAct() {
      if (held) return;
      setRate(act);
      act.play().catch(() => { /* autoplay blocked: retried on first tap */ });
    }
    vA.addEventListener('loadeddata', () => {
      statusRef.current?.({ ready: true, source: vA.currentSrc, duration: vA.duration });
    });
    // a failing <source> only matters when it was the last one to try
    const onErr = (e: Event) => {
      const t = e.target as Element;
      if (t === vA || t === vA.lastElementChild) statusRef.current?.({ ready: false, source: '', duration: 0, error: 'The video could not be played in this browser.' });
    };
    vA.addEventListener('error', onErr, true);
    const onTime = () => {
      // reduced motion: let the eye open, then hold it still
      if (!reduce || held || !isFinite(act.duration)) return;
      if (act.currentTime >= Math.min(act.duration * 0.45, 3)) { held = true; act.pause(); }
    };
    vA.addEventListener('timeupdate', onTime);

    function drawVideo(v: HTMLVideoElement, alpha: number) {
      const vw = v.videoWidth, vh = v.videoHeight;
      if (!vw || !vh) return false;
      const c = cfg();
      const gw = COLS * CW, gh = ROWS * CH; // grid size in px
      let s: number;
      if (phone) s = (gw / vw) * c.phoneSize;
      else if (c.fit === 'contain') s = Math.min(gw / vw, gh / vh);
      else s = Math.max(gw / vw, gh / vh) * c.zoom;
      const sw = gw / s, sh = gh / s;
      const sx = (vw - sw) / 2 + (c.parallax ? (par.x * (vw - sw)) / 2 : 0);
      const sy = (vh - sh) / 2 + (c.parallax ? (par.y * (vh - sh)) / 2 : 0);
      const x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(vw, sx + sw), y1 = Math.min(vh, sy + sh);
      if (x1 <= x0 || y1 <= y0) return false;
      sctx!.globalAlpha = alpha;
      sctx!.drawImage(v, x0, y0, x1 - x0, y1 - y0, ((x0 - sx) * COLS) / sw, ((y0 - sy) * ROWS) / sh, ((x1 - x0) * COLS) / sw, ((y1 - y0) * ROWS) / sh);
      sctx!.globalAlpha = 1;
      return true;
    }

    function sampleFrame(): Uint8ClampedArray | null {
      if (act.readyState < 2 || !act.videoWidth) return null;
      seamW = 0;
      const dur = act.duration;
      // browser-recorded videos may not know their length yet: loop natively until they do
      act.loop = !held && !(isFinite(dur) && dur > 0.3);
      if (!held && isFinite(dur) && dur > 0.3) {
        const XF = Math.min(cfg().blend, dur / 3);
        const rem = dur - act.currentTime;
        if (!act.paused && rem <= XF && !sbyStarted && sby.readyState >= 2) {
          try { sby.currentTime = 0; } catch { /* not seekable yet */ }
          setRate(sby);
          sby.play().catch(() => {});
          sbyStarted = true;
        }
        if (sbyStarted) seamW = Math.min(1, Math.max(0, 1 - rem / XF));
        if (act.ended || rem <= 0.02) {
          const tmp = act; act = sby; sby = tmp;
          sby.pause();
          try { sby.currentTime = 0; } catch { /* ignore */ }
          sbyStarted = false; seamW = 0;
          if (act.paused) playAct();
          if (!act.videoWidth) return null;
        }
      }
      sctx!.clearRect(0, 0, COLS, ROWS);
      if (!drawVideo(act, 1)) return null;
      if (seamW > 0 && sby.readyState >= 2) drawVideo(sby, seamW);
      return sctx!.getImageData(0, 0, COLS, ROWS).data;
    }

    // ---------------- pointer ----------------
    let mx = -9999, my = -9999, pointerIn = false;
    const par = { x: 0, y: 0 }, parT = { x: 0, y: 0 };
    function onMove(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      const r = wrap!.getBoundingClientRect();
      mx = e.clientX - (fixed ? 0 : r.left);
      my = e.clientY - (fixed ? 0 : r.top);
      pointerIn = mx >= 0 && my >= 0 && mx <= W && my <= H;
      if (pointerIn) { parT.x = (mx / W - 0.5) * 2; parT.y = (my / H - 0.5) * 2; }
      // cursor flow: feed the path since the last move (in cell units) to the fluid
      if (pointerIn && !reduce && cfg().flow > 0 && CW > 0) {
        const cx = mx / CW, cy = my / CH;
        if (lastPX === lastPX) flow.push(lastPX, lastPY, cx, cy);
        lastPX = cx; lastPY = cy;
      } else { lastPX = lastPY = NaN; }
      if (cross) {
        const overUi = (e.target as Element | null)?.closest?.('a, button, input, textarea, select, label, [role="button"], [role="dialog"]');
        cross.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        cross.style.opacity = overUi || !pointerIn ? '0' : '1';
      }
    }
    function onLeave() { pointerIn = false; mx = my = -9999; lastPX = lastPY = NaN; if (cross) cross.style.opacity = '0'; }

    // ---------------- render ----------------
    let LO = 0.2, HI_L = 0.8, last = 0, raf = 0, gap = 33;
    const hist = new Uint32Array(64);
    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      if (t - last < gap) return;
      last = t;
      const t0 = performance.now();
      const c = cfg();
      if (loadedKey !== sourcesRef.current.key) loadSources();
      // homepage: re-layout only after a (debounced) resize, so a phone's address bar showing/hiding
      // doesn't rebuild the field; console preview: follow the box's size directly
      let sizeChanged = builtW < 0;
      if (!fixed) { const rect = wrap!.getBoundingClientRect(); sizeChanged = builtW !== Math.round(rect.width) || builtH !== Math.round(rect.height); }
      if (builtKey !== layoutRef.current.key || sizeChanged) layout();
      if (act.playbackRate !== c.speed && !act.paused) setRate(act);
      par.x += ((c.parallax ? parT.x * 0.6 : 0) - par.x) * 0.04;
      par.y += ((c.parallax ? parT.y * 0.6 : 0) - par.y) * 0.04;

      ctx!.globalAlpha = 1;
      ctx!.fillStyle = c.bg;
      ctx!.fillRect(0, 0, W, H);
      const d = sampleFrame();

      // cursor flow: advance the fluid (time-based, so a slower draw rate doesn't change the feel)
      const fdt = flowT ? Math.min(3, (t - flowT) / 33.3) : 1;
      flowT = t;
      if (c.flow > 0 && !reduce) flow.step(fdt, { strength: c.flow, linger: c.flowLinger });
      else if (flow.energy > 0) flow.calm();
      const warp = flow.energy > 0;

      if (wordMode) churnRows(t, c.seam && seamW > 0 && !reduce ? Math.sin(Math.PI * seamW) * 0.6 : 0);

      // auto-levels over the cells that show the video
      if (d && c.autoLevels) {
        hist.fill(0);
        let n = 0;
        for (let i = 0, k = 0; i < N; i++, k += 4) {
          if (d[k + 3] < 128) continue;
          n++;
          hist[Math.min(63, ((d[k] * 0.299 + d[k + 1] * 0.587 + d[k + 2] * 0.114) / 4) | 0)]++;
        }
        if (n) {
          let acc = 0, lo = 0, hi = 63;
          for (let q = 0; q < 64; q++) { acc += hist[q]; if (acc >= n * 0.22) { lo = q; break; } }
          acc = 0;
          for (let q = 63; q >= 0; q--) { acc += hist[q]; if (acc >= n * 0.02) { hi = q; break; } }
          LO += (lo / 63 - LO) * 0.1;
          HI_L += (Math.max(lo + 8, hi) / 63 - HI_L) * 0.1;
        }
      }

      const L = GLYPHS.length - 1;
      const sm = c.smooth, thresh = c.thresh, gapFill = c.gapFill, intensity = c.intensity, boost = c.highlightBoost;
      const statics = c.statics, torch = c.torch && pointerIn, lens2 = LENS * LENS;
      const step = (t / 45) | 0;
      const flick = !reduce;
      // the image's brightness per cell (0 where there is no video)
      for (let i = 0, k = 0; i < N; i++, k += 4) {
        let b = 0;
        if (d && d[k + 3] >= 128) {
          let lum = (0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]) / 255;
          if (c.autoLevels) lum = Math.min(1, Math.max(0, (lum - LO) / Math.max(0.02, HI_L - LO)));
          if (c.invert) lum = 1 - lum;
          b = (lum - 0.5) * c.contrast + 0.5 + c.bright;
          if (b < 0) b = 0; else if (b > 1) b = 1;
        }
        bImg[i] = b;
      }
      const maxC = COLS - 1.001, maxR = ROWS - 1.001;
      for (let row = 0, i = 0; row < ROWS; row++) {
        const y = row * CH;
        const buf = wordMode ? rowBuf[row] : null, hb = wordMode ? rowHi[row] : null, stl = wordMode ? rowSettle[row] : null;
        for (let col = 0; col < COLS; col++, i++) {
          let b = bImg[i];
          if (warp) {
            // read the image from where the fluid has carried this cell's view (smooth, between cells)
            flow.source(col, row, srcXY);
            let sx = srcXY[0], sy = srcXY[1];
            if (sx < 0) sx = 0; else if (sx > maxC) sx = maxC;
            if (sy < 0) sy = 0; else if (sy > maxR) sy = maxR;
            const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, q = y0 * COLS + x0;
            const x1 = x0 + 1 < COLS ? 1 : 0, y1 = y0 + 1 < ROWS ? COLS : 0;
            const top = bImg[q] + (bImg[q + x1] - bImg[q]) * fx;
            const bot = bImg[q + y1] + (bImg[q + y1 + x1] - bImg[q + y1]) * fx;
            b = top + (bot - top) * fy;
          }
          if (torch) {
            const dx = col * CW + CW / 2 - mx, dy = y + CH / 2 - my, d2 = dx * dx + dy * dy;
            if (d2 < lens2) b = Math.min(1, b + 0.55 * (1 - Math.sqrt(d2) / LENS));
          }
          b = bPrev[i] = bPrev[i] * sm + b * (1 - sm);

          if (b <= thresh) {
            if (!statics || !bgOn[i]) continue;
            const f = flick ? 0.5 + 0.5 * Math.sin(t * 0.001 * sp[i] + ph[i]) : 0.6;
            b = 0.012 + 0.055 * f * f;
            if (b < 0.02) continue;
          }

          let idx: number, ghost = false, hi = false;
          if (wordMode) {
            if (t < stl![col]) {
              let hsh = ((col * 73856093) ^ (row * 19349663) ^ (step * 83492791)) >>> 0;
              hsh = (hsh ^ (hsh >> 13)) >>> 0;
              idx = hsh % GLYPHS.length;
            } else {
              const v = buf![col];
              if (v >= 0) idx = v;
              else if (v <= -2) { if (gapFill <= 0) continue; idx = -v - 2; ghost = true; }
              else continue; // blank cell
            }
            hi = hb![col] === 1 && !ghost;
          } else {
            if (t > nextFlip[i]) { jit[i] = ((Math.random() * 19) | 0) - 9; const r = lifeRange(); nextFlip[i] = t + r.min + Math.random() * r.vary; }
            idx = (b * L + jit[i]) | 0;
            if (idx < 0) idx = 0; else if (idx > L) idx = L;
          }
          let a = Math.pow(b, 0.9) * intensity;
          if (hi && b > thresh) a = Math.min(1, a + boost);
          ctx!.globalAlpha = a * (ghost ? gapFill : 1);
          const bold = !ghost && wordMode && b > BOLD_AT;
          const src = hi ? (bold ? atlas.hb : atlas.hn) : bold ? atlas.b : atlas.n;
          ctx!.drawImage(src, idx * CW * DPR, 0, CW * DPR, CH * DPR, col * CW, y, CW, CH);
        }
      }
      ctx!.globalAlpha = 1;
      const cost = performance.now() - t0;
      gap = cost > 22 ? 50 : cost > 14 ? 40 : 33; // slow machine or huge screen: draw less often
    }

    // ---------------- start / stop ----------------
    const startOnTap = () => playAct();
    const onVis = () => { if (document.visibilityState === 'hidden') { act.pause(); sby.pause(); } else playAct(); };
    let rt: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        // a phone's address bar showing/hiding only changes the height a little: keep the field as is
        if (fixed && Math.round(window.innerWidth) === W && Math.abs(window.innerHeight - H) < 140) return;
        builtW = -1; builtH = -1;
      }, 120);
    };
    const ro = fixed ? null : new ResizeObserver(onResize);
    ro?.observe(wrap);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerdown', startOnTap, { once: true });
    document.addEventListener('visibilitychange', onVis);
    const onBlur = () => { lastPX = lastPY = NaN; };
    window.addEventListener('blur', onBlur);

    let alive = true;
    const f = EYE_FONTS[cfg().font];
    ensureGoogleFont(f.google);
    layout();
    loadSources();
    (document.fonts?.load(`400 16px ${f.css}`) ?? Promise.resolve()).catch(() => {}).finally(() => { if (alive) builtKey = ''; }); // re-measure once the font is in
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerdown', startOnTap);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      vA.removeEventListener('timeupdate', onTime);
      vA.removeEventListener('error', onErr, true);
      for (const v of [vA, vB]) { v.pause(); v.removeAttribute('src'); while (v.firstChild) v.removeChild(v.firstChild); v.load(); }
    };
  }, [fixed]);

  // a newly chosen font loads from Google Fonts, then the field re-measures itself
  useEffect(() => {
    const f = EYE_FONTS[settings.font];
    ensureGoogleFont(f.google);
    let on = true;
    document.fonts?.load(`400 16px ${f.css}`).then(() => { if (on) setFontTick((n) => n + 1); }).catch(() => {});
    return () => { on = false; };
  }, [settings.font]);

  return (
    <div ref={wrapRef} className={`${fixed ? 'fixed inset-0 z-0' : 'absolute inset-0'} pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="block w-full h-full" />
      {crosshair && <div ref={crossRef} className="hp-cross" />}
    </div>
  );
}
