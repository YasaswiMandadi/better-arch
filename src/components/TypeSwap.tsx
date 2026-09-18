import { useEffect, useState } from 'react';

export default function TypeSwap({ lines, interval = 4200 }: { lines: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState(lines[0]);
  const [phase, setPhase] = useState<'idle' | 'erasing' | 'typing'>('idle');

  useEffect(() => {
    const hold = window.setTimeout(() => setPhase('erasing'), interval);
    return () => window.clearTimeout(hold);
  }, [text, interval]);

  useEffect(() => {
    if (phase === 'erasing') {
      if (text.length === 0) {
        const next = (i + 1) % lines.length;
        setI(next);
        setPhase('typing');
        return;
      }
      const t = window.setTimeout(() => setText((s) => s.slice(0, -1)), 18);
      return () => window.clearTimeout(t);
    }
    if (phase === 'typing') {
      const target = lines[i];
      if (text.length < target.length) {
        const t = window.setTimeout(() => setText(target.slice(0, text.length + 1)), 28);
        return () => window.clearTimeout(t);
      }
      setPhase('idle');
    }
  }, [phase, text, i, lines]);

  return (
    <span className="font-mono tracking-[.06em]">
      {text}
      <span
        className="inline-block w-[0.55em] h-[1.05em] bg-[var(--accent-eye)] ml-1 align-[-2px]"
        style={{ animation: 'caret-blink 1s steps(1) infinite' }}
      />
    </span>
  );
}
