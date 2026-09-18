import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Section({
  ac, num, title, children, defaultOpen = true,
}: { ac: string; num: string; title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`${ac} border-t border-hair mt-9 pt-7 scroll-mt-20`} id={`s${num}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 text-left py-1.5 group"
      >
        <span className="font-num text-[15px] tracking-wide text-[var(--ac)] shrink-0">{num}</span>
        <span className="flex-1 font-head font-extrabold leading-[1.06] text-[clamp(1.45rem,3.8vw,2.05rem)] tracking-tight text-[var(--acd)]">
          {title}
        </span>
        <ChevronDown
          size={20}
          className="shrink-0 text-[var(--ac)] transition-transform duration-300"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>
      <div className="h-1 w-13 rounded bg-[var(--ac)] mt-2.5" style={{ width: 52 }} />
      {open && <div className="pt-5 pb-0.5">{children}</div>}
    </section>
  );
}
