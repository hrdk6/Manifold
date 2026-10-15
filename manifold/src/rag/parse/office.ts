/** Word (.docx) and PowerPoint (.pptx) readers built on the files' own XML. */
import JSZip from 'jszip';
import type { Block, ParsedDoc } from '../types';
import { clean } from '../util';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';

const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');

function coreTitle(core: string | undefined) {
  if (!core) return '';
  const t = xml(core).getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title')[0]?.textContent?.trim();
  return t && t.length > 2 ? t : '';
}

/* ------------------------------------------------------------------ docx */

function runText(p: Element) {
  let out = '';
  const walk = (el: Element) => {
    for (const c of Array.from(el.children)) {
      if (c.namespaceURI !== W) {
        // equations (m:oMath) and other inline content: take their visible text
        if (c.localName === 'oMath' || c.localName === 'oMathPara') out += ` ${c.textContent ?? ''} `;
        else walk(c);
        continue;
      }
      if (c.localName === 't') out += c.textContent ?? '';
      else if (c.localName === 'tab') out += '\t';
      else if (c.localName === 'br' || c.localName === 'cr') out += '\n';
      else if (c.localName === 'pPr' || c.localName === 'rPr') continue;
      else walk(c);
    }
  };
  walk(p);
  return out;
}

function headingLevel(p: Element, styles: Map<string, string>): number {
  const ps = p.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val') ?? '';
  const name = (styles.get(ps) ?? ps).toLowerCase().replace(/\s+/g, '');
  if (name === 'title') return 1;
  const m = name.match(/^heading(\d)/);
  if (m) return Math.min(4, Number(m[1]));
  const ol = p.getElementsByTagNameNS(W, 'outlineLvl')[0]?.getAttributeNS(W, 'val');
  return ol !== undefined && ol !== null ? Number(ol) + 1 : 0;
}

export async function parseDocx(data: ArrayBuffer, title: string): Promise<ParsedDoc> {
  const zip = await JSZip.loadAsync(data);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('This file is not a Word document (word/document.xml is missing).');
  const stylesXml = await zip.file('word/styles.xml')?.async('string');
  const styles = new Map<string, string>();
  if (stylesXml) {
    for (const s of Array.from(xml(stylesXml).getElementsByTagNameNS(W, 'style'))) {
      const id = s.getAttributeNS(W, 'styleId');
      const name = s.getElementsByTagNameNS(W, 'name')[0]?.getAttributeNS(W, 'val');
      if (id && name) styles.set(id, name);
    }
  }
  const body = xml(docXml).getElementsByTagNameNS(W, 'body')[0];
  const blocks: Block[] = [];
  let heading: string[] = [];
  let levels: number[] = [];

  const addPara = (p: Element) => {
    const text = clean(runText(p));
    if (!text) return;
    const lvl = headingLevel(p, styles);
    if (lvl > 0 && text.length < 160) {
      while (levels.length && levels[levels.length - 1] >= lvl) {
        levels.pop();
        heading.pop();
      }
      heading = [...heading, text];
      levels = [...levels, lvl];
      blocks.push({ text, heading: [...heading], kind: 'h', level: lvl });
      return;
    }
    const isList = p.getElementsByTagNameNS(W, 'numPr').length > 0;
    blocks.push({ text, heading: [...heading], kind: isList ? 'li' : 'p' });
  };

  for (const el of Array.from(body?.children ?? [])) {
    if (el.localName === 'p') addPara(el);
    else if (el.localName === 'tbl') {
      const rows = Array.from(el.getElementsByTagNameNS(W, 'tr')).map((tr) =>
        Array.from(tr.getElementsByTagNameNS(W, 'tc'))
          .map((tc) => clean(Array.from(tc.getElementsByTagNameNS(W, 'p')).map(runText).join(' ')))
          .join(' | '),
      );
      const text = rows.filter(Boolean).join('\n');
      if (text) blocks.push({ text, heading: [...heading], kind: 'table' });
    } else if (el.localName === 'sdt') {
      for (const p of Array.from(el.getElementsByTagNameNS(W, 'p'))) addPara(p);
    }
  }
  const t = coreTitle(await zip.file('docProps/core.xml')?.async('string'));
  return { title: t || title, blocks };
}

/* ------------------------------------------------------------------ pptx */

function paragraphs(root: Element) {
  return Array.from(root.getElementsByTagNameNS(A, 'p'))
    .map((p) =>
      clean(
        Array.from(p.getElementsByTagNameNS(A, 't'))
          .map((t) => t.textContent ?? '')
          .join(''),
      ),
    )
    .filter(Boolean);
}

export async function parsePptx(data: ArrayBuffer, title: string): Promise<ParsedDoc> {
  const zip = await JSZip.loadAsync(data);
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  if (!slideFiles.length) throw new Error('No slides found in this PowerPoint file.');
  // Slide order comes from presentation.xml when available.
  let order = slideFiles;
  const pres = await zip.file('ppt/presentation.xml')?.async('string');
  const presRels = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string');
  if (pres && presRels) {
    const rels = new Map<string, string>();
    for (const r of Array.from(xml(presRels).getElementsByTagName('Relationship'))) rels.set(r.getAttribute('Id')!, r.getAttribute('Target')!);
    const ids = Array.from(xml(pres).getElementsByTagNameNS(P, 'sldId')).map((s) =>
      s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'),
    );
    const ordered = ids.map((id) => (id ? rels.get(id) : undefined)).filter(Boolean).map((t) => `ppt/${t!.replace(/^\.?\/?/, '')}`);
    if (ordered.length && ordered.every((f) => zip.file(f))) order = ordered;
  }

  const blocks: Block[] = [];
  for (let i = 0; i < order.length; i++) {
    const page = i + 1;
    const doc = xml(await zip.file(order[i])!.async('string'));
    let slideTitle = '';
    const body: string[] = [];
    for (const sp of Array.from(doc.getElementsByTagNameNS(P, 'sp'))) {
      const ph = sp.getElementsByTagNameNS(P, 'ph')[0];
      const type = ph?.getAttribute('type') ?? '';
      const paras = paragraphs(sp);
      if (!paras.length) continue;
      if (!slideTitle && (type === 'title' || type === 'ctrTitle')) slideTitle = paras.join(' ');
      else if (type !== 'sldNum' && type !== 'dt' && type !== 'ftr') body.push(...paras);
    }
    // tables on slides
    for (const tbl of Array.from(doc.getElementsByTagNameNS(A, 'tbl'))) {
      const rows = Array.from(tbl.getElementsByTagNameNS(A, 'tr')).map((tr) =>
        Array.from(tr.getElementsByTagNameNS(A, 'tc'))
          .map((tc) => paragraphs(tc).join(' '))
          .join(' | '),
      );
      body.push(rows.join('\n'));
    }
    const head = slideTitle || `Slide ${page}`;
    blocks.push({ text: head, page, heading: [head], kind: 'h', level: 1 });
    for (const b of body) blocks.push({ text: b, page, heading: [head], kind: b.includes('\n') ? 'table' : 'li' });

    // speaker notes
    const relPath = order[i].replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels');
    const rel = await zip.file(relPath)?.async('string');
    const notesTarget = rel
      ? Array.from(xml(rel).getElementsByTagName('Relationship'))
          .find((r) => /notesSlide/.test(r.getAttribute('Type') ?? ''))
          ?.getAttribute('Target')
      : undefined;
    if (notesTarget) {
      const notesPath = `ppt/${notesTarget.replace(/^\.\.\//, '')}`;
      const nx = await zip.file(notesPath)?.async('string');
      if (nx) {
        const nd = xml(nx);
        const notes: string[] = [];
        for (const sp of Array.from(nd.getElementsByTagNameNS(P, 'sp'))) {
          const type = sp.getElementsByTagNameNS(P, 'ph')[0]?.getAttribute('type');
          if (type === 'body') notes.push(...paragraphs(sp));
        }
        const text = notes.join(' ');
        if (text.length > 20) blocks.push({ text: `Speaker notes: ${text}`, page, heading: [head], kind: 'p' });
      }
    }
  }
  const t = coreTitle(await zip.file('docProps/core.xml')?.async('string'));
  return { title: t || title, blocks, pages: order.length };
}
