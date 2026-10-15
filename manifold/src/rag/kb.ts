/**
 * The knowledge base: documents, their passages and vectors, held in memory for
 * search and mirrored to IndexedDB. Uploads are parsed and chunked straight away
 * (keyword search works at once); a background loop then embeds passages for
 * semantic search, a small batch at a time so questions never wait long.
 */
import { useSyncExternalStore } from 'react';
import { Bm25 } from './bm25';
import { chunkBlocks, contextualText } from './chunk';
import * as db from './db';
import { embedTexts, loadEmbedder } from './embedder';
import { EMBED_MODEL } from './models';
import { parseHtml, parseMarkdown, parseNotebook, parsePlain } from './parse/text';
import { settings } from './settings';
import type { Block, ChunkRecord, DocRecord } from './types';
import { fnv, kindOf, titleFromFile, uid } from './util';

declare const __CONTENT_VERSION__: string;
const CONTENT_KEY = 'manifold-kb-content';
/** Bump when the file readers or chunker change, so uploads are re-read. */
const PARSER_VERSION = 2;

export interface Job {
  kind: 'course' | 'embed';
  label: string;
  done: number;
  total: number;
}

export interface KbState {
  ready: boolean;
  docs: DocRecord[];
  chunks: number;
  embedded: number;
  /** per-document count of embedded passages */
  coverage: Record<string, number>;
  job: Job | null;
  version: number;
  semanticError?: string;
}

const mem = {
  docs: new Map<string, DocRecord>(),
  chunks: [] as ChunkRecord[],
  byId: new Map<string, ChunkRecord>(),
  bm25: null as Bm25 | null,
  bm25Version: -1,
};

let state: KbState = { ready: false, docs: [], chunks: 0, embedded: 0, coverage: {}, job: null, version: 0 };
const subs = new Set<() => void>();

function order(a: DocRecord, b: DocRecord) {
  if (!!a.builtin !== !!b.builtin) return a.builtin ? 1 : -1;
  if (a.builtin && b.builtin) return (a.module ?? 9) - (b.module ?? 9) || a.id.localeCompare(b.id);
  return b.addedAt - a.addedAt;
}

function emit(patch: Partial<KbState> = {}, changedIndex = false) {
  const coverage: Record<string, number> = {};
  let embedded = 0;
  for (const c of mem.chunks) {
    if (c.vec) {
      embedded++;
      coverage[c.docId] = (coverage[c.docId] ?? 0) + 1;
    }
  }
  state = {
    ...state,
    ...patch,
    docs: [...mem.docs.values()].sort(order),
    chunks: mem.chunks.length,
    embedded,
    coverage,
    version: changedIndex ? state.version + 1 : state.version,
  };
  subs.forEach((f) => f());
}

export function useKb() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => state,
  );
}
export const kbState = () => state;

function setChunks(docId: string, chunks: ChunkRecord[]) {
  for (const c of mem.chunks) if (c.docId === docId) mem.byId.delete(c.id);
  mem.chunks = mem.chunks.filter((c) => c.docId !== docId).concat(chunks);
  for (const c of chunks) mem.byId.set(c.id, c);
}

async function saveDoc(d: DocRecord) {
  mem.docs.set(d.id, d);
  await db.put('docs', d);
}

/* ------------------------------------------------------------------ init */

let initP: Promise<void> | null = null;
export function initKb() {
  if (!initP) {
    initP = (async () => {
      const [docs, chunks] = await Promise.all([db.getAll('docs'), db.getAll('chunks')]);
      for (const d of docs) mem.docs.set(d.id, d);
      mem.chunks = chunks.sort((a, b) => (a.docId === b.docId ? a.i - b.i : a.docId < b.docId ? -1 : 1));
      for (const c of mem.chunks) {
        // vectors from a different model are not comparable
        if (c.vec && mem.docs.get(c.docId)?.embedModel && mem.docs.get(c.docId)?.embedModel !== EMBED_MODEL) c.vec = undefined;
        mem.byId.set(c.id, c);
      }
      emit({ ready: true }, true);
      // finish uploads interrupted by a closed tab
      for (const d of mem.docs.values()) {
        if (!d.builtin && (d.status === 'queued' || d.status === 'reading' || (d.status === 'ready' && d.parser !== PARSER_VERSION))) enqueue(d.id);
      }
      await syncCourse();
      runEmbedding();
    })().catch((err) => {
      console.error(err);
      emit({ ready: true, semanticError: 'The knowledge base could not be opened in this browser.' });
    });
  }
  return initP;
}

/** Index the built-in lessons when the app's content has changed. */
export async function syncCourse(force = false) {
  const have = [...mem.docs.values()].filter((d) => d.builtin);
  let stored = '';
  try {
    stored = localStorage.getItem(CONTENT_KEY) ?? '';
  } catch {
    /* storage unavailable */
  }
  if (!force && stored === __CONTENT_VERSION__ && have.length > 0) return;
  emit({ job: { kind: 'course', label: 'Reading the Manifold lessons', done: 0, total: 1 } });
  const { buildCourseDocs } = await import('./course');
  const built = await buildCourseDocs((done, total) => emit({ job: { kind: 'course', label: 'Reading the Manifold lessons', done, total } }));
  const keep = new Set<string>();
  for (const { doc, blocks } of built) {
    keep.add(doc.id);
    const text = blocks.map((b) => b.text).join('\n');
    const hash = fnv(text);
    const prev = mem.docs.get(doc.id);
    if (prev && prev.hash === hash && !force) continue;
    const chunks = chunkBlocks(doc.id, blocks, { route: doc.route });
    const rec: DocRecord = {
      ...doc,
      chunks: chunks.length,
      chars: text.length,
      addedAt: prev?.addedAt ?? Date.now(),
      status: 'ready',
      enabled: prev?.enabled ?? true,
      hash,
      embedModel: EMBED_MODEL,
    };
    setChunks(doc.id, chunks);
    await db.replaceChunks(doc.id, chunks);
    await saveDoc(rec);
  }
  for (const d of have) {
    if (!keep.has(d.id)) {
      mem.docs.delete(d.id);
      setChunks(d.id, []);
      await db.removeDoc(d.id);
    }
  }
  try {
    localStorage.setItem(CONTENT_KEY, __CONTENT_VERSION__);
  } catch {
    /* storage unavailable */
  }
  emit({ job: null }, true);
}

/* ------------------------------------------------------------------ uploads */

const queue: string[] = [];
let processing = false;

function enqueue(id: string) {
  if (!queue.includes(id)) queue.push(id);
  void drain();
}

async function drain() {
  if (processing) return;
  processing = true;
  try {
    while (queue.length) {
      const id = queue.shift()!;
      if (mem.docs.has(id)) await processDoc(id);
    }
  } finally {
    processing = false;
  }
  runEmbedding();
}

export interface AddResult {
  added: number;
  rejected: string[];
  duplicates: string[];
}

export async function addFiles(files: File[]): Promise<AddResult> {
  await initKb();
  const rejected: string[] = [];
  const duplicates: string[] = [];
  let added = 0;
  for (const file of files) {
    const kind = kindOf(file);
    if (!kind) {
      rejected.push(file.name);
      continue;
    }
    if ([...mem.docs.values()].some((d) => !d.builtin && d.fileName === file.name && d.size === file.size)) {
      duplicates.push(file.name);
      continue;
    }
    const doc: DocRecord = {
      id: uid('d'),
      title: titleFromFile(file.name),
      kind,
      fileName: file.name,
      mime: file.type,
      size: file.size,
      chunks: 0,
      chars: 0,
      addedAt: Date.now() + added,
      status: 'queued',
      enabled: true,
    };
    await db.put('files', { id: doc.id, blob: file });
    await saveDoc(doc);
    added++;
    enqueue(doc.id);
  }
  emit();
  return { added, rejected, duplicates };
}

async function parseBlob(doc: DocRecord, blob: Blob, onProgress: (p: number) => void) {
  const title = doc.title;
  const name = (doc.fileName ?? '').toLowerCase();
  switch (doc.kind) {
    case 'pdf': {
      const { parsePdf } = await import('./parse/pdf');
      const r = await parsePdf(await blob.arrayBuffer(), title, onProgress);
      return { blocks: r.blocks, pages: r.pages, scanned: r.scanned, pageTexts: r.pageTexts };
    }
    case 'docx': {
      const { parseDocx } = await import('./parse/office');
      const r = await parseDocx(await blob.arrayBuffer(), title);
      return { blocks: r.blocks, pageTexts: [r.blocks.map((b) => b.text).join('\n')] };
    }
    case 'pptx': {
      const { parsePptx } = await import('./parse/office');
      const r = await parsePptx(await blob.arrayBuffer(), title);
      const pageTexts: string[] = [];
      for (const b of r.blocks) pageTexts[(b.page ?? 1) - 1] = [pageTexts[(b.page ?? 1) - 1], b.text].filter(Boolean).join('\n');
      return { blocks: r.blocks, pages: r.pages, pageTexts };
    }
    case 'image':
      return { blocks: [] as Block[], pages: 1, scanned: [1], pageTexts: [''] };
    default: {
      const text = await blob.text();
      const r = name.endsWith('.ipynb')
        ? parseNotebook(text, title)
        : doc.kind === 'markdown'
          ? parseMarkdown(text, title)
          : doc.kind === 'html'
            ? parseHtml(text, title)
            : parsePlain(text, title);
      return { blocks: r.blocks, pageTexts: [r.blocks.map((b) => b.text).join('\n')] };
    }
  }
}

/** Blocks for vision transcriptions, slotted in at their page. */
function ocrBlocks(ocr: Record<number, string> | undefined): Block[] {
  if (!ocr) return [];
  const out: Block[] = [];
  for (const [p, text] of Object.entries(ocr)) {
    const page = Number(p);
    for (const b of parseMarkdown(text, '').blocks) out.push({ ...b, page });
  }
  return out;
}

async function processDoc(id: string) {
  let doc = mem.docs.get(id)!;
  const update = async (patch: Partial<DocRecord>) => {
    const cur = mem.docs.get(id);
    if (!cur) return; // deleted meanwhile
    doc = { ...cur, ...patch };
    await saveDoc(doc);
    emit();
  };
  try {
    await update({ status: 'reading', progress: 0, error: undefined });
    const file = await db.get('files', id);
    if (!file) throw new Error('The original file is missing; remove this document and upload it again.');
    let lastEmit = 0;
    const parsed = await parseBlob(doc, file.blob, (p) => {
      const now = performance.now();
      if (now - lastEmit > 120) {
        lastEmit = now;
        const cur = mem.docs.get(id);
        if (cur) {
          mem.docs.set(id, { ...cur, progress: p });
          emit();
        }
      }
    });
    if (!mem.docs.has(id)) return;
    const texts = await db.get('texts', id);
    const blocks = [...parsed.blocks, ...ocrBlocks(texts?.ocr)].map((b, i) => ({ b, i }));
    blocks.sort((x, y) => (x.b.page ?? 0) - (y.b.page ?? 0) || x.i - y.i);
    const chunks = chunkBlocks(id, blocks.map((x) => x.b));
    await db.put('texts', { id, pages: parsed.pageTexts, ocr: texts?.ocr });
    setChunks(id, chunks);
    await db.replaceChunks(id, chunks);
    const chars = chunks.reduce((s, c) => s + c.text.length, 0);
    const transcribed = Object.keys(texts?.ocr ?? {}).map(Number);
    await update({
      status: 'ready',
      progress: undefined,
      pages: parsed.pages,
      scanned: parsed.scanned,
      transcribed,
      chunks: chunks.length,
      chars,
      embedModel: EMBED_MODEL,
      parser: PARSER_VERSION,
      error:
        !chunks.length && !(parsed.scanned?.length ?? 0)
          ? 'No readable text was found in this file.'
          : undefined,
    });
    emit({}, true);
  } catch (err) {
    console.error(err);
    await update({ status: 'error', progress: undefined, error: err instanceof Error ? err.message : String(err) });
  }
}

/** Re-read a document (after transcribing pages). */
export function reprocess(id: string) {
  enqueue(id);
}

export async function deleteDoc(id: string) {
  mem.docs.delete(id);
  setChunks(id, []);
  await db.removeDoc(id);
  emit({}, true);
}

export async function setDocEnabled(id: string, enabled: boolean) {
  const d = mem.docs.get(id);
  if (!d) return;
  await saveDoc({ ...d, enabled });
  emit({}, true);
}

export async function setBuiltinsEnabled(enabled: boolean) {
  for (const d of [...mem.docs.values()]) if (d.builtin && d.enabled !== enabled) await saveDoc({ ...d, enabled });
  emit({}, true);
}

export async function removeUploads() {
  for (const d of [...mem.docs.values()]) if (!d.builtin) await deleteDoc(d.id);
}

/* ------------------------------------------------------------------ embeddings */

let embedding = false;

/** Embed every passage that has no vector yet; uploads before built-in lessons. */
export function runEmbedding() {
  if (embedding || !settings.get().dense) return;
  embedding = true;
  void (async () => {
    try {
      for (;;) {
        if (!settings.get().dense) break;
        const todo = mem.chunks.filter((c) => !c.vec && mem.docs.get(c.docId));
        if (!todo.length) break;
        todo.sort((a, b) => Number(!!mem.docs.get(a.docId)?.builtin) - Number(!!mem.docs.get(b.docId)?.builtin));
        const total = mem.chunks.length;
        const done = total - todo.length;
        emit({ job: { kind: 'embed', label: 'Building the semantic index', done, total } });
        try {
          await loadEmbedder();
        } catch (err) {
          emit({ job: null, semanticError: err instanceof Error ? err.message : String(err) });
          break;
        }
        const batch = todo.slice(0, 16);
        const vecs = await embedTexts(batch.map((c) => contextualText(mem.docs.get(c.docId)?.title ?? '', c)));
        const live = batch.filter((c, i) => {
          c.vec = vecs[i];
          return mem.byId.get(c.id) === c;
        });
        await db.putMany('chunks', live);
        emit({ semanticError: undefined });
      }
    } catch (err) {
      console.error(err);
      emit({ semanticError: err instanceof Error ? err.message : String(err) });
    } finally {
      embedding = false;
      emit({ job: state.job?.kind === 'embed' ? null : state.job }, true);
    }
  })();
}

/* ------------------------------------------------------------------ access for search */

export function getIndex() {
  if (!mem.bm25 || mem.bm25Version !== state.version) {
    mem.bm25 = new Bm25(mem.chunks.map((c) => contextualText(mem.docs.get(c.docId)?.title ?? '', c)));
    mem.bm25Version = state.version;
  }
  return { chunks: mem.chunks, bm25: mem.bm25, docs: mem.docs, byId: mem.byId };
}

export function getDoc(id: string) {
  return mem.docs.get(id);
}

export function docChunks(id: string) {
  return mem.chunks.filter((c) => c.docId === id).sort((a, b) => a.i - b.i);
}

/* ------------------------------------------------------------------ knowledge map */

export interface MapData {
  points: { x: number; y: number; idx: number }[];
  mean: Float32Array;
  pcs: [Float32Array, Float32Array];
  version: number;
}

let mapCache: MapData | null = null;

/** Project every embedded passage onto its first two principal components. */
export function getMap(): MapData | null {
  if (mapCache && mapCache.version === state.version + state.embedded * 1e-6) return mapCache;
  const idx: number[] = [];
  mem.chunks.forEach((c, i) => c.vec && idx.push(i));
  if (idx.length < 3) return null;
  const d = mem.chunks[idx[0]].vec!.length;
  const mean = new Float32Array(d);
  for (const i of idx) {
    const v = mem.chunks[i].vec!;
    for (let j = 0; j < d; j++) mean[j] += v[j] / idx.length;
  }
  const pcs: Float32Array[] = [];
  for (let comp = 0; comp < 2; comp++) {
    let w = new Float32Array(d).map((_, j) => Math.sin(j * 12.9898 + comp * 78.233) * 0.5);
    for (let it = 0; it < 60; it++) {
      const next = new Float32Array(d);
      for (const i of idx) {
        const v = mem.chunks[i].vec!;
        let dot = 0;
        for (let j = 0; j < d; j++) dot += (v[j] - mean[j]) * w[j];
        for (let j = 0; j < d; j++) next[j] += dot * (v[j] - mean[j]);
      }
      for (const p of pcs) {
        let dp = 0;
        for (let j = 0; j < d; j++) dp += next[j] * p[j];
        for (let j = 0; j < d; j++) next[j] -= dp * p[j];
      }
      let norm = 0;
      for (let j = 0; j < d; j++) norm += next[j] * next[j];
      norm = Math.sqrt(norm) || 1;
      for (let j = 0; j < d; j++) next[j] /= norm;
      w = next;
    }
    pcs.push(w);
  }
  const points = idx.map((i) => {
    const v = mem.chunks[i].vec!;
    let x = 0;
    let y = 0;
    for (let j = 0; j < d; j++) {
      x += (v[j] - mean[j]) * pcs[0][j];
      y += (v[j] - mean[j]) * pcs[1][j];
    }
    return { x, y, idx: i };
  });
  mapCache = { points, mean, pcs: [pcs[0], pcs[1]], version: state.version + state.embedded * 1e-6 };
  return mapCache;
}

export function project(map: MapData, v: Float32Array): [number, number] {
  let x = 0;
  let y = 0;
  for (let j = 0; j < v.length; j++) {
    x += (v[j] - map.mean[j]) * map.pcs[0][j];
    y += (v[j] - map.mean[j]) * map.pcs[1][j];
  }
  return [x, y];
}

// Development aid: inspect the live index from the browser console.
if (import.meta.env.DEV) (window as unknown as { __kb: unknown }).__kb = { state: () => state, docChunks, getIndex, initKb };
