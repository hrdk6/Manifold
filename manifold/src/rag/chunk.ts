/**
 * Structure-aware chunking. Blocks are packed into passages of roughly `target`
 * characters without crossing a section boundary (unless the section is tiny, as on
 * slides), long paragraphs are split at sentence ends, and consecutive passages in
 * a section share a sentence of overlap so an idea cut in two is still findable.
 */
import type { Block, ChunkRecord } from './types';

export interface ChunkOptions {
  target?: number;
  max?: number;
  overlap?: number;
  /** in-app route prefix for built-in lessons */
  route?: string;
}

const ABBREV = /\b(e\.g|i\.e|etc|vs|fig|eq|no|approx|resp|cf|al|dr|prof|mr|ms)\.$/i;

export function sentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z0-9(“"'$\\])/);
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && ABBREV.test(out[out.length - 1])) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out;
}

function format(b: Block) {
  switch (b.kind) {
    case 'h':
      return `${'#'.repeat(Math.min(4, (b.level ?? 1) + 1))} ${b.text}`;
    case 'li':
      return `- ${b.text}`;
    case 'code':
      return '```\n' + b.text + '\n```';
    default:
      return b.text;
  }
}

export function chunkBlocks(docId: string, blocks: Block[], opts: ChunkOptions = {}): ChunkRecord[] {
  const target = opts.target ?? 1000;
  const max = opts.max ?? 1500;
  const overlap = opts.overlap ?? 180;
  const out: ChunkRecord[] = [];

  let lines: string[] = [];
  let len = 0;
  let body = 0; // characters that are not headings or overlap
  let heading: string[] = [];
  let pageStart: number | undefined;
  let pageEnd: number | undefined;
  let anchor: string | undefined;
  let sectionKey = '';

  const flush = (carry: boolean) => {
    if (!lines.length || body === 0) {
      lines = [];
      len = 0;
      body = 0;
      return;
    }
    const text = lines.join('\n').trim();
    out.push({
      id: `${docId}#${out.length}`,
      docId,
      i: out.length,
      text,
      heading,
      pageStart,
      pageEnd,
      route: opts.route ? (anchor ? `${opts.route}#${anchor}` : opts.route) : undefined,
    });
    let tail = '';
    if (carry && overlap > 0) {
      const last = lines[lines.length - 1];
      if (!last.startsWith('#') && !last.startsWith('```')) {
        const ss = sentences(last.replace(/^- /, ''));
        for (let i = ss.length - 1; i >= 0; i--) {
          const next = ss[i] + (tail ? ' ' + tail : '');
          if (next.length > overlap && tail) break;
          tail = next;
          if (tail.length > overlap) break;
        }
        if (tail.length > overlap * 2) tail = '';
      }
    }
    lines = tail ? [`…${tail}`] : [];
    len = tail.length;
    body = 0;
    pageStart = pageEnd;
  };

  const add = (line: string, b: Block, isBody: boolean) => {
    if (!lines.length || body === 0) {
      heading = b.heading;
      anchor = b.anchor;
      pageStart = b.page;
    }
    lines.push(line);
    len += line.length + 1;
    if (isBody) body += line.length;
    pageEnd = b.page ?? pageEnd;
  };

  for (const b of blocks) {
    const key = b.heading.join('\u0001');
    if (b.kind === 'h') {
      // a new section starts a new passage unless the current one is still small
      if (body > 0 && (len >= target * 0.45 || b.page !== pageEnd)) flush(false);
      else if (body > 0 && key !== sectionKey && len >= 300) flush(false);
      else if (body === 0) {
        // drop an overlap carried over from the previous section
        lines = lines.filter((l) => !l.startsWith('…'));
        len = lines.reduce((s, l) => s + l.length + 1, 0);
      }
      sectionKey = key;
      add(format(b), b, false);
      continue;
    }
    if (key !== sectionKey) sectionKey = key;
    const line = format(b);
    if (line.length <= max) {
      if (len + line.length > target && body > 0) flush(true);
      add(line, b, true);
      continue;
    }
    // long block: split at sentence ends into pieces of about `target`
    const prefix = b.kind === 'li' ? '- ' : '';
    const pieces: string[] = [];
    let piece = '';
    for (const s of sentences(b.text)) {
      if (piece && piece.length + s.length + 1 > target) {
        pieces.push(piece);
        piece = '';
      }
      piece = piece ? `${piece} ${s}` : s;
      while (piece.length > max) {
        pieces.push(piece.slice(0, target));
        piece = piece.slice(target);
      }
    }
    if (piece) pieces.push(piece);
    for (const p of pieces) {
      const l = prefix + p;
      if (len + l.length > target && body > 0) flush(true);
      add(l, b, true);
    }
  }
  flush(false);
  return out;
}

/** Text used for search: document title and section path give every passage its context. */
export function contextualText(title: string, c: ChunkRecord) {
  const path = [title, ...c.heading.filter((h) => h !== title)].join(' › ');
  return `${path}\n${c.text}`;
}
