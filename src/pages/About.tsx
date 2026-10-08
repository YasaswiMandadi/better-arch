import { Link } from 'react-router-dom';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { useSiteData } from '../data/store';

export default function About() {
  const { data } = useSiteData();
  const seasons = data.themes;
  const items = [
    { num: '01', label: 'What we do', href: '#s01' },
    { num: '02', label: 'The projects', href: '#s02' },
    { num: '03', label: 'The instrument', href: '#s03' },
    { num: '04', label: 'Recognition', href: '#s04' },
    { num: '05', label: 'The anchor', href: '#s05' },
    { num: '06', label: 'Colophon', href: '#s06' },
  ];

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">About · The Better Architecture Project</p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">What this project is, and why.</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">{data.site.line}</p>

      <Section ac="ac1" num="01" title="What we do">
        <div className="read space-y-4">
          <p>The work happens through long-form conversation. Architects, critics, journalists, photographers, filmmakers, educators and researchers sit down for an hour and are asked the questions the field usually avoids. Every conversation is then treated as evidence: transcribed, corrected, coded and analysed on a shared instrument, so that the season adds up to more than a playlist. The output is a public archive of readings, registers and references that anyone can inspect.</p>
          <p>The project is virtual by design, anchored in New Delhi and Kolkata and recorded across the country. It carries no sponsorship and sells no advertising; the independence of the readings depends on it.</p>
        </div>
      </Section>

      <Section ac="ac2" num="02" title="The projects">
        <div className="space-y-3.5">
          {seasons.map((s, i) => (
            <div key={s.slug} className="grid grid-cols-[54px_1fr] gap-1.5 bg-card border border-hair rounded-[10px] py-4.5 pr-5.5 pl-4.5 shadow-[var(--shs)]">
              <div className="font-num text-[1.35rem] text-acd pt-0.5">{String(i + 1).padStart(2, '0')}</div>
              <div>
                <h3 className="font-head font-bold text-[1.14rem] leading-[1.35] tracking-tight mb-2">
                  <Link to={`/theme/${s.slug}`} className="text-inherit hover:underline">{s.title}</Link>
                </h3>
                <p className="text-sm text-muted font-medium mb-1.5">{s.period} · {s.statusLabel}</p>
                <p className="text-[.99rem] leading-[1.62]">{s.one}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section ac="ac3" num="03" title="The instrument">
        <div className="space-y-4">
          <p>
            Behind every analysis page sits the <em className="cpt">'AXM Unified Framework v5'</em>: thirteen clusters, thirty-four thematic lines, one hundred and two parameters, and an eighteen-point sentiment register, built normatively, to articulate what architectural media should and must think of, not merely to describe what it does. Sentiments are scored only where they are confirmed present in the corrected transcript; nothing is defaulted.
          </p>
          <p>
            The framework reads against a <em className="cpt">'Knowledge Network'</em> of fifty-three sources, from McLuhan and Berger to Ambedkar and Spivak, so that each episode's references reach past the conversation into the literatures it touches. Every scored register, every compass placement, and every reference on an episode page can be traced back to this instrument.
          </p>
        </div>
      </Section>

      <Section ac="ac7" num="04" title="Recognition">
        <p>The project received an honourable mention at the <b className="text-acd">Marina Waisman Digital Communication Awards</b>, part of the CICA Dennis Sharp Publication Awards 2026, from the International Committee of Architectural Critics.</p>
      </Section>

      <Section ac="ac9" num="05" title="The anchor">
        <p>
          The project is anchored by <b className="text-acd">Shubhayan Modak</b>: host of the conversations, developer of the framework, and the editorial voice behind the readings. He is an architectural researcher working across media studies and the built environment, and the co-founder of{' '}
          <a href="https://sthapatya.co" target="_blank" rel="noopener" className="underline">Sthapatya.co</a>, a Bangla-language architecture media platform.
        </p>
      </Section>

      <Section ac="ac8" num="06" title="Colophon">
        <p className="text-muted max-w-[64ch]">
          This revamped site is built as a single-page React application (TypeScript + Tailwind), with a light/dark theme system and a hand-tuned hero. The analysis pages are emitted by the BetterArch Console, the project's in-house editorial backend. Type is set in Montserrat, Roboto, Bebas Neue and Roboto Mono. Write to us through the{' '}
          <Link to="/contact" className="underline">contact page</Link>.
        </p>
      </Section>

      <SiteFooter />
    </InnerLayout>
  );
}
