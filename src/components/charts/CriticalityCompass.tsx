export default function CriticalityCompass({ c }: { c: { x: number; y: number } }) {
  const S = 520, pad = 56, plot = S - 2 * pad;
  const X = (v: number) => pad + (plot * v) / 100;
  const Y = (v: number) => S - pad - (plot * v) / 100;
  const quads: [string, number, number][] = [
    ['independent · critical', X(25), Y(75)],
    ['resourced · critical', X(75), Y(75)],
    ['independent · affirmative', X(25), Y(25)],
    ['resourced · affirmative', X(75), Y(25)],
  ];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[520px] mx-auto block" role="img" aria-label="Criticality compass">
      <rect x={pad} y={pad} width={plot} height={plot} fill="none" stroke="var(--hair)" />
      <line x1={X(50)} y1={pad} x2={X(50)} y2={S - pad} stroke="var(--hair)" strokeDasharray="4 4" />
      <line x1={pad} y1={Y(50)} x2={S - pad} y2={Y(50)} stroke="var(--hair)" strokeDasharray="4 4" />
      {quads.map((q) => (
        <text key={q[0]} x={q[1]} y={q[2]} textAnchor="middle" style={{ font: '600 10px Montserrat,sans-serif', fill: 'var(--faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {q[0]}
        </text>
      ))}
      <text x={S / 2} y={S - 14} textAnchor="middle" style={{ font: '600 9.5px Montserrat,sans-serif', fill: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
        Resource allocation →
      </text>
      <text x={16} y={S / 2} textAnchor="middle" transform={`rotate(-90 16 ${S / 2})`} style={{ font: '600 9.5px Montserrat,sans-serif', fill: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
        Critical autonomy →
      </text>
      <circle cx={X(c.x)} cy={Y(c.y)} r={9} fill="var(--red)" />
      <circle cx={X(c.x)} cy={Y(c.y)} r={16} fill="none" stroke="var(--red)" strokeOpacity={0.4} />
      <text x={X(c.x) + 22} y={Y(c.y) + 4} style={{ font: '700 11px Montserrat,sans-serif', fill: 'var(--deep)' }}>
        ({c.x.toFixed(1)}, {c.y.toFixed(1)})
      </text>
    </svg>
  );
}
