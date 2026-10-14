// "A Reading of the Conversation" is stored as a list of paragraphs
// (EpisodeAnalysis.reading: string[]) — the public Episode page, the
// template importer and the saved database records all rely on that shape.
// The console edits it in ONE rich-text box, so these two helpers convert
// between the list and the box's HTML. Browser-only (uses <template>).

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'PRE']);

/** Has visible content (text, an image, or a list) — not just <br>/whitespace. */
function hasContent(html: string): boolean {
  const t = document.createElement('template');
  t.innerHTML = html;
  return Boolean((t.content.textContent ?? '').replace(/ /g, ' ').trim()) || Boolean(t.content.querySelector('img'));
}

/** Strips a lone trailing <br> that browsers leave inside edited blocks. */
const tidy = (html: string) => html.replace(/(<br\s*\/?>\s*)+$/i, '').trim();

/** Paragraph list → one HTML string for the editor box (one <p> per paragraph). */
export function readingToHtml(paragraphs: string[] | undefined | null): string {
  return (paragraphs ?? []).filter((p) => p && p.trim()).map((p) => `<p>${p}</p>`).join('');
}

/** The editor box's HTML → paragraph list. Every block (paragraph, line the
 * browser wraps in a <div>, heading, quote, list) becomes one paragraph; loose
 * text between blocks becomes its own paragraph; empty lines are dropped.
 * Inline formatting (bold, italic, links, colours, Shift+Enter line breaks)
 * is kept exactly as typed. */
export function htmlToReading(html: string): string[] {
  const t = document.createElement('template');
  t.innerHTML = html || '';
  const out: string[] = [];
  let run = '';
  const endRun = () => {
    const p = tidy(run);
    if (p && hasContent(p)) out.push(p);
    run = '';
  };
  for (const node of Array.from(t.content.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (BLOCK_TAGS.has(el.tagName)) {
        endRun();
        // A <div> or <p> is just a paragraph wrapper — keep what's inside it.
        // Headings, quotes and lists keep their tag so their formatting survives.
        const inner = el.tagName === 'P' || el.tagName === 'DIV' ? el.innerHTML : el.outerHTML;
        // A wrapper <div> holding several paragraphs (pasted content) → split it too.
        if (el.tagName === 'DIV' && el.querySelector(':scope > p, :scope > div')) {
          out.push(...htmlToReading(el.innerHTML));
          continue;
        }
        const p = tidy(inner);
        if (p && hasContent(p)) out.push(p);
        continue;
      }
      if (el.tagName === 'BR') {
        // A line break between loose lines of text: the next line starts a new paragraph.
        endRun();
        continue;
      }
      run += el.outerHTML;
    } else if (node.nodeType === Node.TEXT_NODE) {
      run += (node.textContent ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }
  endRun();
  return out;
}
