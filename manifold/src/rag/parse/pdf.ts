import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Block, ParsedDoc } from '../types';
import { clean } from '../util';

GlobalWorkerOptions.workerSrc = workerUrl;

export function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  // pdf.js transfers the buffer to its worker, so hand it a copy
  return getDocument({ data: new Uint8Array(data.slice(0)), verbosity: 0 }).promise;
}

interface Line {
  text: string;
  size: number;
  y: number;
  gap: number;
}

const BULLET = /^([•▪●◦‣∙·○■□➢➤►▸\-–]|\d{1,2}[.)]|[a-z][.)]|\(?[ivx]{1,4}\)|o(?=\s+[A-Z]))\s+/i;
const GLYPH = /^([•▪●◦‣∙·○■□➢➤►▸–-]|o(?=\s+[A-Z]))\s*/;
/** "2.3 Fraud detection", "4.1.2 Choosing k": numbered section titles in lecture notes */
const NUMBERED = /^\d+(\.\d+){1,3}\.?\s+[A-Z][^.!?:;]{2,70}$/;

async function pageLines(pdf: PDFDocumentProxy, n: number): Promise<Line[]> {
  const page = await pdf.getPage(n);
  const tc = await page.getTextContent();
  const lines: Line[] = [];
  let cur: { parts: string[]; size: number; y: number; lastX: number } | null = null;
  let prevY = Infinity;
  const flush = () => {
    if (!cur) return;
    const text = cur.parts.join('').replace(/\s+/g, ' ').trim();
    if (text) {
      const gap = prevY === Infinity ? 0 : Math.abs(prevY - cur.y);
      lines.push({ text, size: cur.size, y: cur.y, gap });
      prevY = cur.y;
    }
    cur = null;
  };
  for (const raw of tc.items) {
    if (!('str' in raw)) continue;
    const it = raw as TextItem;
    const [, , c, d, x, y] = it.transform;
    const size = Math.hypot(c, d) || it.height || 10;
    if (cur && Math.abs(y - cur.y) > size * 0.45) flush();
    if (!cur) cur = { parts: [], size, y, lastX: x };
    // pdf.js drops many inter-word spaces; restore one when items are visibly apart
    const prev = cur.parts[cur.parts.length - 1];
    if (prev && !/\s$/.test(prev) && !/^\s/.test(it.str) && x - cur.lastX > size * 0.18) cur.parts.push(' ');
    cur.parts.push(it.str);
    cur.size = Math.max(cur.size, size);
    cur.lastX = x + (it.width || 0);
    if (it.hasEOL) flush();
  }
  flush();
  page.cleanup();
  return lines;
}

const norm = (s: string) => s.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();

export async function parsePdf(
  data: ArrayBuffer,
  title: string,
  onProgress?: (p: number) => void,
): Promise<ParsedDoc & { pageTexts: string[] }> {
  const pdf = await openPdf(data);
  const pages: Line[][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    pages.push(await pageLines(pdf, n));
    onProgress?.(n / pdf.numPages);
  }
  const meta = await pdf.getMetadata().catch(() => null);
  const metaTitle = (meta?.info as { Title?: string } | undefined)?.Title?.trim();
  await pdf.loadingTask.destroy();

  // Running headers and footers repeat on most pages: drop them.
  const freq = new Map<string, number>();
  for (const ls of pages) {
    const seen = new Set<string>();
    for (const l of [...ls.slice(0, 3), ...ls.slice(-3)]) {
      const k = norm(l.text);
      if (k.length < 90 && !seen.has(k)) {
        seen.add(k);
        freq.set(k, (freq.get(k) ?? 0) + 1);
      }
    }
  }
  const minRepeat = Math.max(3, Math.ceil(pages.length * 0.4));
  const isFurniture = (t: string) => /^(page\s*)?\d{1,4}(\s*(of|\/)\s*\d+)?$/i.test(t.trim()) || (pages.length >= 4 && (freq.get(norm(t)) ?? 0) >= minRepeat);

  // Body font size = the size covering the most characters.
  const sizeChars = new Map<number, number>();
  for (const ls of pages) for (const l of ls) sizeChars.set(Math.round(l.size), (sizeChars.get(Math.round(l.size)) ?? 0) + l.text.length);
  const body = [...sizeChars.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;

  const blocks: Block[] = [];
  const scanned: number[] = [];
  const pageTexts: string[] = [];
  let heading: string[] = [];
  let headingSize: number[] = [];

  pages.forEach((ls, pi) => {
    const page = pi + 1;
    const kept = ls.filter((l) => !isFurniture(l.text));
    const chars = kept.reduce((s, l) => s + l.text.length, 0);
    pageTexts.push(kept.map((l) => l.text).join('\n'));
    if (chars < 30) {
      scanned.push(page);
      return;
    }
    let para: string[] = [];
    let paraKind: Block['kind'] = 'p';
    const flush = () => {
      const text = clean(para.join(' ').replace(/-\s+(?=[a-z])/g, ''));
      if (text) blocks.push({ text, page, heading: [...heading], kind: paraKind });
      para = [];
      paraKind = 'p';
    };
    kept.forEach((l, li) => {
      const next = kept[li + 1];
      const wraps = !!next && /^[a-z(]/.test(next.text) && Math.abs(next.size - l.size) < 0.6 && next.gap < l.size * 1.6;
      const isHeading =
        !BULLET.test(l.text) &&
        !wraps &&
        /[A-Za-z]/.test(l.text) &&
        !/[.,;:]$/.test(l.text) &&
        ((l.size >= body * 1.18 && l.text.length <= 80) || (NUMBERED.test(l.text) && l.size >= body * 0.97));
      if (isHeading) {
        flush();
        // merge a heading that wraps onto a second line
        const prevBlock = blocks[blocks.length - 1];
        if (prevBlock?.kind === 'h' && prevBlock.page === page && li > 0 && Math.abs(kept[li - 1].size - l.size) < 0.6 && l.gap < l.size * 1.6) {
          prevBlock.text = `${prevBlock.text} ${l.text}`;
          heading[heading.length - 1] = prevBlock.text;
          return;
        }
        while (headingSize.length && headingSize[headingSize.length - 1] <= l.size + 0.5) {
          headingSize.pop();
          heading.pop();
        }
        heading = [...heading, l.text].slice(-3);
        headingSize = [...headingSize, l.size].slice(-3);
        blocks.push({ text: l.text, page, heading: [...heading], kind: 'h', level: heading.length });
        return;
      }
      const bullet = BULLET.test(l.text);
      const bigGap = l.gap > l.size * 1.75;
      if (para.length && (bullet || bigGap)) flush();
      if (bullet) paraKind = 'li';
      para.push(bullet ? l.text.replace(GLYPH, '') : l.text);
      if (/[.!?:]$/.test(l.text) && l.text.length < 60) flush();
    });
    flush();
  });

  return {
    title: metaTitle && metaTitle.length > 3 && !/^(untitled|microsoft|slide|presentation|document)\b/i.test(metaTitle) ? metaTitle : title,
    blocks,
    pages: pages.length,
    scanned,
    pageTexts,
  };
}

/** Render one page to a JPEG data URL (for transcription and the page viewer). */
export async function renderPdfPage(data: ArrayBuffer, n: number, width = 1400): Promise<{ url: string; w: number; h: number }> {
  const pdf = await openPdf(data);
  try {
    const page = await pdf.getPage(n);
    const v1 = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / v1.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return { url: canvas.toDataURL('image/jpeg', 0.86), w: canvas.width, h: canvas.height };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
