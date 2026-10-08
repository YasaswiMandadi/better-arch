import { useEffect, useMemo, useRef } from 'react';
import { useAllKeywords } from '../data/useKeywords';

/**
 * Homepage background: a calm, softly-lit eye drawn out of the site's own
 * keywords. Every character cell of the screen shows the next letter of a
 * running stream of keywords; its brightness follows a hidden "light map"
 * (the eye), so bright areas show letters and dark areas stay empty.
 *
 *  - the eye blinks slowly (about every 4.5–8 s) and its gaze follows the
 *    cursor gently
 *  - a small soft glow of brighter letters sits exactly under the pointer
 *
 * The keywords come from the live keyword registry (published content only).
 */

const FALLBACK: Array<[string, number]> = [
  ['architecture', 6], ['media', 6], ['labour', 4], ['mirror', 3], ['critical', 4], ['space', 4], ['image', 4],
  ['city', 3], ['caste', 3], ['class', 3], ['capital', 3], ['platform', 3], ['dialogue', 3], ['commons', 2],
  ['housing', 2], ['access', 2], ['craft', 2], ['power', 2], ['listen', 2], ['question', 2],
];

const LEVELS = 10;
const INK = [228, 231, 234];
const REST = 0.8; // open, relaxed and friendly
const BL = { close: 280, hold: 70, open: 460 };

type Pt = [number, number];

function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (k: number) => k * k * (3 - 2 * k);
const grey = (v: number, a = 1) => {
  const n = Math.round(255 * Math.max(0, Math.min(1, v)));
  return `rgba(${n},${n},${n},${a})`;
};
function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
function soft(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, v: number, a: number) {
  c.save();
  c.translate(cx, cy);
  c.scale(1, ry / rx);
  const gr = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, grey(v, a));
  gr.addColorStop(0.6, grey(v, a * 0.55));
  gr.addColorStop(1, grey(v, 0));
  c.fillStyle = gr;
  c.beginPath();
  c.arc(0, 0, rx, 0, 7);
  c.fill();
  c.restore();
}

const browR = rng(21);
const BROW = Array.from({ length: 46 }, () => [browR(), browR(), browR()]);

function drawEye(c: CanvasRenderingContext2D, cx: number, cy: number, e: number, open: number, gx: number, gy: number, k: number) {
  const A: Pt = [cx - 0.5 * e, cy + 0.05 * e];
  const B: Pt = [cx + 0.5 * e, cy - 0.085 * e]; // outer corner lifted a little: a friendlier line
  const U1 = lerp(0.13, -0.38, open) * e;
  const U2 = lerp(0.13, -0.38, open) * e;
  const up: [Pt, Pt, Pt, Pt] = [A, [cx - 0.18 * e, cy + U1], [cx + 0.2 * e, cy + U2], B];
  const lo: [Pt, Pt, Pt, Pt] = [A, [cx - 0.18 * e, cy + 0.15 * e], [cx + 0.2 * e, cy + 0.15 * e], B]; // lower lid gently lifted, as in a smile

  // skin around the eye
  soft(c, cx + 0.05 * e, cy - 0.02 * e, 1.1 * e, 0.62 * e, 0.34 * k, 0.8);
  soft(c, cx, cy - 0.03 * e, 0.78 * e, 0.32 * e, 0.1, 0.3 * k + 0.1);
  soft(c, cx + 0.08 * e, cy - 0.58 * e, 0.8 * e, 0.12 * e, 0.66 * k, 0.5);
  c.lineCap = 'round';
  for (const [a1, a2, a3] of BROW) {
    const x = cx - 0.62 * e + a1 * 1.35 * e;
    const y = cy - 0.74 * e - Math.sin(a1 * 3.1) * 0.12 * e + (a2 - 0.5) * 0.07 * e;
    c.strokeStyle = grey((0.1 + a3 * 0.14) * k, 0.4);
    c.lineWidth = Math.max(0.6, 0.011 * e);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 0.06 * e, y - 0.035 * e * (0.4 + a3));
    c.stroke();
  }
  const top = cy + 0.75 * U1;
  soft(c, cx + 0.02 * e, top - 0.1 * e, 0.6 * e, 0.045 * e, 0.1, 0.3);
  soft(c, cx + 0.02 * e, top - 0.04 * e, 0.5 * e, 0.07 * e, 0.45 * k, 0.28);

  // the eyeball, clipped to the lids
  c.save();
  c.beginPath();
  c.moveTo(...up[0]);
  c.bezierCurveTo(...up[1], ...up[2], ...up[3]);
  c.bezierCurveTo(...lo[2], ...lo[1], ...lo[0]);
  c.closePath();
  c.clip();
  const sc = c.createLinearGradient(cx - 0.5 * e, 0, cx + 0.5 * e, 0);
  sc.addColorStop(0, grey(0.55 * k));
  sc.addColorStop(0.5, grey(1.0 * k));
  sc.addColorStop(1, grey(0.7 * k));
  c.fillStyle = sc;
  c.fillRect(cx - 0.6 * e, cy - 0.5 * e, 1.2 * e, 1.0 * e);
  const ix = cx + gx;
  const iy = cy + gy + 0.015 * e;
  const ri = 0.215 * e;
  const ir = c.createRadialGradient(ix, iy, ri * 0.15, ix, iy, ri);
  ir.addColorStop(0, grey(0.24 * k));
  ir.addColorStop(0.55, grey(0.5 * k));
  ir.addColorStop(0.88, grey(0.36 * k));
  ir.addColorStop(1, grey(0.14 * k));
  c.fillStyle = ir;
  c.beginPath();
  c.arc(ix, iy, ri, 0, 7);
  c.fill();
  c.strokeStyle = grey(0.62 * k, 0.32);
  c.lineWidth = Math.max(0.5, 0.006 * e);
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * 6.2832;
    c.beginPath();
    c.moveTo(ix + Math.cos(t) * ri * 0.4, iy + Math.sin(t) * ri * 0.4);
    c.lineTo(ix + Math.cos(t) * ri * 0.88, iy + Math.sin(t) * ri * 0.88);
    c.stroke();
  }
  c.strokeStyle = grey(0.08, 0.7);
  c.lineWidth = 0.016 * e;
  c.beginPath();
  c.arc(ix, iy, ri, 0, 7);
  c.stroke();
  c.fillStyle = grey(0.03);
  c.beginPath();
  c.arc(ix, iy, ri * 0.36, 0, 7);
  c.fill();
  soft(c, ix + 0.075 * e, iy - 0.07 * e, 0.045 * e, 0.045 * e, 1, 0.8);
  soft(c, ix - 0.07 * e, iy + 0.07 * e, 0.025 * e, 0.025 * e, 1, 0.35);
  const sh = c.createLinearGradient(0, top - 0.02 * e, 0, top + 0.17 * e);
  sh.addColorStop(0, 'rgba(0,0,0,.18)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sh;
  c.fillRect(cx - 0.6 * e, top - 0.4 * e, 1.2 * e, 0.6 * e);
  soft(c, cx - 0.45 * e, cy + 0.045 * e, 0.045 * e, 0.03 * e, 0.62 * k, 0.8);
  c.restore();

  // lid edge and lashes
  c.strokeStyle = grey(0.08, 0.75);
  c.lineWidth = Math.max(1, 0.016 * e);
  c.beginPath();
  c.moveTo(...up[0]);
  c.bezierCurveTo(...up[1], ...up[2], ...up[3]);
  c.stroke();
  c.lineWidth = Math.max(0.6, 0.008 * e);
  const n = 14;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = bez(...up, t);
    const q = bez(...up, Math.min(1, t + 0.02));
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = dy / L;
    const ny = -dx / L;
    const len = (0.02 + 0.025 * Math.sin(t * 3.14)) * e * (0.35 + 0.65 * open) * (t > 0.5 ? 1.15 : 0.9);
    c.strokeStyle = grey(0.03, 0.4);
    c.beginPath();
    c.moveTo(p[0], p[1]);
    c.lineTo(p[0] + nx * len + 0.015 * e * t, p[1] + ny * len);
    c.stroke();
  }
  c.strokeStyle = grey(0.22 * k, 0.85);
  c.lineWidth = Math.max(0.8, 0.012 * e);
  c.beginPath();
  c.moveTo(...lo[0]);
  c.bezierCurveTo(...lo[1], ...lo[2], ...lo[3]);
  c.stroke();
  c.strokeStyle = grey(0.55 * k, 0.4);
  c.lineWidth = Math.max(0.6, 0.009 * e);
  c.beginPath();
  c.moveTo(A[0] + 0.05 * e, A[1] + 0.012 * e);
  c.bezierCurveTo(lo[1][0], lo[1][1] + 0.025 * e, lo[2][0], lo[2][1] + 0.025 * e, B[0] - 0.05 * e, B[1] + 0.012 * e);
  c.stroke();

  // under-eye shadow, cheek light
  soft(c, cx + 0.05 * e, cy + 0.3 * e, 0.55 * e, 0.07 * e, 0.1, 0.55 * k + 0.1);
  soft(c, cx + 0.2 * e, cy + 0.66 * e, 0.8 * e, 0.22 * e, 0.7 * k, 0.24);
}

export default function KeywordEye({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const all = useAllKeywords();

  // [word, weight] pairs; a stable string key so the effect only restarts when the words change
  const pairs = useMemo<Array<[string, number]>>(() => {
    const p = all
      .filter((k) => k.word && k.word.trim())
      .map((k) => [k.word.trim(), Math.max(1, k.occurrences.length)] as [string, number]);
    return p.length >= 6 ? p : FALLBACK;
  }, [all]);
  const key = useMemo(() => pairs.map(([w, f]) => `${w}:${f}`).join('|'), [pairs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const S = 1 / 3;
    let W = 0, H = 0, DPR = 1, cw = 0, ch = 0, cols = 0, rows = 0, cwD = 1, chD = 1;
    let atlas: HTMLCanvasElement | null = null;
    let rowIdx = new Int16Array(0);
    let grain = new Float32Array(0);
    let paint: HTMLCanvasElement | null = null;
    let pctx: CanvasRenderingContext2D | null = null;
    let small: HTMLCanvasElement | null = null;
    let sctx: CanvasRenderingContext2D | null = null;
    const eye = { cx: 0, cy: 0, ew: 0 };

    let open = REST;
    const gaze = { x: 0, y: 0 };
    const gazeT = { x: 0, y: 0 };
    const mouse = { x: null as number | null, y: 0, t: 0 };
    let lens = 0, lensX = 0, lensY = 0;
    let dirty = true, last = 0, raf = 0, nextSaccade = 0, blinkStart = -1;
    let nextBlink = performance.now() + 1800;
    let hidden = document.hidden;

    function buildStream(len: number) {
      const r = rng(7);
      const pool: string[] = [];
      for (const [w, f] of pairs) {
        const n = Math.max(1, Math.min(6, Math.round(Math.sqrt(f))));
        for (let i = 0; i < n; i++) pool.push(w);
      }
      let out = '';
      while (out.length < len) {
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(r() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        out += pool.join(' ') + ' ';
      }
      return out;
    }

    function layout() {
      W = window.innerWidth;
      H = window.innerHeight;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(W * DPR);
      canvas!.height = Math.round(H * DPR);
      cw = Math.max(5.2, W / 240);
      const fontPx = cw / 0.6;
      ch = Math.round(fontPx * 1.2);
      cols = Math.ceil(W / cw);
      rows = Math.ceil(H / ch);
      cwD = Math.max(1, Math.round(cw * DPR));
      chD = Math.max(1, Math.round(ch * DPR));

      const stream = buildStream(cols * rows + 400);
      const chars = Array.from(new Set(stream.replace(/ /g, '')));
      const charIndex = new Map(chars.map((c, i) => [c, i]));
      rowIdx = new Int16Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        const c = stream[i];
        rowIdx[i] = c === ' ' ? -1 : (charIndex.get(c) ?? -1);
      }

      atlas = document.createElement('canvas');
      atlas.width = chars.length * cwD;
      atlas.height = LEVELS * chD;
      const a = atlas.getContext('2d')!;
      a.textBaseline = 'middle';
      a.textAlign = 'center';
      a.font = `500 ${fontPx * DPR}px "Roboto Mono", ui-monospace, Menlo, Consolas, monospace`;
      for (let l = 1; l < LEVELS; l++) {
        a.fillStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${Math.pow(l / (LEVELS - 1), 1.05) * 0.96})`;
        chars.forEach((c, i) => a.fillText(c, i * cwD + cwD / 2, l * chD + chD / 2 + DPR * 0.5));
      }

      const gr = rng(99);
      grain = new Float32Array(cols * rows);
      for (let i = 0; i < grain.length; i++) grain[i] = 0.74 + gr() * 0.26;

      paint = document.createElement('canvas');
      paint.width = Math.ceil(W * S);
      paint.height = Math.ceil(H * S);
      pctx = paint.getContext('2d', { willReadFrequently: true });
      small = document.createElement('canvas');
      small.width = cols;
      small.height = rows;
      sctx = small.getContext('2d', { willReadFrequently: true });

      if (W < 760) {
        eye.cx = W * 0.64;
        eye.cy = H * 0.66;
        eye.ew = W * 0.74;
      } else {
        eye.cx = W * 0.7;
        eye.cy = H * 0.47;
        eye.ew = Math.min(W * 0.4, H * 0.82);
      }
      dirty = true;
    }

    function paintScene() {
      const c = pctx!;
      c.setTransform(S, 0, 0, S, 0, 0);
      const base = c.createLinearGradient(0, 0, W, 0);
      // stops are clamped to 0..1 and kept in order, whatever the eye size / screen width
      let prev = 0;
      const stop = (x: number, col: string) => {
        prev = Math.max(prev, Math.min(1, Math.max(0, x)));
        base.addColorStop(prev, col);
      };
      stop(0, '#040404');
      stop((eye.cx - eye.ew * 1.9) / W, '#060606');
      stop(Math.min(0.95, (eye.cx - eye.ew * 0.95) / W), '#262626');
      stop(Math.min(0.97, (eye.cx - eye.ew * 0.3) / W), '#3d3d3d');
      stop(1, '#505050');
      c.fillStyle = base;
      c.fillRect(0, 0, W, H);
      soft(c, eye.cx, eye.cy, eye.ew * 1.6, eye.ew * 1.1, 0.6, 0.22);
      soft(c, eye.cx - eye.ew * 0.85, eye.cy + eye.ew * 0.05, eye.ew * 0.22, eye.ew * 0.7, 0.03, 0.8);
      const e2 = eye.ew * 0.78;
      const cx2 = eye.cx - eye.ew * 1.62;
      const cy2 = eye.cy + eye.ew * 0.06;
      drawEye(c, cx2, cy2, e2, Math.min(1, open + (open < 1 ? 0.05 : 0)), gaze.x * 0.7, gaze.y * 0.7, 0.42);
      drawEye(c, eye.cx, eye.cy, eye.ew, open, gaze.x, gaze.y, 1);
    }

    function render(now: number) {
      if (!paint || !sctx || !atlas) return;
      paintScene();
      sctx.drawImage(paint, 0, 0, cols, rows);
      const px = sctx.getImageData(0, 0, cols, rows).data;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const LR = Math.max(70, W * 0.055);
      const LR2 = LR * LR;
      const shimmer = reduced ? 0 : 0.045;
      const ph = now / 900;
      for (let r = 0; r < rows; r++) {
        const y = r * chD;
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const ci = rowIdx[i];
          if (ci < 0) continue;
          const o = i * 4;
          let L = (px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114) / 255;
          L = Math.min(1, Math.pow(L, 1.5) * 1.6) * grain[i] * (1 + shimmer * Math.sin(ph + i * 0.37));
          if (lens > 0.01) {
            // cell centre and pointer are both in CSS pixels, so the glow sits right under the pointer
            const ddx = (c + 0.5) * cw - lensX;
            const ddy = (r + 0.5) * ch - lensY;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 < LR2) {
              const f = 1 - d2 / LR2;
              L += lens * f * f * (0.34 + 0.12 * Math.sin(ph * 2.2 - Math.sqrt(d2) * 0.045));
            }
          }
          const lv = L < 0.05 ? 0 : Math.min(LEVELS - 1, Math.round(L * (LEVELS - 1)));
          if (lv > 0) ctx!.drawImage(atlas, ci * cwD, lv * chD, cwD, chD, c * cwD, y, cwD, chD);
        }
      }
    }

    function blinkValue(t: number): number | null {
      const d = t - blinkStart;
      const total = BL.close + BL.hold + BL.open;
      if (d < 0 || d > total) return null;
      if (d < BL.close) return REST * (1 - smooth(d / BL.close));
      if (d < BL.close + BL.hold) return 0;
      return REST * smooth((d - BL.close - BL.hold) / BL.open);
    }

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      if (hidden) return;
      let active = false;
      if (!reduced) {
        if (blinkStart < 0 && now > nextBlink) blinkStart = now;
        if (blinkStart >= 0) {
          const v = blinkValue(now);
          if (v === null) {
            blinkStart = -1;
            open = REST;
            nextBlink = now + 4500 + Math.random() * 3500;
            dirty = true;
          } else {
            open = v;
            active = true;
          }
        }
        const idle = mouse.x === null || now - mouse.t > 4000;
        if (idle && now > nextSaccade) {
          gazeT.x = (Math.random() - 0.5) * 0.05 * eye.ew;
          gazeT.y = (Math.random() - 0.5) * 0.015 * eye.ew;
          nextSaccade = now + 3500 + Math.random() * 4500;
        }
        const dx = gaze.x - gazeT.x;
        const dy = gaze.y - gazeT.y;
        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
          gaze.x -= dx * 0.045;
          gaze.y -= dy * 0.045;
          active = true;
        }
        const lt = mouse.x === null || now - mouse.t > 2500 ? 0 : 1;
        if (Math.abs(lens - lt) > 0.01) {
          lens += (lt - lens) * (lt ? 0.25 : 0.08);
          active = true;
        } else lens = lt;
        if (mouse.x !== null && lens > 0.01) {
          lensX += (mouse.x - lensX) * 0.6;
          lensY += (mouse.y - lensY) * 0.6;
          if (Math.hypot(mouse.x - lensX, mouse.y - lensY) > 0.5) active = true;
        }
      }
      if (active || dirty || now - last > 250) {
        last = now;
        dirty = false;
        render(now);
      }
    }

    const onMove = (ev: PointerEvent) => {
      if (mouse.x === null || lens < 0.02) {
        lensX = ev.clientX;
        lensY = ev.clientY;
      }
      mouse.x = ev.clientX;
      mouse.y = ev.clientY;
      mouse.t = performance.now();
      const dx = ev.clientX - eye.cx;
      const dy = ev.clientY - eye.cy;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / (W * 0.6));
      gazeT.x = (dx / d) * 0.07 * eye.ew * k;
      gazeT.y = (dy / d) * 0.03 * eye.ew * k;
      if (reduced) { lens = 1; lensX = ev.clientX; lensY = ev.clientY; dirty = true; }
    };
    const onLeave = () => { mouse.x = null; };
    const onVis = () => { hidden = document.hidden; if (!hidden) dirty = true; };
    let rz = 0;
    const onResize = () => { window.clearTimeout(rz); rz = window.setTimeout(layout, 120); };

    layout();
    raf = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(rz);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`fixed inset-0 z-0 h-full w-full pointer-events-none ${className}`}
      />
      {/* keeps the headline readable over the face */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none hidden md:block"
        style={{ background: 'linear-gradient(180deg, rgba(7,7,7,.82) 0, rgba(7,7,7,0) 110px), linear-gradient(0deg, rgba(7,7,7,.78) 0, rgba(7,7,7,0) 90px), linear-gradient(90deg, rgba(7,7,7,.94) 0%, rgba(7,7,7,.80) 30%, rgba(7,7,7,.25) 55%, rgba(7,7,7,0) 70%)' }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none md:hidden"
        style={{ background: 'linear-gradient(180deg, rgba(7,7,7,.88) 0%, rgba(7,7,7,.55) 55%, rgba(7,7,7,.1) 100%)' }}
      />
    </>
  );
}
