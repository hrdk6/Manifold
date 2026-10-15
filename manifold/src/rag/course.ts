/**
 * Turns Manifold's own lessons, question bank, SEE paper, formula sheet and flashcards
 * into documents for the knowledge base. Lessons are rendered to static HTML (figures
 * stripped, KaTeX turned back into TeX) so passages keep their equations and headings.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { allLessons, modules } from '../content/course';
import { flashcards } from '../content/flashcards';
import { formulaGroups } from '../content/formulas';
import { questions, seePaper } from '../content/questions';
import { htmlToBlocks } from './parse/text';
import type { Block, DocRecord } from './types';

export interface BuiltinDoc {
  doc: Omit<DocRecord, 'chunks' | 'chars' | 'addedAt' | 'status' | 'enabled'>;
  blocks: Block[];
}

const STRIP = [
  'figure',
  '.figure',
  '.sorter',
  '.quiz',
  '.stepper',
  '.code__bar',
  '.lesson-pager',
  '.pager',
  '.controls',
  '.legend',
].join(',');

async function lessonDocs(onProgress?: (done: number, total: number) => void): Promise<BuiltinDoc[]> {
  const out: BuiltinDoc[] = [];
  for (let i = 0; i < allLessons.length; i++) {
    const l = allLessons[i];
    const route = `/m/${l.module}/${l.id}`;
    try {
      const mod = await l.load();
      const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(mod.default)));
      const root = new DOMParser().parseFromString(`<div id="r">${html}</div>`, 'text/html').getElementById('r')!;
      for (const el of Array.from(root.querySelectorAll(STRIP))) el.remove();
      const blocks: Block[] = [{ text: l.summary, heading: [], kind: 'p' }, ...htmlToBlocks(root)];
      const m = modules[l.module - 1];
      out.push({
        doc: { id: `lesson:${l.module}/${l.id}`, title: l.title, kind: 'lesson', builtin: true, route, module: l.module, fileName: `Module ${l.module}: ${m.title}` },
        blocks,
      });
    } catch (err) {
      console.warn(`Skipped lesson ${route} while indexing`, err);
    }
    onProgress?.(i + 1, allLessons.length);
    // let the page breathe between lessons
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}

function bankDocs(): BuiltinDoc[] {
  const qBlocks: Block[] = [];
  for (const m of modules) {
    const head = [`Module ${m.n}: ${m.title}`];
    qBlocks.push({ text: head[0], heading: head, kind: 'h', level: 1 });
    for (const q of questions.filter((x) => x.module === m.n)) {
      const tags = [q.kind === 'numerical' ? 'numerical' : 'theory', q.see].filter(Boolean).join(', ');
      qBlocks.push({ text: `M${m.n} Q${q.n} (${tags}): ${q.text}`, heading: head, kind: 'li' });
    }
  }
  const seeBlocks: Block[] = seePaper.map((q) => ({
    text: `Q${q.q} (${q.marks} marks, Module ${q.module}): ${q.text}`,
    heading: [`Module ${q.module}`],
    kind: 'li' as const,
  }));
  const fBlocks: Block[] = [];
  for (const g of formulaGroups) {
    const head = [`Module ${g.module}: ${g.title}`];
    fBlocks.push({ text: head[0], heading: head, kind: 'h', level: 1 });
    for (const f of g.items) fBlocks.push({ text: `${f.name}: $${f.tex}$${f.note ? ` (${f.note})` : ''}`, heading: head, kind: 'li' });
  }
  const cBlocks: Block[] = [];
  for (const m of modules) {
    const head = [`Module ${m.n}: ${m.title}`];
    cBlocks.push({ text: head[0], heading: head, kind: 'h', level: 1 });
    for (const c of flashcards.filter((x) => x.module === m.n)) cBlocks.push({ text: `${c.term}: ${c.def}`, heading: head, kind: 'li' });
  }
  return [
    { doc: { id: 'bank:questions', title: 'Question bank', kind: 'bank', builtin: true, route: '/questions', fileName: 'BAI503 question bank' }, blocks: qBlocks },
    { doc: { id: 'bank:see', title: 'SEE February 2025 paper', kind: 'bank', builtin: true, route: '/questions', fileName: 'Semester-end exam' }, blocks: seeBlocks },
    { doc: { id: 'bank:formulas', title: 'Formula sheet', kind: 'bank', builtin: true, route: '/formulas', fileName: 'All modules' }, blocks: fBlocks },
    { doc: { id: 'bank:flashcards', title: 'Flashcard definitions', kind: 'bank', builtin: true, route: '/flashcards', fileName: 'All modules' }, blocks: cBlocks },
  ];
}

export async function buildCourseDocs(onProgress?: (done: number, total: number) => void) {
  return [...(await lessonDocs(onProgress)), ...bankDocs()];
}
