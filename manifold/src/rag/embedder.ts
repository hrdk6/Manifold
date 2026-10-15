/** Main-thread client for the embedding worker, with an observable status for the UI. */
import { useSyncExternalStore } from 'react';

export interface ModelStatus {
  state: 'idle' | 'loading' | 'ready' | 'error';
  device?: 'webgpu' | 'wasm';
  /** bytes downloaded / expected across model files */
  loaded: number;
  total: number;
  error?: string;
}

export interface EngineStatus {
  embed: ModelStatus;
  rerank: ModelStatus;
}

let status: EngineStatus = {
  embed: { state: 'idle', loaded: 0, total: 0 },
  rerank: { state: 'idle', loaded: 0, total: 0 },
};
const subs = new Set<() => void>();
const files: Record<'embed' | 'rerank', Map<string, { loaded: number; total: number }>> = { embed: new Map(), rerank: new Map() };

function set(model: 'embed' | 'rerank', patch: Partial<ModelStatus>) {
  status = { ...status, [model]: { ...status[model], ...patch } };
  subs.forEach((f) => f());
}

export function useEngineStatus() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => status,
    () => status,
  );
}
export const engineStatus = () => status;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; onProgress?: (done: number, total: number) => void }>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./embed.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data as {
      id?: number;
      type?: string;
      ok?: boolean;
      result?: unknown;
      error?: string;
      done?: number;
      total?: number;
      model?: 'embed' | 'rerank';
      file?: string;
      loaded?: number;
    };
    if (m.type === 'download' && m.model && m.file) {
      const map = files[m.model];
      const prev = map.get(m.file) ?? { loaded: 0, total: 0 };
      map.set(m.file, { loaded: Math.max(prev.loaded, m.loaded ?? 0), total: Math.max(prev.total, m.total ?? 0) });
      let loaded = 0;
      let total = 0;
      for (const v of map.values()) {
        loaded += v.loaded;
        total += v.total;
      }
      set(m.model, { loaded, total });
      return;
    }
    if (m.type === 'progress' && m.id !== undefined) {
      pending.get(m.id)?.onProgress?.(m.done ?? 0, m.total ?? 0);
      return;
    }
    if (m.id === undefined) return;
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.ok) p.resolve(m.result);
    else p.reject(new Error(m.error ?? 'The search model failed.'));
  };
  worker.onerror = (e) => {
    const err = new Error(e.message || 'The search model worker crashed.');
    for (const p of pending.values()) p.reject(err);
    pending.clear();
    set('embed', { state: 'error', error: err.message });
    worker = null;
  };
  return worker;
}

function call<T>(msg: Record<string, unknown>, onProgress?: (done: number, total: number) => void): Promise<T> {
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress });
    getWorker().postMessage({ ...msg, id });
  });
}

// The worker's model sessions are not re-entrant: run one job at a time, in order.
let chain: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

let embedReady: Promise<void> | null = null;
export function loadEmbedder() {
  if (!embedReady) {
    set('embed', { state: 'loading', error: undefined });
    embedReady = call<{ device: 'webgpu' | 'wasm' }>({ type: 'init' })
      .then((r) => set('embed', { state: 'ready', device: r.device }))
      .catch((err: Error) => {
        set('embed', { state: 'error', error: err.message });
        embedReady = null;
        throw err;
      });
  }
  return embedReady;
}

let rerankReady: Promise<void> | null = null;
export function loadReranker() {
  if (!rerankReady) {
    set('rerank', { state: 'loading', error: undefined });
    rerankReady = call<{ device: 'webgpu' | 'wasm' }>({ type: 'init-rerank' })
      .then((r) => set('rerank', { state: 'ready', device: r.device }))
      .catch((err: Error) => {
        set('rerank', { state: 'error', error: err.message });
        rerankReady = null;
        throw err;
      });
  }
  return rerankReady;
}

/** Embed passages (or a query) into unit vectors. */
export async function embedTexts(texts: string[], opts: { query?: boolean; onProgress?: (done: number, total: number) => void } = {}) {
  if (!texts.length) return [] as Float32Array[];
  await loadEmbedder();
  const r = await exclusive(() => call<{ vectors: Float32Array; dim: number }>({ type: 'embed', texts, query: !!opts.query }, opts.onProgress));
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i++) out.push(r.vectors.slice(i * r.dim, (i + 1) * r.dim));
  return out;
}

/** Cross-encoder relevance logits for (query, passage) pairs. */
export async function rerankPairs(query: string, passages: string[]) {
  if (!passages.length) return [] as number[];
  await loadReranker();
  return exclusive(() => call<number[]>({ type: 'rerank', query, passages }));
}
