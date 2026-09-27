import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keywordHref } from '../../data/keywords';

interface KW { word: string; typ: string; freq: number; gloss: string }

export default function BubbleChart({ kws, hue }: { kws: KW[]; hue: Record<string, string> }) {
  const [hover, setHover] = useState<KW | null>(null);
  const navigate = useNavigate();

  const placed = useMemo(() => {
    const Wv = 760, Hv = 460;
    const maxF = Math.max(...kws.map((k) => k.freq));
    const sorted = [...kws].sort((a, b) => b.freq - a.freq);
    const out: { x: number; y: number; r: number; k: KW }[] = [];
    sorted.forEach((k) => {
      const r = 16 + Math.sqrt(k.freq / maxF) * 46;
      let ok = false, x = 0, y = 0, tries = 0;
      while (!ok && tries < 900) {
        tries++;
        x = r + 8 + Math.random() * (Wv - 2 * r - 16);
        y = r + 8 + Math.random() * (Hv - 2 * r - 16);
        ok = true;
        for (const p of out) {
          const dx = x - p.x, dy = y - p.y;
          if (dx * dx + dy * dy < (r + p.r + 5) * (r + p.r + 5)) { ok = false; break; }
        }
      }
      out.push({ x, y, r, k });
    });
    return out;
  }, [kws]);

  return (
    <div className="relative">
      <svg viewBox="0 0 760 460" className="w-full h-auto" role="img" aria-label="Keyword bubble map">
        {placed.map((p) => {
          const c = hue[p.k.typ] || '#888';
          return (
            <g
              key={p.k.word}
              onMouseEnter={() => setHover(p.k)}
              onMouseLeave={() => setHover(null)}
              onClick={() => navigate(keywordHref(p.k.word))}
              className="cursor-pointer"
            >
              <circle cx={p.x} cy={p.y} r={p.r} fill={c} fillOpacity={hover?.word === p.k.word ? 0.32 : 0.16} stroke={c} strokeWidth={1.6} style={{ transition: 'fill-opacity .15s' }} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" style={{ font: `600 ${Math.max(10, Math.min(17, p.r * 0.42))}px Montserrat,sans-serif`, fill: c }}>
                {p.k.word}
              </text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-1 bg-ink text-paper text-xs rounded-lg px-3 py-2 max-w-xs shadow-lg pointer-events-none">
          <b className="block text-[.65rem] uppercase tracking-wide text-[#F0B8AE] mb-1">{hover.word} · {hover.freq}×</b>
          {hover.gloss}
          <span className="block text-[.6rem] text-[#9B958B] mt-1.5">Click to see everywhere this word appears</span>
        </div>
      )}
    </div>
  );
}
