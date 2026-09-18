import { useEffect, useRef } from 'react';

const WORDS = [
  'better', 'architecture', 'media', 'labour', 'mirror', 'critical', 'praxis', 'city',
  'space', 'diversify', 'caste', 'class', 'capital', 'image', 'platform', 'dialogue',
  'land', 'housing', 'commons', 'publish', 'question', 'evidence', 'margin', 'access',
  'craft', 'field', 'power', 'built', 'unbuilt', 'listen',
];

interface Cell {
  word: string;
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  driftPhase: number;
  driftSpeed: number;
}

export default function WordField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let cells: Cell[] = [];
    let raf = 0;

    function layout() {
      const el = canvas as HTMLCanvasElement;
      W = el.clientWidth;
      H = el.clientHeight;
      el.width = W * DPR;
      el.height = H * DPR;
      const c = ctx as CanvasRenderingContext2D;
      c.setTransform(DPR, 0, 0, DPR, 0, 0);

      const cols = Math.max(4, Math.round(W / 170));
      const rows = Math.max(4, Math.round(H / 90));
      cells = [];
      for (let r = 0; r < rows; r++) {
        for (let cIdx = 0; cIdx < cols; cIdx++) {
          const word = WORDS[Math.floor(Math.random() * WORDS.length)];
          cells.push({
            word,
            x: (cIdx + 0.5) * (W / cols) + (Math.random() - 0.5) * 40,
            y: (r + 0.5) * (H / rows) + (Math.random() - 0.5) * 30,
            size: 10 + Math.random() * 5,
            baseAlpha: 0.05 + Math.random() * 0.09,
            driftPhase: Math.random() * Math.PI * 2,
            driftSpeed: 0.15 + Math.random() * 0.25,
          });
        }
      }
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onLeave() { mouseRef.current = { x: -9999, y: -9999 }; }

    layout();
    window.addEventListener('resize', layout);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    let t0 = performance.now();

    function frame(now: number) {
      const c = ctx as CanvasRenderingContext2D;
      const dt = (now - t0) / 1000;
      t0 = now;
      c.clearRect(0, 0, W, H);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const mouse = mouseRef.current;
      const R = 160;

      for (const cell of cells) {
        if (!reduced) cell.driftPhase += dt * cell.driftSpeed;
        const dx = cell.x - mouse.x;
        const dy = cell.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const near = Math.max(0, 1 - dist / R);
        const alpha = Math.min(0.9, cell.baseAlpha + near * 0.75);
        const wobble = reduced ? 0 : Math.sin(cell.driftPhase) * 3;
        c.font = `${near > 0.5 ? 600 : 400} ${cell.size + near * 3}px "Roboto Mono", monospace`;
        c.fillStyle = `rgba(228,231,234,${alpha})`;
        c.fillText(cell.word, cell.x, cell.y + wobble);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', layout);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
