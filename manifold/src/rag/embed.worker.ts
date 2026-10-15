/**
 * Runs the two small neural models that power semantic search, off the main thread:
 * a bi-encoder that maps text to 384-d unit vectors (cosine similarity = dot product),
 * and a cross-encoder that reads (question, passage) pairs together to rerank candidates.
 * Weights download once from the Hugging Face Hub and are cached by the browser.
 */
import {
  AutoModelForSequenceClassification,
  AutoTokenizer,
  env,
  pipeline,
  type FeatureExtractionPipeline,
  type PreTrainedModel,
  type PreTrainedTokenizer,
} from '@huggingface/transformers';
import { EMBED_MODEL, RERANK_MODEL } from './models';

env.allowLocalModels = false;
const QUERY_PREFIX = 'Represent this sentence for searching relevant passages: ';

type Device = 'webgpu' | 'wasm';

interface Scope {
  postMessage(msg: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent) => void) | null;
}
const ctx = self as unknown as Scope;

let device: Device | null = null;
async function pickDevice(): Promise<Device> {
  if (device) return device;
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
    const adapter = gpu ? await gpu.requestAdapter() : null;
    device = adapter && adapter.features.has('shader-f16') ? 'webgpu' : 'wasm';
  } catch {
    device = 'wasm';
  }
  return device;
}
const dtypeFor = (d: Device) => (d === 'webgpu' ? 'fp16' : 'q8');

function progress(model: 'embed' | 'rerank') {
  return (x: { status: string; file?: string; loaded?: number; total?: number; progress?: number }) => {
    if (x.status === 'progress' || x.status === 'done' || x.status === 'initiate') {
      ctx.postMessage({ type: 'download', model, file: x.file, loaded: x.loaded ?? 0, total: x.total ?? 0, status: x.status });
    }
  };
}

let embedder: Promise<FeatureExtractionPipeline> | null = null;
function getEmbedder() {
  if (!embedder) {
    embedder = (async () => {
      const d = await pickDevice();
      try {
        return (await pipeline('feature-extraction', EMBED_MODEL, { device: d, dtype: dtypeFor(d), progress_callback: progress('embed') })) as FeatureExtractionPipeline;
      } catch (err) {
        if (d === 'wasm') throw err;
        device = 'wasm';
        return (await pipeline('feature-extraction', EMBED_MODEL, { device: 'wasm', dtype: 'q8', progress_callback: progress('embed') })) as FeatureExtractionPipeline;
      }
    })();
    embedder.catch(() => (embedder = null));
  }
  return embedder;
}

let reranker: Promise<{ tok: PreTrainedTokenizer; model: PreTrainedModel }> | null = null;
function getReranker() {
  if (!reranker) {
    reranker = (async () => {
      // DeBERTa reranker: only a quantised CPU build is published, and it runs well multithreaded
      const tok = await AutoTokenizer.from_pretrained(RERANK_MODEL, { progress_callback: progress('rerank') });
      const model = await AutoModelForSequenceClassification.from_pretrained(RERANK_MODEL, { device: 'wasm', dtype: 'q8', progress_callback: progress('rerank') });
      return { tok, model };
    })();
    reranker.catch(() => (reranker = null));
  }
  return reranker;
}

async function embed(id: number, texts: string[], query: boolean) {
  const ex = await getEmbedder();
  const batch = query ? 8 : 12;
  let dim = 0;
  let out: Float32Array | null = null;
  for (let i = 0; i < texts.length; i += batch) {
    const slice = texts.slice(i, i + batch).map((t) => (query ? QUERY_PREFIX + t : t));
    const t = await ex(slice, { pooling: 'cls', normalize: true });
    const data = t.data as Float32Array;
    if (!out) {
      dim = t.dims[t.dims.length - 1];
      out = new Float32Array(texts.length * dim);
    }
    out.set(data, i * dim);
    if (!query) ctx.postMessage({ type: 'progress', id, done: Math.min(texts.length, i + batch), total: texts.length });
  }
  return { vectors: out ?? new Float32Array(0), dim };
}

async function rerank(query: string, passages: string[]) {
  const { tok, model } = await getReranker();
  const scores: number[] = [];
  const batch = 8;
  for (let i = 0; i < passages.length; i += batch) {
    const ps = passages.slice(i, i + batch);
    const inputs = tok(
      ps.map(() => query),
      { text_pair: ps, padding: true, truncation: true, max_length: 512 },
    );
    const { logits } = (await model(inputs)) as { logits: { data: Float32Array } };
    scores.push(...Array.from(logits.data));
  }
  return scores;
}

ctx.onmessage = async (e: MessageEvent) => {
  const { id, type } = e.data as { id: number; type: string };
  try {
    if (type === 'init') {
      await getEmbedder();
      ctx.postMessage({ id, ok: true, result: { device, model: EMBED_MODEL } });
    } else if (type === 'init-rerank') {
      await getReranker();
      ctx.postMessage({ id, ok: true, result: { device: 'wasm' } });
    } else if (type === 'embed') {
      const { texts, query } = e.data as { texts: string[]; query?: boolean };
      const r = await embed(id, texts, !!query);
      ctx.postMessage({ id, ok: true, result: { ...r, device } }, [r.vectors.buffer]);
    } else if (type === 'rerank') {
      const { query, passages } = e.data as { query: string; passages: string[] };
      ctx.postMessage({ id, ok: true, result: await rerank(query, passages) });
    }
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
