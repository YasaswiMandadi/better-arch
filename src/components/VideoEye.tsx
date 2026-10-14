import { useEffect, useMemo, useRef } from 'react';
import { useAllKeywords } from '../data/useKeywords';

/**
 * Homepage background: a real eye (a short looping video) drawn entirely out
 * of the site's own keywords, in the spirit of unseen.co.
 *
 *  - The screen is a grid of letter cells filled with a running stream of the
 *    live keywords (published content only). Each cell's brightness follows the
 *    video: lit skin / lids / the white of the eye are made of words, the dark
 *    iris, pupil and lashes stay empty.
 *  - The video (public/home/eye-loop.*) opens, holds and blinks on a seamless
 *    loop, played 1.5x.
 *  - Pointer (mouse only): a crosshair cursor, a soft "torch" that reveals words
 *    around it, and a slight drift of the eye towards the cursor.
 *  - The words are decoration only (no hover, no links).
 *  - prefers-reduced-motion: the eye opens once and then holds still; no shimmer.
 */

const FALLBACK = [
  'architecture', 'media', 'mirror', 'labour', 'critical', 'space', 'image', 'city', 'caste', 'class', 'capital',
  'platform', 'dialogue', 'commons', 'housing', 'access', 'craft', 'power', 'listen', 'question',
];

const RGB = [224, 130, 92]; // BetterArch coral (#E0825C)
const BG = '#070707'; // the homepage background
const SPEED = 1.5; // eye video playback rate
const ZOOM = 1.2; // the eye shown ~15% bigger than a plain "cover" fit (also room for the drift)
const LEVELS = 14;
const LENS = 150; // torch radius, px
const FONT = (fs: number) => `600 ${fs}px "Roboto Mono", ui-monospace, monospace`;
const GLYPHS = '·:;+*#%/\\|<>=~';

export function useEyeKeywords(): string[] {
  const all = useAllKeywords();
  return useMemo(() => {
    const words = all.map((k) => k.word.trim().toLowerCase()).filter((w) => w && w.length <= 32);
    return words.length >= 8 ? words : FALLBACK;
  }, [all]);
}

function shuffled<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export default function VideoEye({ words }: { words: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef(words);
  const relayout = useRef<() => void>(() => {});

  // New keywords (e.g. content loaded from the database) → refill the grid.
  useEffect(() => {
    wordsRef.current = words;
    relayout.current();
  }, [words]);

  useEffect(() => {
    const cvs = canvasRef.current;
    const vid = videoRef.current;
    const cross = crossRef.current;
    if (!cvs || !vid) return;
    const ctx = cvs.getContext('2d', { alpha: false });
    const probe = document.createElement('canvas');
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    if (!ctx || !pctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, FS = 9, cw = 6, chh = 11, cols = 0, rows = 0;
    let chars: string[] = [];
    let glyph: ({ g: string; until: number } | null)[] = [];

    function layout() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      FS = W < 720 ? 8 : 9;
      cvs!.width = Math.round(W * dpr);
      cvs!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.font = FONT(FS);
      cw = ctx!.measureText('M').width || FS * 0.6;
      chh = Math.round(FS * 1.22);
      cols = Math.ceil(W / cw);
      rows = Math.ceil(H / chh);
      probe.width = cols;
      probe.height = rows;
      const n = cols * rows;
      chars = new Array(n);
      glyph = new Array(n).fill(null);
      let i = 0;
      let bag: string[] = [];
      while (i < n) {
        if (!bag.length) bag = shuffled(wordsRef.current);
        const w = bag.pop()!;
        for (const c of w) {
          if (i >= n) break;
          chars[i++] = c;
        }
        if (i < n) chars[i++] = ' ';
      }
    }
    relayout.current = layout;

    // ---- pointer (mouse only) ----
    let mx = -9999, my = -9999, pointerIn = false;
    const par = { x: 0, y: 0 }, parT = { x: 0, y: 0 };
    function onMove(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX;
      my = e.clientY;
      pointerIn = true;
      parT.x = (mx / W - 0.5) * 2;
      parT.y = (my / H - 0.5) * 2;
      if (cross) {
        // over links, buttons and fields the normal cursor shows instead of the crosshair
        const overUi = (e.target as Element | null)?.closest?.('a, button, input, textarea, select, label, [role="button"], [role="dialog"]');
        cross.style.transform = `translate(${mx}px, ${my}px)`;
        cross.style.opacity = overUi ? '0' : '1';
      }
    }
    function onLeave() {
      pointerIn = false;
      mx = my = -9999;
      if (cross) cross.style.opacity = '0';
    }

    // ---- video → one brightness value per cell ----
    function sample(): Uint8ClampedArray | null {
      if (!(vid!.readyState >= 2 && vid!.videoWidth)) return null;
      const vw = vid!.videoWidth, vh = vid!.videoHeight;
      const s = Math.max((cols * cw) / vw, (rows * chh) / vh) * ZOOM;
      const sw = (cols * cw) / s, sh = (rows * chh) / s;
      const sx = (vw - sw) / 2 + (par.x * (vw - sw)) / 2;
      const sy = (vh - sh) / 2 + (par.y * (vh - sh)) / 2;
      pctx!.drawImage(vid!, sx, sy, sw, sh, 0, 0, cols, rows);
      return pctx!.getImageData(0, 0, cols, rows).data;
    }

    // ---- drawing ----
    let LO = 0.2, HI = 0.8, last = 0, raf = 0, frameGap = 33;
    const buckets: number[][] = Array.from({ length: LEVELS + 1 }, () => []);
    const hist = new Uint32Array(64);

    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      if (t - last < frameGap) return;
      last = t;
      const t0 = performance.now();
      par.x += (parT.x * 0.6 - par.x) * 0.04;
      par.y += (parT.y * 0.6 - par.y) * 0.04;
      const px = sample();
      ctx!.fillStyle = BG;
      ctx!.fillRect(0, 0, W, H);
      if (!px) return;

      // auto-levels: stretch this frame's own dark→bright range (the footage is moody)
      const n = cols * rows;
      hist.fill(0);
      for (let i = 0; i < n; i++) {
        const p = i * 4;
        hist[Math.min(63, ((px[p] * 0.299 + px[p + 1] * 0.587 + px[p + 2] * 0.114) / 4) | 0)]++;
      }
      let acc = 0, lo = 0, hi = 63;
      for (let k = 0; k < 64; k++) { acc += hist[k]; if (acc >= n * 0.22) { lo = k; break; } }
      acc = 0;
      for (let k = 63; k >= 0; k--) { acc += hist[k]; if (acc >= n * 0.02) { hi = k; break; } }
      LO += (lo / 63 - LO) * 0.1; // eased, so it never flickers
      HI += (Math.max(lo + 8, hi) / 63 - HI) * 0.1;

      for (const b of buckets) b.length = 0;
      const lens2 = LENS * LENS;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          if (chars[i] === ' ' || chars[i] === undefined) continue;
          const p = i * 4;
          const lum = (px[p] * 0.299 + px[p + 1] * 0.587 + px[p + 2] * 0.114) / 255;
          let a = Math.min(1, Math.max(0, (lum - LO) / (HI - LO)));
          a = Math.pow(a, 1.15); // dark parts stay empty, mid-tones stay readable
          if (pointerIn) {
            const dx = c * cw + cw / 2 - mx, dy = r * chh + chh / 2 - my, d2 = dx * dx + dy * dy;
            if (d2 < lens2) a = Math.min(1, a + 0.55 * (1 - Math.sqrt(d2) / LENS));
          }
          if (a < 0.07) continue;
          if (!reduce && Math.random() < 0.0009) glyph[i] = { g: GLYPHS[(Math.random() * GLYPHS.length) | 0], until: t + 90 + Math.random() * 220 };
          buckets[Math.round(a * LEVELS)].push(i);
        }
      }
      ctx!.textBaseline = 'top';
      ctx!.font = FONT(FS);
      for (let L = 1; L <= LEVELS; L++) {
        const list = buckets[L];
        if (!list.length) continue;
        ctx!.fillStyle = `rgba(${RGB[0]},${RGB[1]},${RGB[2]},${(0.03 + (L / LEVELS) * 0.8).toFixed(3)})`;
        for (const i of list) {
          const g = glyph[i];
          let s = chars[i];
          if (g) { if (g.until > t) s = g.g; else glyph[i] = null; }
          ctx!.fillText(s, (i % cols) * cw, ((i / cols) | 0) * chh);
        }
      }
      // slow machine or a huge screen: draw less often instead of stuttering
      const cost = performance.now() - t0;
      frameGap = cost > 22 ? 50 : cost > 14 ? 40 : 33;
    }

    // ---- start ----
    const setSpeed = () => { vid.defaultPlaybackRate = SPEED; vid.playbackRate = SPEED; };
    let held = false; // reduced motion: true once the eye is open and still
    const play = () => { if (held) return; setSpeed(); vid.play().catch(() => { /* autoplay blocked: retried on first tap */ }); };
    // reduced motion: let the eye open once, then hold it still (no seeking needed)
    const holdOpen = () => { if (vid.currentTime >= 2.4) { held = true; vid.pause(); vid.removeEventListener('timeupdate', holdOpen); } };
    vid.addEventListener('loadedmetadata', setSpeed);
    vid.addEventListener('play', setSpeed);
    if (reduce) vid.addEventListener('timeupdate', holdOpen);
    play();
    document.addEventListener('pointerdown', play, { once: true });

    let rt: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(layout, 120); };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    layout();
    // re-measure once the mono font has loaded, then keep drawing
    let alive = true;
    (document.fonts?.load(FONT(FS)) ?? Promise.resolve()).catch(() => {}).finally(() => { if (alive) layout(); });
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      relayout.current = () => {};
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerdown', play);
      vid.removeEventListener('loadedmetadata', setSpeed);
      vid.removeEventListener('play', setSpeed);
      vid.removeEventListener('timeupdate', holdOpen);
      vid.pause();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-0 h-full w-full pointer-events-none" />
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        autoPlay
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
      >
        <source src="/home/eye-loop.webm" type="video/webm" />
        <source src="/home/eye-loop.mp4" type="video/mp4" />
      </video>
      {/* a soft dark pool behind the title, and fades under the menu and footer, so text always reads */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 30% 22% at 50% 50%, rgba(7,7,7,.6) 0%, rgba(7,7,7,.3) 50%, rgba(7,7,7,0) 80%),' +
            'linear-gradient(180deg, rgba(7,7,7,.92) 0, rgba(7,7,7,.55) 90px, rgba(7,7,7,0) 170px, rgba(7,7,7,0) calc(100% - 150px), rgba(7,7,7,.6) calc(100% - 70px), rgba(7,7,7,.92) 100%)',
        }}
      />
      {/* crosshair cursor (mouse only; hidden over links and buttons) */}
      <div ref={crossRef} aria-hidden="true" className="hp-cross" />
    </>
  );
}
