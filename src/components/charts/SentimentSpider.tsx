import { useState } from 'react';

interface Sent { code: string; label: string; full: string; score: number; reading: string }

export default function SentimentSpider({ sents }: { sents: Sent[] }) {
  const [hover, setHover] = useState<Sent | null>(null);
  const S = 560, cx = S / 2, cy = S / 2, R = 190, n = sents.length;
  const pt = (i: number, v: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
  };
  const ringPath = (g: number) => sents.map((_, i) => pt(i, g)).map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('') + 'Z';
  const dataPath = sents.map((s, i) => pt(i, s.score / 100)).map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('') + 'Z';

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[560px] mx-auto block" role="img" aria-label="Sentiment register spider chart">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <path key={g} d={ringPath(g)} fill="none" stroke="var(--hair)" strokeWidth={1} />
        ))}
        {sents.map((_, i) => {
          const p = pt(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--hair)" strokeWidth={1} />;
        })}
        <path d={dataPath} fill="var(--red)" fillOpacity={0.14} stroke="var(--red)" strokeWidth={2} />
        {sents.map((s, i) => {
          const p = pt(i, s.score / 100);
          return (
            <circle
              key={s.code}
              cx={p[0]} cy={p[1]} r={5} fill="var(--red)" className="cursor-default"
              onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}
            />
          );
        })}
        {sents.map((s, i) => {
          const lp = pt(i, 1.12);
          return (
            <text key={s.code} x={lp[0]} y={lp[1]} textAnchor="middle" style={{ font: '600 9.5px Montserrat,sans-serif', fill: 'var(--muted)' }}>
              {s.label}
            </text>
          );
        })}
      </svg>
      {hover && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 bg-ink text-paper text-xs rounded-lg px-3 py-2 max-w-sm shadow-lg pointer-events-none">
          <b className="block text-[.65rem] uppercase tracking-wide text-[#F0B8AE] mb-1">{hover.full} · {hover.score}</b>
          {hover.reading}
        </div>
      )}
    </div>
  );
}
