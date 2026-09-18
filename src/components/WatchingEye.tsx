import { useEffect, useRef, useState } from 'react';

/**
 * The brand's whole premise is "media as a mirror" — a discipline watching
 * itself. This eye literalises that: it tracks the visitor's cursor (it is
 * looking at *you*, the reader), and blinks on an irregular, lifelike
 * rhythm. Built as layered SVG so it stays crisp and themeable at any size.
 */
export default function WatchingEye({ className = '' }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.min(1, Math.hypot(dx, dy) / 900);
      const angle = Math.atan2(dy, dx);
      const maxR = 13;
      setPupil({ x: Math.cos(angle) * maxR * dist, y: Math.sin(angle) * maxR * dist });
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    let cancelled = false;
    function scheduleBlink() {
      const delay = 2400 + Math.random() * 3200;
      const id = window.setTimeout(() => {
        if (cancelled) return;
        setBlink(true);
        window.setTimeout(() => !cancelled && setBlink(false), 160);
        scheduleBlink();
      }, delay);
      return id;
    }
    const id = scheduleBlink();
    return () => { cancelled = true; window.clearTimeout(id); };
  }, []);

  return (
    <div ref={wrapRef} className={`relative select-none ${className}`} aria-hidden="true">
      <svg viewBox="0 0 320 200" className="w-full h-auto overflow-visible">
        <defs>
          <radialGradient id="irisGrad" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#EEA078" />
            <stop offset="55%" stopColor="var(--accent-eye)" />
            <stop offset="100%" stopColor="#7C1D12" />
          </radialGradient>
          <clipPath id="eyeClip">
            <path d="M10,100 C60,20 260,20 310,100 C260,180 60,180 10,100 Z" />
          </clipPath>
        </defs>

        {/* outer almond, animated open/close for the blink */}
        <path
          d="M10,100 C60,20 260,20 310,100 C260,180 60,180 10,100 Z"
          fill="none"
          stroke="var(--field-ink, var(--ink))"
          strokeWidth="3"
          style={{
            transformOrigin: '160px 100px',
            transition: 'transform 120ms ease-in-out',
            transform: blink ? 'scaleY(0.05)' : 'scaleY(1)',
          }}
          opacity={0.85}
        />

        <g clipPath="url(#eyeClip)" style={{
          transformOrigin: '160px 100px',
          transition: 'transform 120ms ease-in-out',
          transform: blink ? 'scaleY(0.05)' : 'scaleY(1)',
        }}>
          <rect x="0" y="0" width="320" height="200" fill="var(--paper)" opacity="0.04" />
          {/* iris + pupil follow the cursor */}
          <g style={{ transition: 'transform 70ms linear', transform: `translate(${pupil.x}px, ${pupil.y}px)` }}>
            <circle cx="160" cy="100" r="46" fill="url(#irisGrad)" />
            <circle cx="160" cy="100" r="46" fill="none" stroke="#5e2a55" strokeOpacity="0.25" strokeWidth="1" />
            <circle cx="160" cy="100" r="19" fill="#0b0b0c" />
            <circle cx="149" cy="88" r="7" fill="#fff" opacity="0.85" />
            <circle cx="171" cy="112" r="3" fill="#fff" opacity="0.35" />
          </g>
        </g>

        {/* lashes accent, subtle */}
        <path d="M10,100 C60,20 260,20 310,100" fill="none" stroke="var(--red)" strokeWidth="1.5" opacity="0.35" />
      </svg>
    </div>
  );
}
