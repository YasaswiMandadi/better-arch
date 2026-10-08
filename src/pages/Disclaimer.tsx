import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';

export default function Disclaimer() {
  const items = [
    { num: '01', label: 'Editorial independence', href: '#s01' },
    { num: '02', label: 'Views expressed', href: '#s02' },
    { num: '03', label: 'External links', href: '#s03' },
  ];

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">Disclaimer</p>
      <h1 className="font-head font-extrabold text-[clamp(2.2rem,6.5vw,3.8rem)] leading-[1.02] tracking-tight mb-4">
        Disclaimer
      </h1>
      <p className="font-head font-semibold text-[1.1rem] leading-[1.5] text-muted max-w-[56ch]">
        A short statement of what this site is, and is not.
      </p>

      <Section ac="ac1" num="01" title="Editorial independence">
        <p className="text-[.99rem] leading-[1.62]">
          The Better Architecture Project carries no sponsorship and sells no advertising. The readings, registers
          and analysis published here reflect the editorial judgement of the project and its contributors alone.
        </p>
      </Section>

      <Section ac="ac2" num="02" title="Views expressed">
        <p className="text-[.99rem] leading-[1.62]">
          Views expressed by guests in conversation are their own and do not necessarily represent the views of The
          Better Architecture Project. Analysis sections (readings, sentiment registers, criticality placements)
          are the project's own interpretive work, clearly distinguished from the guest's verbatim words.
        </p>
      </Section>

      <Section ac="ac3" num="03" title="External links">
        <p className="text-[.99rem] leading-[1.62]">
          This site links out to external articles, platforms and resources for context. We are not responsible
          for the content of external sites, and a link does not imply endorsement.
        </p>
      </Section>

      <SiteFooter />
    </InnerLayout>
  );
}
