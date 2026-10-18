import { useRef, useState } from 'react';
import InnerLayout from '../components/InnerLayout';
import Section from '../components/Section';
import SiteFooter from '../components/SiteFooter';
import { Mail } from 'lucide-react';

type FormType = 'general' | 'episode' | 'propose' | 'contribute';

/** Where contact mail goes for now (testing). Change this and CONTACT_TO in Vercel together. */
const CONTACT_EMAIL = 'ptgsaay@gmail.com';

export default function Contact() {
  const [type, setType] = useState<FormType>(() => {
    const h = window.location.hash.replace('#', '');
    if (h === 'propose-a-project') return 'propose';
    if (h === 'contribute') return 'contribute';
    return 'general';
  });
  const [form, setForm] = useState({ name: '', email: '', org: '', subject: '', guest: '', topic: '', msg: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  // Spam trap: a hidden field people never see. Deliberately has a meaningless name and no
  // label, so phone autofill leaves it alone. The server never drops a message because of it.
  const [trap, setTrap] = useState('');
  const openedAt = useRef(Date.now());

  const items = [
    { num: '01', label: 'The form', href: '#s01' },
    { num: '02', label: 'Propose a Project', href: '#propose-a-project' },
    { num: '03', label: 'Contribute', href: '#contribute' },
    { num: '04', label: 'Points to note', href: '#s02' },
  ];

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /** Emails the message (POST /api/contact → Resend → CONTACT_EMAIL). */
  async function send() {
    if (sending) return;
    setError('');
    setSent(false);
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setError('Name, email and message are needed.');
      return;
    }
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(form.email.trim())) {
      setError('Please check the email address.');
      return;
    }
    setSending(true);
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...form, ba_check: trap, elapsed: Date.now() - openedAt.current }),
      });
      const j = (r.headers.get('content-type') || '').includes('json') ? await r.json().catch(() => null) : null;
      if (r.ok && j?.ok) {
        setSent(true);
        setForm({ name: '', email: '', org: '', subject: '', guest: '', topic: '', msg: '' });
      } else {
        setError(j?.error || 'The message could not be sent right now.');
      }
    } catch {
      setError('The message could not be sent right now.');
    } finally {
      setSending(false);
    }
  }

  function mailtoHref() {
    const subjectPrefix =
      type === 'episode' ? 'Episode request' : type === 'propose' ? 'Project proposal' : type === 'contribute' ? 'Contribution' : 'Enquiry';
    const body = `${form.msg}\n\n${form.name}${form.org ? ' · ' + form.org : ''}${form.guest ? '\nProposed guest: ' + form.guest : ''}${form.topic ? '\nTopic: ' + form.topic : ''}`;
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[${subjectPrefix}] ${form.subject || ''}`)}&body=${encodeURIComponent(body)}`;
  }

  const inputCls = "w-full bg-card border border-hair rounded-lg px-3.5 py-3 text-[.95rem] outline-none focus:border-red transition-colors";
  const labelCls = "block text-[.72rem] font-semibold uppercase tracking-wide text-muted mb-1.5";

  return (
    <InnerLayout sideItems={items}>
      <p className="font-head font-semibold text-[11px] tracking-[.2em] uppercase text-red mb-4.5">Contact · The Better Architecture Project</p>
      <h1 className="font-head font-extrabold text-[clamp(2.4rem,7.5vw,4.4rem)] leading-[1.02] tracking-tight mb-4">Write to us.</h1>
      <p className="font-head font-semibold text-[1.18rem] leading-[1.5] text-muted max-w-[56ch]">
        General enquiries, collaborations, a request to sit down for an episode, a project to propose, or a way to contribute: every route runs through the same form. Submissions reach us by email and we reply to the address you give.
      </p>

      <Section ac="ac1" num="01" title="The form">
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setType('general')} className={`text-sm font-semibold px-4 py-2.5 rounded-full transition-colors ${type === 'general' ? 'bg-ink text-paper' : 'bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-muted'}`}>General enquiry</button>
          <button onClick={() => setType('episode')} className={`text-sm font-semibold px-4 py-2.5 rounded-full transition-colors ${type === 'episode' ? 'bg-ink text-paper' : 'bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-muted'}`}>Request an episode</button>
          <button id="propose-a-project" onClick={() => setType('propose')} className={`text-sm font-semibold px-4 py-2.5 rounded-full transition-colors ${type === 'propose' ? 'bg-ink text-paper' : 'bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-muted'}`}>Propose a project</button>
          <button id="contribute" onClick={() => setType('contribute')} className={`text-sm font-semibold px-4 py-2.5 rounded-full transition-colors ${type === 'contribute' ? 'bg-ink text-paper' : 'bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-muted'}`}>How can I contribute?</button>
        </div>

        <div className="space-y-4 max-w-[560px]">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className={labelCls}>Organisation / practice <span className="normal-case tracking-normal text-faint">(optional)</span></label>
            <input className={inputCls} value={form.org} onChange={(e) => set('org', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Subject</label>
            <input className={inputCls} value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </div>
          {type === 'episode' && (
            <>
              <div>
                <label className={labelCls}>Proposed guest &amp; why</label>
                <input className={inputCls} value={form.guest} onChange={(e) => set('guest', e.target.value)} />
                <span className="block text-xs text-faint mt-1.5">Who should sit down for a conversation, and what can they say that the season has not yet heard?</span>
              </div>
              <div>
                <label className={labelCls}>Proposed provocation / topic</label>
                <input className={inputCls} value={form.topic} onChange={(e) => set('topic', e.target.value)} />
                <span className="block text-xs text-faint mt-1.5">One line. The sharper the better.</span>
              </div>
            </>
          )}
          {type === 'propose' && (
            <div>
              <label className={labelCls}>Proposed theme / project</label>
              <input className={inputCls} value={form.topic} onChange={(e) => set('topic', e.target.value)} />
              <span className="block text-xs text-faint mt-1.5">What theme or project haven't we covered yet, and why does it belong here?</span>
            </div>
          )}
          {type === 'contribute' && (
            <div>
              <label className={labelCls}>How you'd like to contribute</label>
              <input className={inputCls} value={form.topic} onChange={(e) => set('topic', e.target.value)} />
              <span className="block text-xs text-faint mt-1.5">Writing, research, translation, production — tell us what you bring.</span>
            </div>
          )}
          {/* spam trap: hidden from people and screen readers; no label so autofill ignores it */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
            <input
              type="text"
              name="ba_check"
              tabIndex={-1}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              value={trap}
              onChange={(e) => setTrap(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Message</label>
            <textarea className={`${inputCls} min-h-[120px] resize-y`} value={form.msg} onChange={(e) => set('msg', e.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button onClick={send} disabled={sending} className="font-head font-bold text-[.82rem] bg-ink text-paper rounded-lg px-5 py-3 hover:bg-deep hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait">
              {sending ? 'Sending…' : 'Send'}
            </button>
            <a href={mailtoHref()} className="font-head font-bold text-[.82rem] border border-hair rounded-lg px-5 py-3 inline-flex items-center gap-2 hover:border-muted transition-colors">
              <Mail size={14} /> Or open in your mail app
            </a>
          </div>

          {sent && (
            <div role="status" className="bg-[var(--okbg,transparent)] border border-hair text-ink rounded-lg px-4 py-3.5 text-sm mt-2">
              Sent. Thank you, we will write back to the email you gave.
            </div>
          )}
          {error && (
            <div role="alert" className="bg-[var(--warnbg,transparent)] border border-hair text-ink rounded-lg px-4 py-3.5 text-sm mt-2">
              {error}{' '}
              {error !== 'Name, email and message are needed.' && error !== 'Please check the email address.' && (
                <>You can also <a href={mailtoHref()} className="underline font-semibold">send it from your mail app</a>; your text is still in the form.</>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section ac="ac3" num="02" title="Points to note">
        <ul className="space-y-3 list-disc pl-5">
          <li className="text-[.97rem] leading-[1.65]">The project carries no sponsorship and sells no advertising; pitches for paid coverage will not receive a reply.</li>
          <li className="text-[.97rem] leading-[1.65]">Episode requests are read against the season's framework: structural and systemic questions travel further than personal stories.</li>
          <li className="text-[.97rem] leading-[1.65]">Conversations are recorded remotely and in English or Bangla; other languages are welcome where a shared reading can be built.</li>
          <li className="text-[.97rem] leading-[1.65]">Everything published on this site, transcripts, readings, registers, is checked with the guest before it goes live.</li>
        </ul>
      </Section>

      <SiteFooter />
    </InnerLayout>
  );
}
