import { useMemo, useState } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import { buildCollaboratorRoster } from '../../data/collaborators';
import { slugify } from '../../lib/slug';
import { Btn, Panel, PlainInput, VHead } from '../components/ui';

/**
 * Every collaborator: ones added here, plus anyone named as an episode guest or essay author.
 * Click one to edit their details and what they're attached to; add a new one by name.
 */
export default function CollaboratorRepository() {
  const { go, toast } = useConsole();
  const { data, update } = useSiteData();
  const roster = useMemo(() => buildCollaboratorRoster(data, { includeDrafts: true }), [data]);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  const investigatorOf = (slug: string) => data.themes.filter((t) => t.investigatorSlugs.includes(slug)).length;
  const list = roster.filter((c) => {
    const s = q.trim().toLowerCase();
    return !s || c.name.toLowerCase().includes(s) || (c.designation ?? '').toLowerCase().includes(s);
  });

  function add() {
    const n = name.trim().replace(/\s+/g, ' ');
    if (!n) { setErr('Type a name first.'); return; }
    const slug = slugify(n);
    if (!slug) { setErr('Use letters or numbers in the name.'); return; }
    const clash = roster.find((c) => c.slug === slug);
    if (clash) { setErr(`"${clash.name}" is already a collaborator. Open them below instead.`); return; }
    update((d) => { d.collaborators.push({ slug, name: n, bio: '' }); });
    setName(''); setErr('');
    toast(`Added ${n}.`);
    go('collaboratorEditor', slug);
  }

  return (
    <div>
      <VHead
        title="Collaborator Repository"
        sub="Guests, authors and investigators. Click a person to edit their card (name, role, bio) and attach them to episodes, essays and themes."
      />

      <Panel>
        <div className="flex flex-wrap gap-2 items-start">
          <div className="flex-1 min-w-[220px]">
            <PlainInput
              value={name}
              onChange={(e) => { setName(e.target.value); setErr(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder="New collaborator's full name"
              aria-label="New collaborator's name"
            />
            {err && <p role="alert" className="text-danger text-[13px] font-semibold mt-1.5">{err}</p>}
          </div>
          <Btn variant="primary" onClick={add}>+ Add collaborator</Btn>
        </div>
      </Panel>

      <div className="flex items-center gap-3 mb-4">
        <PlainInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${roster.length} collaborators`} className="max-w-[360px]" aria-label="Search collaborators" />
      </div>

      {list.length === 0 && <Panel><p className="text-muted text-[14.5px]">{roster.length ? 'Nobody matches that search.' : 'No collaborators yet.'}</p></Panel>}

      <div className="grid sm:grid-cols-2 gap-x-4">
        {list.map((c) => {
          const inv = investigatorOf(c.slug);
          const hasRecord = data.collaborators.some((x) => x.slug === c.slug);
          return (
            <Panel key={c.slug} className="c-card-hover cursor-pointer">
              <button onClick={() => go('collaboratorEditor', c.slug)} className="text-left w-full">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="w-9 h-9 rounded-full bg-rust/[0.12] text-rust font-display italic font-semibold text-[16px] grid place-items-center shrink-0">
                    {c.name.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate font-display italic font-medium text-[17px]">{c.name}</b>
                    <span className="block truncate text-[12.5px] text-muted font-sans">{c.designation || (hasRecord ? 'No role yet' : 'Named on content only')}</span>
                  </span>
                </div>
                <p className="text-[12px] text-faint font-mono">
                  {c.episodeIds.length} episode{c.episodeIds.length === 1 ? '' : 's'} · {c.essayIds.length} essay{c.essayIds.length === 1 ? '' : 's'} · {inv} theme{inv === 1 ? '' : 's'}
                  {!c.bio && ' · no bio yet'}
                </p>
              </button>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
