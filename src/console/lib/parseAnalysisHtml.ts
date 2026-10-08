import {
  SENTIMENT_SCALES,
  SPECTACLE_DOMAIN_BY_CODE,
  SPECTACLE_THEME_NAME,
} from '../../data/spectacle';

/**
 * HTML import for the Episode Analysis console. Three kinds of page are
 * understood, tried in this order:
 *
 *  1. Our own v5 sample template — carries the finished record as an
 *     embedded <script type="application/json" id="axm-analysis-data">.
 *  2. A page published by the client's AXM Console v6 — carries its full
 *     record as <script id="axm-record">.
 *  3. The client's published SPECTACLE front-end page itself (e.g. the
 *     Instruments of Advocacy template) — no embedded record, so the
 *     structured parts come from its `const DATA = {...}` script and the
 *     prose, themes, excerpts, references, citation, related episodes and
 *     transcript are read from its DOM. This is a port of the reference
 *     parser in AXM_Backend_Editor_v6.
 *
 * A console v6 JSON export (.json) is also accepted and converted.
 */

export interface EpisodeSuggestion {
  title?: string;
  guest?: string;
  no?: string;
  sub?: string;
  url?: string;
  /** Theme title as printed on the page, to be matched against live themes. */
  themeTitle?: string;
}

export interface ImportResult {
  data?: any;
  suggest?: EpisodeSuggestion;
  /** [what, how many] — shown to the admin after a scrape. */
  report?: [string, number][];
  error?: string;
}

/* -------------------------------------------------------------------- */

const T = (e: Element | null | undefined): string => (e ? (e.textContent ?? '').replace(/\s+/g, ' ').trim() : '');
const all = (root: ParentNode, sel: string): Element[] => Array.from(root.querySelectorAll(sel));

function extractDataBlob(text: string): any | null {
  const m = text.match(/const\s+DATA\s*=\s*\{/);
  if (!m || m.index === undefined) return null;
  const start = text.indexOf('{', m.index);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const num = (v: any): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Console v6 "record" (as exported or embedded) → the live EpisodeAnalysis. */
export function recordToAnalysis(rec: any, extras: { eyebrow?: string; stats?: [string, string][]; lexnarr?: string; sentprose?: string; compassProse?: string; spotify?: string; txSpeakers?: boolean } = {}): any {
  const meta = rec.meta ?? {};
  const domName = (code: string) => SPECTACLE_DOMAIN_BY_CODE[code]?.name ?? code;

  // keywords + hue keyed by domain name (the live bubble map colours by `typ`)
  const hue: Record<string, string> = {};
  const keywords = (rec.keywords ?? [])
    .filter((k: any) => k && String(k.word ?? '').trim())
    .map((k: any) => {
      const d = SPECTACLE_DOMAIN_BY_CODE[k.dom];
      const typ = d ? d.name : 'Keywords';
      hue[typ] = d ? d.light : '#888888';
      return { word: String(k.word).trim(), typ, freq: num(k.freq) || 1, gloss: k.gloss ?? '', dom: k.dom };
    });

  const themes = (rec.themes ?? []).map((t: any) => {
    const code = t.code ?? '';
    const dom = code.split('.')[0];
    return {
      t: SPECTACLE_THEME_NAME[code] ?? code,
      p: t.reading ? [t.reading] : [],
      code,
      dom,
      band: t.band ?? '',
      bridge: t.mode === 'bridge' && t.bridge !== '' ? num(t.bridge) : undefined,
      excerpts: (t.excerpts ?? []).map((x: any) => ({ before: x.before ?? '', main: x.main ?? '', after: x.after ?? '' })),
    };
  });

  const excerpts = (rec.excerpts ?? []).filter((x: any) => x && String(x.main ?? '').trim());
  const quotes = excerpts.map((x: any) => ({
    cat: domName(x.dom),
    kp: !!x.kp,
    read: x.reading ?? '',
    ctx1: x.before ?? '',
    main: x.main ?? '',
    ctx2: x.after ?? '',
    dom: x.dom,
  }));
  const qcats = Array.from(new Set(quotes.map((q: any) => q.cat))) as string[];

  const sentSource: any[] = rec.sentiments ?? [];
  const sentiments = sentSource
    .map((s: any, i: number) => {
      const scale = SENTIMENT_SCALES.find((x) => x[0] === s.code) ?? SENTIMENT_SCALES[i];
      if (!scale) return null;
      const low = s.low ?? scale[1];
      const high = s.high ?? scale[2];
      return {
        code: s.code ?? scale[0],
        label: s.label ?? high,
        full: s.full ?? `${low} ↔ ${high}`,
        score: s.score === '' || s.score === undefined || s.score === null ? NaN : num(s.score),
        reading: s.reading ?? '',
        dom: s.dom ?? scale[3],
        present: s.present !== false,
      };
    })
    .filter((s: any) => s && !Number.isNaN(s.score) && s.present)
    .map(({ present: _p, ...rest }: any) => rest);

  const compassIn = rec.compass ?? {};
  const compass = {
    x: num(compassIn.x),
    y: num(compassIn.y),
    quadrant: compassIn.quadrant ?? '',
    prose: extras.compassProse ?? compassIn.prose ?? '',
    indicators: compassIn.indicators ?? [],
  };

  const refRows: { c: string; n: string; u: string; d: string }[] = [];
  for (const r of rec.refs ?? []) if (r.name) refRows.push({ c: r.cat || 'People', n: r.name, u: r.link || '', d: r.note || '' });
  for (const r of rec.kn ?? []) if (r.name) refRows.push({ c: 'Knowledge Network', n: r.name, u: r.link || '', d: r.note || '' });
  const catOrder = ['People', 'Institutions & bodies', 'Texts & books', 'Media platforms', 'Concepts & events', 'Knowledge Network'];
  const used = Array.from(new Set(refRows.map((r) => r.c)));
  const refcats = [...catOrder.filter((c) => used.includes(c)), ...used.filter((c) => !catOrder.includes(c))];

  const related = (rec.related ?? [])
    .filter((r: any) => r && (r.title || '').trim())
    .map((r: any) => ({ t: r.title, g: r.guest ?? '', d: r.note ?? '', id: '' }));

  const materials: { t: string; d: string; u: string; c: string }[] = [];
  if (extras.spotify) materials.push({ t: 'The episode on Spotify', d: 'The full conversation, streaming.', u: extras.spotify, c: 'Listen' });

  // transcript: lines are "\nSpeaker" headers (blank line, short name) followed by turns
  let tx: [string, string][] = [];
  if (typeof rec.transcript === 'string' && rec.transcript.trim()) {
    let host: string | null = null;
    let speaker: string | null = null;
    let prevEmpty = false;
    for (const raw of rec.transcript.split('\n')) {
      const line = raw.trim();
      if (!line) {
        prevEmpty = true;
        continue;
      }
      if (prevEmpty && line.length <= 60 && !/[.!?…”"’']$/.test(line)) {
        speaker = line;
        if (!host) host = line;
      } else {
        tx.push([speaker && host && speaker !== host ? 'G' : 'H', line]);
      }
      prevEmpty = false;
    }
  } else if (Array.isArray(rec.tx)) {
    tx = rec.tx;
  }

  const spectacleDomains = (rec.domains ?? [])
    .filter((d: any) => d && SPECTACLE_DOMAIN_BY_CODE[d.code])
    .map((d: any) => ({ code: d.code, bridge: num(d.bridge), partial: !!d.partial, hover: d.hover ?? '' }));

  const tags = (rec.tags ?? []).map((t: string) => String(t).trim()).filter(Boolean);
  const stats: [string, string][] =
    extras.stats && extras.stats.length
      ? extras.stats
      : [
          ...(meta.duration ? ([[String(meta.duration), 'Duration']] as [string, string][]) : []),
          ...(meta.words ? ([[Number(meta.words).toLocaleString('en-US'), 'Words']] as [string, string][]) : []),
          [String(themes.length), 'Key themes'],
          [String(refRows.length), 'References'],
        ];

  return {
    eyebrow: extras.eyebrow ?? (meta.epno ? `Ep. ${meta.epno}` : ''),
    bio: meta.role ?? '',
    tags,
    stats,
    reading: (rec.reading ?? []).filter((p: string) => p && p.trim()),
    lexnarr:
      extras.lexnarr ??
      'Keywords drawn from the corrected transcript, sized by frequency and coloured by SPECTACLE domain. Hover a bubble for a gloss; click to see everywhere the word appears.',
    keywords,
    hue,
    themes,
    qcats,
    quotes,
    lived: rec.lived ?? '',
    sentprose: extras.sentprose ?? '',
    sentiments,
    compass,
    refcats,
    refs: refRows,
    related,
    materials,
    txnote: tx.length ? 'The corrected transcript for this conversation.' : '',
    tx,
    meta: { id: meta.id ?? '', date: meta.date ?? '', duration: meta.duration ?? '', lang: meta.lang ?? '', role: meta.role ?? '' },
    spectacle: spectacleDomains.length ? { domains: spectacleDomains } : undefined,
    cite: rec.cite ?? '',
  };
}

/** Scrapes the client's published SPECTACLE front-end page. */
function scrapeSpectaclePage(text: string, doc: Document): ImportResult {
  const DATA = extractDataBlob(text);
  if (!DATA) {
    return {
      error:
        'No analysis data found in this HTML file. Upload the published SPECTACLE page (it carries a `const DATA = {…}` script), a page published from the AXM Console, or our sample template.',
    };
  }

  const rec: any = {
    meta: { epno: '', title: '', guest: '', role: '', date: '', duration: '', spotify: '', lang: 'English', status: 'Analysed', id: '', words: '' },
    tags: [], reading: [], themes: [], excerpts: [], lived: '', domains: [], compass: { x: '', y: '' },
    sentiments: [], keywords: [], refs: [], kn: [], cite: '', related: [], transcript: '',
  };

  rec.domains = (DATA.domains ?? []).map((d: any) => ({ code: d.code, bridge: d.bridge, partial: !!d.partial, hover: d.hover || '' }));
  rec.sentiments = (DATA.sent ?? []).map((s: any) => ({ code: s.code, label: s.label, full: s.full, low: s.low, high: s.high, score: s.score, present: s.present, dom: s.dom, reading: s.reading || '' }));
  rec.compass = { x: DATA.compass?.x, y: DATA.compass?.y, quadrant: DATA.compass?.quadrant ?? '', indicators: DATA.compass?.indicators ?? [] };
  rec.keywords = (DATA.kw ?? []).map((k: any) => ({ word: k.word, dom: k.dom, freq: k.freq, gloss: k.gloss || '' }));

  rec.meta.title = T(doc.querySelector('h1'));
  rec.meta.role = T(doc.querySelector('.standfirst'));
  const eyebrow = T(doc.querySelector('.eyebrow'));
  const em = eyebrow.match(/EP\.\s*(\d+)/i);
  if (em) rec.meta.epno = em[1];
  const idsp = all(doc, '.idstrip span').map(T).filter((x) => x !== '·');
  if (idsp.length) {
    rec.meta.id = idsp[0] || '';
    rec.meta.date = idsp[2] || '';
    rec.meta.duration = idsp[3] || '';
    rec.meta.lang = idsp[4] || 'English';
  }
  rec.meta.guest = T(doc.querySelector('.cobox .nm'));
  const ifr = doc.querySelector('.listen iframe');
  const embedSrc = ifr?.getAttribute('src') ?? '';
  rec.meta.spotify = embedSrc.replace('/embed/', '/');
  const gcells = all(doc, '.gcell').map((c) => [T(c.querySelector('.gnum')), T(c.querySelector('.glab'))] as [string, string]);
  const words = gcells.find((g) => /word/i.test(g[1]));
  if (words) rec.meta.words = words[0].replace(/[^0-9]/g, '');
  rec.tags = all(doc, '.kws .kw').map(T).filter(Boolean);

  rec.reading = all(doc, '#s1 .reading p').map(T).filter(Boolean);
  rec.themes = all(doc, '#plateGrid .plate').map((p) => {
    const score = T(p.querySelector('.pscore'));
    const bm = score.match(/bridge\s+([\d.]+)/i);
    return {
      code: T(p.querySelector('.pcode')) || 'G1.1',
      band: T(p.querySelector('.pband')) || 'Central',
      mode: bm ? 'bridge' : 'new',
      bridge: bm ? bm[1] : '',
      reading: T(Array.from(p.children).find((c) => c.tagName === 'P') ?? null),
      excerpts: all(p, '.exc').map(excOf),
    };
  });
  rec.excerpts = all(doc, '#excGrid .xcard').map((c) => {
    const kr = c.querySelector('.kread');
    const reading = kr ? T(kr).replace(/^READING\s*/, '') : '';
    return { dom: (c as HTMLElement).dataset.dom || 'G1', kp: (c as HTMLElement).dataset.kp === '1', reading, ...excOf(c.querySelector('.exc')) };
  });
  rec.lived = T(doc.querySelector('#s3 .lived p'));

  all(doc, '#refBody tr').forEach((tr) => {
    const a = tr.querySelector('a');
    const row = { name: T(a), note: T(tr.querySelector('.refnote')), link: a?.getAttribute('href') || '' };
    if ((tr as HTMLElement).dataset.cat === 'KN') rec.kn.push(row);
    else rec.refs.push({ cat: (tr as HTMLElement).dataset.cat || 'People', ...row });
  });

  rec.cite = T(doc.getElementById('citeText'));
  rec.related = all(doc, '.rel .row').map((r) => ({
    num: T(r.querySelector('b')),
    title: T(r.querySelector('a')),
    guest: T(r.querySelector('.who')),
    note: T(r.querySelector('.note2')),
  }));

  // transcript: speaker headers (.tx-name) then turns (.tx-turn); .tx-ai is the podcast's spoken intro
  const tx: [string, string][] = [];
  let host: string | null = null;
  let speaker: string | null = null;
  all(doc, '#txModal .sheetbody > *').forEach((el) => {
    if (el.classList.contains('tx-name')) {
      speaker = T(el);
      if (!host) host = speaker;
    } else {
      const line = T(el);
      if (line) tx.push([speaker && host && speaker !== host ? 'G' : 'H', line]);
    }
  });

  const segNote = (id: string) => T(doc.querySelector(`#${id} .segbody > p:not(.note)`)) || '';
  const lexnote = T(doc.querySelector('#s6 .note')) || T(doc.querySelector('#s6 .segbody p'));

  const analysis = recordToAnalysis(rec, {
    eyebrow: eyebrow
      .split('|')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => x.charAt(0) + x.slice(1).toLowerCase().replace(/\bx\b/g, 'X').replace(/\bep\./g, 'Ep.'))
      .join(' · '),
    stats: gcells.filter((g) => g[0] && g[1]).map(([v, l]) => [v, l.charAt(0) + l.slice(1).toLowerCase()] as [string, string]),
    lexnarr: lexnote ? `${lexnote}` : undefined,
    sentprose: segNote('s5'),
    compassProse: segNote('s4'),
    spotify: rec.meta.spotify || undefined,
  });
  // the scrape's transcript is already structured
  analysis.tx = tx;
  analysis.txnote = tx.length ? 'The corrected transcript for this conversation.' : '';

  const themeTitle = eyebrow.split('|')[0]?.trim() ?? '';
  return {
    data: analysis,
    suggest: {
      title: rec.meta.title,
      guest: rec.meta.guest,
      no: rec.meta.epno,
      sub: rec.meta.role,
      url: rec.meta.spotify,
      themeTitle,
    },
    report: [
      ['reading paragraphs', analysis.reading.length],
      ['themes', analysis.themes.length],
      ['excerpts / key phrases', analysis.quotes.length],
      ['keywords', analysis.keywords.length],
      ['sentiments', analysis.sentiments.length],
      ['SPECTACLE domains', analysis.spectacle?.domains.length ?? 0],
      ['references', analysis.refs.length],
      ['related episodes', analysis.related.length],
      ['transcript turns', analysis.tx.length],
    ],
  };

  function excOf(x: Element | null) {
    if (!x) return { before: '', main: '', after: '' };
    const ctx = all(x, '.ctx').map(T);
    return { before: ctx[0] || '', main: T(x.querySelector('.mainq')), after: ctx[1] || '' };
  }
}

/** Entry point for an uploaded .html/.htm file's text. */
export function importAnalysisHtml(html: string): ImportResult {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return { error: 'That file could not be parsed as HTML.' };
  }

  // 1. our own sample template
  const ours = doc.getElementById('axm-analysis-data');
  if (ours && ours.textContent?.trim()) {
    try {
      return { data: JSON.parse(ours.textContent) };
    } catch {
      return { error: 'The embedded analysis data in this HTML file is not valid JSON.' };
    }
  }

  // 2. a page published from the AXM Console v6 (full record embedded)
  const rec = doc.getElementById('axm-record');
  if (rec && rec.textContent?.trim()) {
    try {
      return { data: recordToAnalysis(JSON.parse(rec.textContent)), report: [['record embedded in the page', 1]] };
    } catch {
      return { error: 'The embedded record in this HTML file is not valid JSON.' };
    }
  }

  // 3. the published SPECTACLE page itself
  return scrapeSpectaclePage(html, doc);
}

/** A .json upload: either one of our records, or a console v6 export. */
export function importAnalysisJson(text: string): ImportResult {
  let obj: any;
  try {
    obj = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  // console v6 exports have `meta` + `domains` + string scores; ours have `compass.prose` etc.
  if (obj && typeof obj === 'object' && obj.meta && Array.isArray(obj.domains) && !Array.isArray(obj.stats)) {
    return {
      data: recordToAnalysis(obj),
      suggest: { title: obj.meta.title, guest: obj.meta.guest, no: obj.meta.epno, sub: obj.meta.role, url: (obj.meta.spotify || '').replace('/embed/', '/') },
      report: [['console v6 export converted', 1]],
    };
  }
  return { data: obj };
}

// Kept for any older import site.
export function extractAnalysisFromHtml(html: string): { data?: any; error?: string } {
  const r = importAnalysisHtml(html);
  return { data: r.data, error: r.error };
}

