/** Plain text, Markdown, HTML and Jupyter notebook readers. */
import type { Block, ParsedDoc } from '../types';
import { clean } from '../util';

export function parseMarkdown(src: string, title: string): ParsedDoc {
  const blocks: Block[] = [];
  let heading: string[] = [];
  let levels: number[] = [];
  let para: string[] = [];
  let kind: Block['kind'] = 'p';
  let fence: string[] | null = null;
  let firstH1 = '';
  const flush = () => {
    const text = clean(para.join(kind === 'table' ? '\n' : ' '));
    if (text) blocks.push({ text, heading: [...heading], kind });
    para = [];
    kind = 'p';
  };
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (fence) {
      if (/^\s*(```|~~~)/.test(line)) {
        blocks.push({ text: fence.join('\n'), heading: [...heading], kind: 'code' });
        fence = null;
      } else fence.push(raw);
      continue;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      flush();
      fence = [];
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      const lvl = h[1].length;
      const text = clean(h[2].replace(/#+\s*$/, ''));
      if (lvl === 1 && !firstH1) firstH1 = text;
      while (levels.length && levels[levels.length - 1] >= lvl) {
        levels.pop();
        heading.pop();
      }
      heading = [...heading, text];
      levels = [...levels, lvl];
      blocks.push({ text, heading: [...heading], kind: 'h', level: lvl });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      flush();
      kind = 'li';
      para.push(line.replace(/^\s*([-*+]|\d+[.)])\s+/, ''));
      continue;
    }
    if (/^\s*\|/.test(line)) {
      if (kind !== 'table') flush();
      kind = 'table';
      if (!/^\s*\|?\s*:?-{2,}/.test(line)) para.push(line.replace(/^\s*\||\|\s*$/g, '').trim());
      continue;
    }
    if (kind === 'table') flush();
    para.push(line);
  }
  if (fence) blocks.push({ text: fence.join('\n'), heading: [...heading], kind: 'code' });
  flush();
  return { title: firstH1 || title, blocks };
}

export function parsePlain(src: string, title: string): ParsedDoc {
  const blocks: Block[] = src
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => clean(p.replace(/\n/g, ' ')))
    .filter(Boolean)
    .map((text) => ({ text, heading: [], kind: 'p' as const }));
  return { title, blocks };
}

const BLOCK_TAGS = new Set(['P', 'LI', 'DT', 'DD', 'BLOCKQUOTE', 'FIGCAPTION', 'CAPTION', 'TD', 'TH']);

/** Walk an HTML tree into blocks, turning KaTeX into $TeX$ so equations survive. */
export function htmlToBlocks(root: ParentNode, startHeading: string[] = []): Block[] {
  for (const k of Array.from(root.querySelectorAll('.katex'))) {
    const tex = k.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
    const display = !!k.closest('.katex-display, .math-block');
    k.replaceWith(document.createTextNode(tex ? (display ? `\n$$${tex}$$\n` : `$${tex}$`) : ''));
  }
  for (const el of Array.from(root.querySelectorAll('script, style, svg, canvas, button, input, select, textarea, noscript, [aria-hidden="true"]'))) el.remove();

  const blocks: Block[] = [];
  let heading = [...startHeading];
  let anchor: string | undefined;
  const base = startHeading.length;
  const emit = (text: string, kind: Block['kind']) => {
    const t = clean(text);
    if (t) blocks.push({ text: t, heading: [...heading], kind, anchor });
  };
  const walk = (el: Element) => {
    const tag = el.tagName;
    const m = tag.match(/^H([1-6])$/);
    if (m) {
      const lvl = Number(m[1]);
      const text = clean(el.textContent ?? '');
      if (!text) return;
      // minor headings (column titles, card labels) stay inside their section
      if (lvl >= 4) {
        emit(`**${text}**`, 'p');
        return;
      }
      heading = [...heading.slice(0, base + Math.max(0, lvl - 2)), text];
      if (el.id) anchor = el.id;
      blocks.push({ text, heading: [...heading], kind: 'h', level: lvl, anchor });
      return;
    }
    // Manifold's definition boxes: keep the term and its meaning together
    if (el.classList.contains('def')) {
      const term = clean(el.querySelector('.def__term')?.textContent ?? '');
      const body = clean(el.querySelector('.def__body')?.textContent ?? '');
      if (term || body) emit(term ? `**${term}**: ${body}` : body, 'p');
      return;
    }
    if (tag === 'TABLE') {
      const rows = Array.from(el.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.children)
          .map((c) => clean(c.textContent ?? ''))
          .join(' | '),
      );
      emit(rows.join('\n'), 'table');
      return;
    }
    if (tag === 'PRE') {
      const t = (el.textContent ?? '').trim();
      if (t) blocks.push({ text: t, heading: [...heading], kind: 'code', anchor });
      return;
    }
    if (BLOCK_TAGS.has(tag)) {
      // a block that itself contains blocks (li > p) is walked instead
      if (Array.from(el.children).some((c) => BLOCK_TAGS.has(c.tagName) || c.tagName === 'UL' || c.tagName === 'OL' || c.tagName === 'TABLE')) {
        let own = '';
        for (const n of Array.from(el.childNodes)) {
          if (n.nodeType === Node.TEXT_NODE) own += n.textContent;
          else if (n instanceof Element && !BLOCK_TAGS.has(n.tagName) && !['UL', 'OL', 'TABLE', 'PRE'].includes(n.tagName)) own += n.textContent;
        }
        emit(own, tag === 'LI' ? 'li' : 'p');
        for (const c of Array.from(el.children)) if (BLOCK_TAGS.has(c.tagName) || ['UL', 'OL', 'TABLE', 'PRE'].includes(c.tagName)) walk(c);
        return;
      }
      emit(el.textContent ?? '', tag === 'LI' ? 'li' : 'p');
      return;
    }
    // generic containers: gather loose text into a paragraph, recurse into elements
    let loose = '';
    for (const n of Array.from(el.childNodes)) {
      if (n.nodeType === Node.TEXT_NODE) loose += n.textContent;
      else if (n instanceof Element) {
        const inline = /^(A|SPAN|STRONG|EM|B|I|CODE|SUB|SUP|MARK|ABBR|KBD|SMALL|U|S|Q|CITE|TIME|VAR)$/.test(n.tagName);
        if (inline) loose += n.textContent;
        else {
          emit(loose, 'p');
          loose = '';
          walk(n);
        }
      }
    }
    emit(loose, 'p');
  };
  for (const c of Array.from((root as Element).children ?? [])) walk(c);
  return blocks;
}

export function parseHtml(src: string, title: string): ParsedDoc {
  const doc = new DOMParser().parseFromString(src, 'text/html');
  const t = doc.querySelector('title')?.textContent?.trim();
  for (const el of Array.from(doc.querySelectorAll('nav, header, footer, aside'))) el.remove();
  return { title: t || title, blocks: htmlToBlocks(doc.body) };
}

export function parseNotebook(src: string, title: string): ParsedDoc {
  const nb = JSON.parse(src) as { cells?: { cell_type: string; source: string | string[] }[] };
  const parts: string[] = [];
  for (const c of nb.cells ?? []) {
    const s = Array.isArray(c.source) ? c.source.join('') : c.source;
    parts.push(c.cell_type === 'code' ? '```python\n' + s + '\n```' : s);
  }
  return parseMarkdown(parts.join('\n\n'), title);
}
