import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useConsole } from '../store/useConsole';
import { useSiteData } from '../../data/store';
import {
  EYE_FONTS, EYE_MAX_CLIP_SECONDS, EYE_MAX_STORED_MB, EYE_MAX_UPLOAD_MB, HOME_EYE_DEFAULTS,
  eyeVideoSources, resolveHomeEye, type EyeFont, type HomeEyeSettings,
} from '../../data/homeEye';
import { useHomeEye, buildEyeWords } from '../../data/useHomeEye';
import { REMOTE_ENABLED, deleteEyeVideo, getToken, uploadEyeVideo } from '../../data/remote';
import { slugify } from '../../lib/slug';
import EyeField from '../../components/eye/EyeField';
import { Btn, Field, Panel, PanelNote, PanelTitle, PlainArea, PlainInput, Select, Toggle, VHead } from '../components/ui';
import { QUALITIES, blobToBase64, canConvertHere, checkVideoFile, convertEyeVideo, probeVideo, type Quality } from '../lib/eyeVideo';

/** One labelled slider row, like the reference panel. */
function Range({ label, value, min, max, step, onChange, fmt, hint }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string; hint?: string;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr_64px] sm:grid-cols-[130px_1fr_70px] items-center gap-3 py-1.5" title={hint}>
      <span className="font-sans text-[12.5px] text-muted">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="w-full" />
      <span className="font-mono text-[12px] text-right text-ink">{fmt ? fmt(value) : value}</span>
    </div>
  );
}
function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] items-center gap-3 py-1.5" title={hint}>
      <span className="font-sans text-[12.5px] text-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-hair2 pt-3 mt-3 first:border-t-0 first:mt-0 first:pt-0">
      <span className="block font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint mb-1">{title}</span>
      {children}
    </div>
  );
}
const pct = (v: number) => `${Math.round(v * 100)}%`;
const mb = (bytes: number) => `${(bytes / 1048576).toFixed(2)} MB`;

type Pending = { url: string; blob: Blob; mime: string; duration: number; name: string };

export default function HomePageControl() {
  const { toast } = useConsole();
  const { data, update } = useSiteData();
  const saved = useMemo(() => resolveHomeEye(data.site.homeEye), [data.site.homeEye]);
  const [draft, setDraft] = useState<HomeEyeSettings>(saved);
  const [previewAs, setPreviewAs] = useState<'laptop' | 'phone'>('laptop');
  const [big, setBig] = useState(false);
  const eye = useHomeEye(draft);
  const set = <K extends keyof HomeEyeSettings>(k: K, v: HomeEyeSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // ---- video upload state ----
  // the video in the editor: the one currently on the homepage (current: true), or a newly picked file
  const [file, setFile] = useState<{ name: string; url: string; duration: number; size: number | null; current: boolean } | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const loadSeq = useRef(0);
  const [fileErr, setFileErr] = useState('');
  const [trim, setTrim] = useState<[number, number]>([0, 8]);
  const [quality, setQuality] = useState<Quality>('standard');
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrubRef = useRef<HTMLVideoElement>(null);
  const [videoStatus, setVideoStatus] = useState<{ ready: boolean; source: string; duration: number; error?: string } | null>(null);

  // revoke object URLs when replaced/unmounted
  useEffect(() => () => { if (file && file.url.startsWith('blob:')) URL.revokeObjectURL(file.url); }, [file]);
  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url); }, [pending]);

  // Esc closes the full-screen preview
  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [big]);

  const dirty = pending !== null || JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const sources = pending ? [{ src: pending.url, type: pending.mime }] : eyeVideoSources(draft, REMOTE_ENABLED);

  /** Puts the eye video that is on the homepage now (uploaded, or the built-in one) into the editor. */
  async function loadCurrent(s: HomeEyeSettings) {
    const seq = ++loadSeq.current;
    setLoadingCurrent(true);
    const probe = document.createElement('video');
    const list = eyeVideoSources(s, REMOTE_ENABLED);
    const playable = list.filter((x) => probe.canPlayType(x.type) !== '');
    const name = s.video ? s.video.name || 'Uploaded eye video' : 'Built-in eye video';
    try {
      for (const src of playable.length ? playable : list) {
        try {
          const p = await probeVideo(src.src);
          if (seq !== loadSeq.current) return; // a newer load (or a picked file) took over
          setFile({ name, url: src.src, duration: p.duration, size: s.video?.size ?? null, current: true });
          setTrim([0, Math.min(p.duration, EYE_MAX_CLIP_SECONDS)]);
          return;
        } catch { /* try the next format */ }
      }
      if (seq === loadSeq.current) setFileErr("The current eye video couldn't be loaded into the editor. You can still upload a new one.");
    } finally {
      if (seq === loadSeq.current) setLoadingCurrent(false);
    }
  }

  // open the screen with the homepage's current eye video ready to edit
  const savedVideoId = saved.video?.id ?? '';
  useEffect(() => {
    if (pending || (file && !file.current)) return; // don't replace a video the admin is working on
    void loadCurrent(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedVideoId]);

  async function pickFile(f: File | undefined) {
    setFileErr('');
    if (!f) return;
    const err = checkVideoFile(f) ?? canConvertHere();
    if (err) { setFileErr(err); return; }
    const url = URL.createObjectURL(f);
    loadSeq.current++; // a picked file wins over a current-video load still in progress
    setLoadingCurrent(false);
    try {
      const p = await probeVideo(url);
      setFile({ name: f.name, url, duration: p.duration, size: f.size, current: false });
      setTrim([0, Math.min(p.duration, 8, EYE_MAX_CLIP_SECONDS)]);
    } catch (e: any) {
      URL.revokeObjectURL(url);
      setFileErr(e?.message || "This video can't be read.");
    }
  }

  async function convert() {
    if (!file) return;
    setFileErr('');
    const ac = new AbortController();
    abortRef.current = ac;
    setProgress(0);
    try {
      const r = await convertEyeVideo(file.url, { start: trim[0], end: trim[1], quality }, setProgress, ac.signal);
      const baseName = file.current && saved.video ? saved.video.name : file.name;
      setPending({ url: URL.createObjectURL(r.blob), blob: r.blob, mime: r.mime, duration: r.duration, name: file.current ? `${baseName} (re-edited)` : file.name });
      toast('Converted: the preview now uses your video. Save to put it on the homepage.');
    } catch (e: any) {
      setFileErr(e?.message || 'The conversion failed.');
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }

  async function save() {
    setSaving(true);
    try {
      let next = draft;
      if (pending) {
        if (!REMOTE_ENABLED) { toast('Video uploads are saved on the live site (database). This local copy keeps the other settings only.'); }
        else {
          const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          const err = await uploadEyeVideo(getToken(), { id, mime: pending.mime, base64: await blobToBase64(pending.blob) });
          if (err) { setFileErr(err); toast('The video was not saved.'); return; }
          next = { ...draft, video: { id, mime: pending.mime, size: pending.blob.size, duration: pending.duration, name: pending.name, uploadedAt: new Date().toISOString() } };
        }
      }
      update((d) => { d.site.homeEye = next; });
      setDraft(next);
      setPending(null);
      void loadCurrent(next); // the editor now shows what's on the homepage
      toast('Saved: the homepage eye is updated.');
    } finally {
      setSaving(false);
    }
  }

  async function useBuiltIn() {
    if (!window.confirm('Go back to the built-in eye video? The uploaded video will be removed.')) return;
    if (REMOTE_ENABLED) {
      const err = await deleteEyeVideo(getToken());
      if (err) { toast(err); return; }
    }
    const next = { ...draft, video: null };
    update((d) => { d.site.homeEye = { ...(d.site.homeEye ?? {}), video: null }; });
    setDraft(next);
    setPending(null);
    void loadCurrent(next);
    toast('Using the built-in eye video again.');
  }

  function resetLook() {
    if (!window.confirm('Reset every look and motion setting to the approved defaults? The video and keyword choices stay.')) return;
    setDraft((d) => ({ ...HOME_EYE_DEFAULTS, video: d.video, excludeWords: d.excludeWords, extraWords: d.extraWords, highlightWords: d.highlightWords, highlightColor: d.highlightColor, highlightShare: d.highlightShare, highlightBoost: d.highlightBoost }));
  }

  // ---- keyword sets ----
  const [kwQuery, setKwQuery] = useState('');
  const [hiInput, setHiInput] = useState('');
  const excluded = new Set(draft.excludeWords.map(slugify));
  const hiSet = new Set(draft.highlightWords.map(slugify));
  const liveShown = eye.live.filter((w) => !kwQuery.trim() || w.includes(kwQuery.trim().toLowerCase()));
  const toggleExclude = (w: string) => set('excludeWords', excluded.has(slugify(w)) ? draft.excludeWords.filter((x) => slugify(x) !== slugify(w)) : [...draft.excludeWords, w]);
  const toggleHi = (w: string) => set('highlightWords', hiSet.has(slugify(w)) ? draft.highlightWords.filter((x) => slugify(x) !== slugify(w)) : [...draft.highlightWords, w]);
  const counts = buildEyeWords(eye.live, draft);

  const status = pending
    ? `Previewing your converted video (${mb(pending.blob.size)}, ${pending.duration.toFixed(1)} s). Not saved yet.`
    : draft.video
    ? `Uploaded video: ${draft.video.name} · ${mb(draft.video.size)} · ${draft.video.duration.toFixed(1)} s · ${new Date(draft.video.uploadedAt).toLocaleDateString()}`
    : 'Built-in eye video.';

  return (
    <div>
      <VHead
        title="Home page"
        sub="Controls for the homepage eye: the video it's drawn from, the keywords it's made of (with a small set in yellow), and how it looks and moves. Changes show in the preview straight away; Save puts them on the homepage."
      >
        <div className="flex flex-wrap gap-2.5 items-center">
          {dirty && <span className="font-sans text-[12px] font-bold uppercase tracking-[0.08em] text-amber bg-amberBg rounded-full px-2.5 py-1">Unsaved changes</span>}
          <Btn onClick={() => { setDraft(saved); setPending(null); setFileErr(''); void loadCurrent(saved); }} disabled={!dirty || saving} className="disabled:opacity-50">Discard</Btn>
          <Btn variant="primary" onClick={save} disabled={!dirty || saving} className="disabled:opacity-50">{saving ? 'Saving…' : 'Save to homepage'}</Btn>
          <a href="/" target="_blank" rel="noopener" className="font-sans font-semibold text-[13px] underline" style={{ color: 'var(--rust)' }}>View homepage ↗</a>
        </div>
      </VHead>

      {big && (
        <div className="fixed inset-0 z-[90] bg-black/85 grid place-items-center p-4" role="dialog" aria-label="Full-screen preview">
          <div className="relative w-full h-full max-w-[1600px] rounded overflow-hidden border border-white/20" style={{ background: draft.bg }}>
            <EyeField settings={draft} words={eye.words} highlight={eye.highlight} sources={sources} />
            <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
              <div>
                <div className="font-mono text-[13px] tracking-[.42em] text-white/85 mb-1">THIS IS</div>
                <div className="font-num leading-[.9] text-[clamp(2.6rem,6.6vw,6.4rem)]" style={{ color: draft.ink }}>The Better Architecture Project</div>
              </div>
            </div>
            <button type="button" autoFocus onClick={() => setBig(false)} className="absolute top-3 right-3 font-sans text-[13px] font-semibold px-3.5 py-2 rounded-full bg-white text-black">Close preview ✕</button>
          </div>
        </div>
      )}

      <div className="secLayoutWrap">
        {/* ---- live preview ---- */}
        <aside className="secLayoutAside">
          <div className="c-card bg-card border border-hair rounded-md p-3">
            <div className="flex items-center gap-2 mb-2">
              <b className="font-display italic text-[16px] flex-1">Live preview</b>
              <button type="button" onClick={() => setBig(true)} className="font-sans text-[12px] font-semibold px-2.5 py-1 rounded-full border bg-card text-muted border-hair hover:text-ink">Full screen</button>
              {(['laptop', 'phone'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setPreviewAs(m)} aria-pressed={previewAs === m}
                  className={`font-sans text-[12px] font-semibold px-2.5 py-1 rounded-full border ${previewAs === m ? 'bg-rust text-white border-rust' : 'bg-card text-muted border-hair'}`}>
                  {m === 'laptop' ? 'Laptop' : 'Phone'}
                </button>
              ))}
            </div>
            <div className={`relative mx-auto rounded overflow-hidden border border-hair ${previewAs === 'phone' ? 'w-[200px] h-[420px]' : 'w-full aspect-[16/10]'}`} style={{ background: draft.bg }}>
              <EyeField settings={draft} words={eye.words} highlight={eye.highlight} sources={sources} onStatus={setVideoStatus} />
              <div className="absolute inset-0 grid place-items-center pointer-events-none text-center px-3">
                <div>
                  <div className="font-mono text-[9px] tracking-[.35em] text-white/80">THIS IS</div>
                  <div className="font-num leading-[.9]" style={{ color: draft.ink, fontSize: previewAs === 'phone' ? 26 : 30 }}>The Better Architecture Project</div>
                </div>
              </div>
            </div>
            <p className="text-[12px] text-muted mt-2 leading-snug">{status}</p>
            {videoStatus?.error && <p role="alert" className="text-[12px] text-danger font-semibold mt-1">{videoStatus.error}</p>}
            <p className="text-[11.5px] text-faint mt-1">Move the mouse over the preview to see the torch. Fonts load from Google Fonts on the live site.</p>
          </div>
        </aside>

        <div>
          {/* ---- video ---- */}
          <Panel>
            <PanelTitle num="01" title="Eye video" right={draft.video || pending ? <Btn size="sm" onClick={useBuiltIn}>Use built-in eye</Btn> : undefined} />
            <PanelNote>
              The video below is the one on the homepage now: re-trim it or change its quality and convert, or drop a new video to replace it.
              New videos: any format your browser can play (MP4, MOV, WebM). <b>Maximum file size: {EYE_MAX_UPLOAD_MB} MB.</b> You then choose up to {EYE_MAX_CLIP_SECONDS} seconds of it; the browser converts that part
              into a small greyscale loop (at most {EYE_MAX_STORED_MB} MB) and the eye is drawn from it. A close-up that ends roughly where it starts loops best.
            </PanelNote>
            <label className="block border border-dashed border-hair rounded-md px-4 py-5 text-center cursor-pointer hover:border-rust transition-colors"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pickFile(e.dataTransfer.files?.[0]); }}>
              <span className="font-sans text-[13.5px] text-muted">To replace it: drop a new video here, or <b className="text-ink underline">choose a file</b> (max {EYE_MAX_UPLOAD_MB} MB)</span>
              <input type="file" accept="video/*" className="sr-only" onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {fileErr && <p role="alert" className="text-danger text-[13px] font-semibold mt-2">{fileErr}</p>}

            {loadingCurrent && !file && <p className="text-[13px] text-muted mt-4" role="status">Loading the current eye video…</p>}
            {file && (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`font-sans text-[10.5px] font-bold uppercase tracking-[0.08em] rounded-full px-2.5 py-1 ${file.current ? 'text-moss bg-mossBg' : 'text-amber bg-amberBg'}`}>
                    {file.current ? 'On the homepage now' : 'New video (not saved)'}
                  </span>
                  <p className="text-[13px] text-muted flex-1 min-w-0"><b className="text-ink">{file.name}</b>{file.size !== null ? ` · ${mb(file.size)}` : ''} · {file.duration.toFixed(1)} s long</p>
                  {!file.current && !pending && progress === null && <Btn size="sm" onClick={() => { setFileErr(''); void loadCurrent(saved); }}>Back to current video</Btn>}
                </div>
                <video ref={scrubRef} src={file.url} muted playsInline controls className="w-full max-h-[240px] rounded bg-black mb-3" />
                <Range label="Start at" value={trim[0]} min={0} max={Math.max(0, file.duration - 0.5)} step={0.1} fmt={(v) => `${v.toFixed(1)} s`}
                  onChange={(v) => { const end = Math.min(file.duration, Math.max(trim[1], v + 0.5), v + EYE_MAX_CLIP_SECONDS); setTrim([v, end]); if (scrubRef.current) scrubRef.current.currentTime = v; }} />
                <Range label="End at" value={trim[1]} min={0.5} max={file.duration} step={0.1} fmt={(v) => `${v.toFixed(1)} s`}
                  onChange={(v) => { const start = Math.max(0, Math.min(trim[0], v - 0.5), v - EYE_MAX_CLIP_SECONDS); setTrim([start, v]); if (scrubRef.current) scrubRef.current.currentTime = v; }} />
                <p className="text-[12px] text-faint mb-2">Clip length: {(trim[1] - trim[0]).toFixed(1)} s (max {EYE_MAX_CLIP_SECONDS} s). Converting takes about as long as the clip.</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Select value={quality} onChange={(e) => setQuality(e.target.value as Quality)} className="max-w-[240px]" aria-label="Quality">
                    {Object.entries(QUALITIES).map(([k, q]) => <option key={k} value={k}>{q.label}</option>)}
                  </Select>
                  {progress === null
                    ? <Btn variant="primary" onClick={convert}>Convert & preview</Btn>
                    : <Btn onClick={() => abortRef.current?.abort()}>Cancel</Btn>}
                </div>
                {progress !== null && (
                  <div className="mt-3" role="status">
                    <div className="h-2 rounded-full bg-hair overflow-hidden"><div className="h-full bg-rust transition-[width]" style={{ width: pct(progress) }} /></div>
                    <p className="text-[12px] text-muted mt-1">Converting… {pct(progress)} (keep this tab open)</p>
                  </div>
                )}
              </div>
            )}
            {pending && <p className="text-[13px] text-moss font-semibold mt-3">Ready: {mb(pending.blob.size)}, {pending.duration.toFixed(1)} s. Press “Save to homepage” to upload it.</p>}
            {!REMOTE_ENABLED && <p className="text-[12px] text-faint mt-2">This copy of the site isn't connected to the database: an uploaded video can be previewed here but is only saved on the live site.</p>}
            <div className="mt-4">
              <Range label="Speed" value={draft.speed} min={0.25} max={3} step={0.05} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => set('speed', v)} />
              <Range label="Loop blend" value={draft.blend} min={0.1} max={1.5} step={0.05} fmt={(v) => `${v.toFixed(2)} s`} onChange={(v) => set('blend', v)} hint="Crossfade at the end of the loop" />
              <Row label="Seam scramble" hint="Words scramble briefly as the loop restarts"><Toggle checked={draft.seam} onChange={(v) => set('seam', v)} label={draft.seam ? 'On' : 'Off'} /></Row>
            </div>
          </Panel>

          {/* ---- keywords ---- */}
          <Panel>
            <PanelTitle num="02" title={`Keywords (${counts.words.length} normal · ${counts.highlight.length} highlighted)`} />
            <PanelNote>
              The eye is made of every live keyword automatically, so new keywords appear on their own. Click a word to leave it out (crossed out),
              or star it (☆) to put it in the <b style={{ color: draft.highlightColor }}>highlight set</b>, a small set drawn in yellow. A handful of 3–12 highlight words works best.
            </PanelNote>
            <PlainInput value={kwQuery} onChange={(e) => setKwQuery(e.target.value)} placeholder={`Filter ${eye.live.length} live keywords`} className="max-w-[320px] mb-3" aria-label="Filter keywords" />
            <div className="flex flex-wrap gap-1.5 max-h-[260px] overflow-auto thin-scroll border border-hair rounded-md p-2.5 bg-paper">
              {liveShown.map((w) => {
                const off = excluded.has(slugify(w)), hi = hiSet.has(slugify(w));
                return (
                  <span key={w} className={`inline-flex items-center rounded-full border text-[12.5px] font-sans overflow-hidden ${off ? 'border-hair text-faint' : 'border-hair text-ink bg-card'}`}>
                    <button type="button" onClick={() => toggleExclude(w)} title={off ? 'Put back into the eye' : 'Leave out of the eye'} className={`pl-2.5 pr-1.5 py-1 ${off ? 'line-through' : ''}`}>{w}</button>
                    <button type="button" onClick={() => toggleHi(w)} title={hi ? 'Remove from highlight set' : 'Add to highlight set'} aria-pressed={hi}
                      className="pr-2 pl-1 py-1" style={{ color: hi ? draft.highlightColor : undefined }}>{hi ? '★' : '☆'}</button>
                  </span>
                );
              })}
              {liveShown.length === 0 && <span className="text-[12.5px] text-faint">No keywords match.</span>}
            </div>
            <Field label="Extra words for the eye" hint="Comma-separated words that aren't keywords but should appear in the eye.">
              <PlainArea className="min-h-[60px]" value={draft.extraWords.join(', ')} onChange={(e) => set('extraWords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
            </Field>
            <Field label="Highlight set" hint="Words drawn in the highlight colour. Add any word, even if it isn't a keyword.">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {draft.highlightWords.map((w) => (
                  <span key={w} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold" style={{ background: `${draft.highlightColor}22`, color: draft.highlightColor }}>
                    {w}<button type="button" onClick={() => toggleHi(w)} aria-label={`Remove ${w}`} className="font-bold">×</button>
                  </span>
                ))}
                {draft.highlightWords.length === 0 && <span className="text-[12.5px] text-faint">None yet: star words above or add one here.</span>}
              </div>
              <div className="flex gap-2">
                <PlainInput value={hiInput} onChange={(e) => setHiInput(e.target.value)} placeholder="Add a highlight word" className="max-w-[280px]"
                  onKeyDown={(e) => { if (e.key === 'Enter' && hiInput.trim()) { e.preventDefault(); if (!hiSet.has(slugify(hiInput))) set('highlightWords', [...draft.highlightWords, hiInput.trim()]); setHiInput(''); } }} />
                <Btn onClick={() => { if (hiInput.trim() && !hiSet.has(slugify(hiInput))) set('highlightWords', [...draft.highlightWords, hiInput.trim()]); setHiInput(''); }}>Add</Btn>
              </div>
            </Field>
            <Row label="Highlight colour"><input type="color" value={draft.highlightColor} onChange={(e) => set('highlightColor', e.target.value)} className="w-12 h-7 rounded border border-hair bg-card cursor-pointer" aria-label="Highlight colour" /></Row>
            <Range label="Highlight share" value={draft.highlightShare} min={0} max={0.5} step={0.01} fmt={pct} onChange={(v) => set('highlightShare', v)} hint="How many of the words come from the highlight set" />
            <Range label="Highlight glow" value={draft.highlightBoost} min={0} max={1} step={0.05} fmt={pct} onChange={(v) => set('highlightBoost', v)} hint="Extra brightness for highlight words inside the eye" />
          </Panel>

          {/* ---- every control from the reference panel ---- */}
          <Panel>
            <PanelTitle num="03" title="Look and motion" right={<Btn size="sm" onClick={resetLook}>Reset to approved look</Btn>} />
            <Group title="Characters">
              <Row label="Mode"><Select value={draft.mode} onChange={(e) => set('mode', e.target.value as HomeEyeSettings['mode'])} aria-label="Mode"><option value="words">Words</option><option value="random">Random glyphs</option></Select></Row>
              <Row label="Uppercase"><Toggle checked={draft.upper} onChange={(v) => set('upper', v)} label={draft.upper ? 'On' : 'Off'} /></Row>
              <Row label="Gap mark" hint="Characters between words (up to 8). A space = invisible gap.">
                <PlainInput value={draft.gapMark} maxLength={8} onChange={(e) => set('gapMark', e.target.value)} placeholder="space, / or ·•·" className="max-w-[160px] font-mono" />
              </Row>
              <Range label="Gap fill" value={draft.gapFill} min={0} max={1} step={0.05} fmt={pct} onChange={(v) => set('gapFill', v)} hint="Opacity of the gap mark" />
            </Group>
            <Group title="Grid">
              <Range label="Word size (laptop)" value={draft.density} min={7} max={16} step={1} fmt={(v) => `${v}px`} onChange={(v) => set('density', v)} />
              <Range label="Word size (phone)" value={draft.densityPhone} min={6} max={14} step={1} fmt={(v) => `${v}px`} onChange={(v) => set('densityPhone', v)} />
            </Group>
            <Group title="Tone">
              <Row label="Auto levels" hint="Stretch each frame's own dark→bright range first (good for moody footage)"><Toggle checked={draft.autoLevels} onChange={(v) => set('autoLevels', v)} label={draft.autoLevels ? 'On' : 'Off'} /></Row>
              <Range label="Contrast" value={draft.contrast} min={0.5} max={3} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => set('contrast', v)} />
              <Range label="Brightness" value={draft.bright} min={-0.4} max={0.4} step={0.01} fmt={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`} onChange={(v) => set('bright', v)} />
              <Range label="Threshold" value={draft.thresh} min={0} max={0.3} step={0.01} fmt={(v) => v.toFixed(2)} onChange={(v) => set('thresh', v)} hint="Below this, a cell stays empty" />
              <Range label="Intensity" value={draft.intensity} min={0.3} max={1} step={0.01} fmt={pct} onChange={(v) => set('intensity', v)} hint="How strong the brightest words are" />
              <Row label="Invert"><Toggle checked={draft.invert} onChange={(v) => set('invert', v)} label={draft.invert ? 'On' : 'Off'} /></Row>
            </Group>
            <Group title="Motion">
              <Range label="Churn" value={draft.churn} min={0} max={100} step={1} fmt={(v) => String(Math.round(v))} onChange={(v) => set('churn', v)} hint="How often words swap in place (0 = never)" />
              <Range label="Burst" value={draft.burst} min={0} max={400} step={10} fmt={(v) => `${Math.round(v)}ms`} onChange={(v) => set('burst', v)} hint="Scramble time before a swapped word settles" />
              <Range label="Smooth" value={draft.smooth} min={0} max={0.9} step={0.05} fmt={pct} onChange={(v) => set('smooth', v)} hint="Smooths brightness changes between frames" />
              <Row label="Static" hint="Faint flickering words in the dark areas"><Toggle checked={draft.statics} onChange={(v) => set('statics', v)} label={draft.statics ? 'On' : 'Off'} /></Row>
              <Range label="Cursor flow" value={draft.flow} min={0} max={1} step={0.05} fmt={(v) => (v === 0 ? 'Off' : pct(v))} onChange={(v) => set('flow', v)} hint="Moving the mouse stirs the eye like ink in water (0 = off)" />
              <Range label="Flow linger" value={draft.flowLinger} min={0} max={1} step={0.05} fmt={pct} onChange={(v) => set('flowLinger', v)} hint="How long the swirl keeps moving before the eye settles" />
            </Group>
            <Group title="Look">
              <Row label="Font"><Select value={draft.font} onChange={(e) => set('font', e.target.value as EyeFont)} aria-label="Font">{Object.entries(EYE_FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</Select></Row>
              <Row label="Fit (laptop)"><Select value={draft.fit} onChange={(e) => set('fit', e.target.value as HomeEyeSettings['fit'])} aria-label="Fit"><option value="cover">Cover the screen</option><option value="contain">Whole video visible</option></Select></Row>
              <Range label="Eye size (laptop)" value={draft.zoom} min={1} max={1.6} step={0.01} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => set('zoom', v)} hint="Used with 'Cover the screen'" />
              <Range label="Eye size (phone)" value={draft.phoneSize} min={0.8} max={2.5} step={0.05} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => set('phoneSize', v)} hint="Eye width as a multiple of the phone's screen width" />
              <Row label="Word colour (ink)"><input type="color" value={draft.ink} onChange={(e) => set('ink', e.target.value)} className="w-12 h-7 rounded border border-hair bg-card cursor-pointer" aria-label="Ink colour" /></Row>
              <Row label="Background"><input type="color" value={draft.bg} onChange={(e) => set('bg', e.target.value)} className="w-12 h-7 rounded border border-hair bg-card cursor-pointer" aria-label="Background colour" /></Row>
              <Row label="Torch" hint="Soft light around the mouse"><Toggle checked={draft.torch} onChange={(v) => set('torch', v)} label={draft.torch ? 'On' : 'Off'} /></Row>
              <Row label="Drift" hint="The eye moves slightly toward the mouse"><Toggle checked={draft.parallax} onChange={(v) => set('parallax', v)} label={draft.parallax ? 'On' : 'Off'} /></Row>
            </Group>
          </Panel>
        </div>
      </div>
    </div>
  );
}
