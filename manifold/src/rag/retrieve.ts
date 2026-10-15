/**
 * Hybrid retrieval:
 *   1. every query variant is searched two ways, BM25 (exact terms) and dense
 *      embeddings (meaning), each giving a ranked list;
 *   2. the lists are fused with Reciprocal Rank Fusion, RRF(d) = Σ 1 / (60 + rank);
 *   3. a cross-encoder rereads the top candidates against the question and reorders them;
 *   4. the best passages are expanded with their neighbours and merged into sources.
 */
import { contextualText } from './chunk';
import { embedTexts, rerankPairs } from './embedder';
import { getIndex } from './kb';
import type { Candidate, ChunkRecord, DocRecord, QueryVariant, RetrievalTrace, Source } from './types';

export interface RetrieveOptions {
  k: number;
  dense: boolean;
  rerank: boolean;
  neighbors: boolean;
  /** restrict to these documents; null = every enabled document */
  scope: string[] | null;
  onStage?: (stage: 'search' | 'rerank') => void;
}

const RRF_K = 60;
const LIST = 40;
const POOL = 20;


function topDense(q: Float32Array, chunks: ChunkRecord[], allow: (i: number) => boolean, k: number) {
  const hits: { idx: number; score: number }[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const v = chunks[i].vec;
    if (!v || !allow(i)) continue;
    let s = 0;
    for (let j = 0; j < v.length; j++) s += v[j] * q[j];
    hits.push({ idx: i, score: s });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, k);
}

export interface RetrieveResult {
  sources: Source[];
  trace: RetrievalTrace;
  /** query vectors (question first), for the knowledge map */
  queryVecs: Float32Array[];
}

export async function retrieve(queries: QueryVariant[], opts: RetrieveOptions): Promise<RetrieveResult> {
  const t0 = performance.now();
  const { chunks, bm25, docs } = getIndex();
  const scope = opts.scope ? new Set(opts.scope) : null;
  const allow = (i: number) => {
    const d = docs.get(chunks[i].docId);
    return !!d && d.enabled !== false && (!scope || scope.has(d.id));
  };
  const question = queries[0].text;
  opts.onStage?.('search');

  const lists: { kind: 'bm25' | 'dense'; hits: { idx: number; score: number }[] }[] = [];
  for (const q of queries) if (q.kind !== 'hyde') lists.push({ kind: 'bm25', hits: bm25.search(q.text, LIST, allow) });

  let queryVecs: Float32Array[] = [];
  const canDense = opts.dense && chunks.some((c) => c.vec);
  if (canDense) {
    try {
      const qs = queries.filter((q) => q.kind !== 'hyde');
      const hy = queries.filter((q) => q.kind === 'hyde');
      const [qv, hv] = await Promise.all([embedTexts(qs.map((q) => q.text), { query: true }), embedTexts(hy.map((q) => q.text))]);
      queryVecs = [...qv, ...hv];
      for (const v of queryVecs) lists.push({ kind: 'dense', hits: topDense(v, chunks, allow, LIST) });
    } catch (err) {
      console.warn('Semantic search unavailable, using keywords only', err);
    }
  }

  // Reciprocal Rank Fusion
  const pool = new Map<number, Candidate>();
  for (const list of lists) {
    list.hits.forEach((h, rank) => {
      let c = pool.get(h.idx);
      if (!c) pool.set(h.idx, (c = { chunk: chunks[h.idx], rrf: 0, score: 0 }));
      c.rrf += 1 / (RRF_K + rank + 1);
      if (list.kind === 'bm25') {
        if (c.bm25Rank === undefined || rank + 1 < c.bm25Rank) {
          c.bm25Rank = rank + 1;
          c.bm25Score = h.score;
        }
      } else if (c.denseRank === undefined || rank + 1 < c.denseRank) {
        c.denseRank = rank + 1;
        c.denseScore = h.score;
      }
    });
  }
  let cands = [...pool.values()].sort((a, b) => b.rrf - a.rrf).slice(0, POOL);
  const maxRrf = cands[0]?.rrf ?? 1;
  for (const c of cands) c.score = c.rrf / maxRrf;
  const tSearch = performance.now() - t0;

  let reranked = false;
  let tRerank: number | undefined;
  if (opts.rerank && cands.length > 1) {
    opts.onStage?.('rerank');
    const t1 = performance.now();
    try {
      const logits = await rerankPairs(
        question,
        cands.map((c) => contextualText(docs.get(c.chunk.docId)?.title ?? '', c.chunk).slice(0, 1300)),
      );
      // reranker logits are only comparable within one question: scale them to 0..1
      const hi = Math.max(...logits);
      const lo = Math.min(...logits);
      cands.forEach((c, i) => {
        c.rerank = logits[i];
        c.score = hi > lo ? (logits[i] - lo) / (hi - lo) : 1;
      });
      cands = cands.sort((a, b) => (b.rerank ?? 0) - (a.rerank ?? 0));
      reranked = true;
    } catch (err) {
      console.warn('Reranker unavailable, using fused ranking', err);
    }
    tRerank = performance.now() - t1;
  }

  // keep the strongest passages; once we have a couple, drop any the reranker
  // rates far below the best (a logit gap of 3.5 is odds about 30 times lower)
  const topLogit = cands[0]?.rerank ?? 0;
  const picked = cands.filter((c, i) => i < 2 || !reranked || (c.rerank ?? 0) >= topLogit - 3.5).slice(0, opts.k);

  const sources = buildSources(picked, chunks, docs, opts.neighbors);
  return {
    sources,
    queryVecs,
    trace: {
      queries,
      candidates: cands,
      selected: picked.map((c) => c.chunk.id),
      ms: { search: tSearch, rerank: tRerank },
      searched: chunks.filter((_, i) => allow(i)).length,
      dense: queryVecs.length > 0,
      reranked,
    },
  };
}

/** Strip the overlap line a chunk carries from its predecessor. */
const body = (c: ChunkRecord) => c.text.replace(/^…[^\n]*\n?/, '');

function buildSources(picked: Candidate[], chunks: ChunkRecord[], docs: Map<string, DocRecord>, neighbors: boolean): Source[] {
  const byDoc = new Map<string, ChunkRecord[]>();
  for (const c of chunks) {
    let a = byDoc.get(c.docId);
    if (!a) byDoc.set(c.docId, (a = []));
    a[c.i] = c;
  }
  // group picked chunks (plus neighbours in the same section) into contiguous runs
  const groups: { docId: string; idx: Set<number>; best: number; order: number }[] = [];
  picked.forEach((cand, order) => {
    const c = cand.chunk;
    const siblings = byDoc.get(c.docId) ?? [];
    const want = new Set([c.i]);
    if (neighbors) {
      const same = (o?: ChunkRecord) => o && o.heading.join('|') === c.heading.join('|');
      if (same(siblings[c.i - 1]) && c.text.length < 900) want.add(c.i - 1);
      if (same(siblings[c.i + 1])) want.add(c.i + 1);
    }
    const g = groups.find((x) => x.docId === c.docId && [...want].some((i) => x.idx.has(i) || x.idx.has(i - 1) || x.idx.has(i + 1)));
    if (g) {
      want.forEach((i) => g.idx.add(i));
      g.best = Math.max(g.best, cand.score);
    } else groups.push({ docId: c.docId, idx: want, best: cand.score, order });
  });

  return groups
    .sort((a, b) => a.order - b.order)
    .map((g, n) => {
      const siblings = byDoc.get(g.docId) ?? [];
      const run = [...g.idx]
        .sort((a, b) => a - b)
        .map((i) => siblings[i])
        .filter(Boolean);
      const d = docs.get(g.docId);
      let text = run.map((c, i) => (i === 0 ? c.text.replace(/^…/, '') : body(c))).join('\n');
      if (text.length > 3200) text = text.slice(0, 3200) + '…';
      const pages = run.map((c) => c.pageStart).filter((p): p is number => p !== undefined);
      const ends = run.map((c) => c.pageEnd).filter((p): p is number => p !== undefined);
      return {
        n: n + 1,
        docId: g.docId,
        chunkIds: run.map((c) => c.id),
        title: d?.title ?? 'Untitled',
        kind: d?.kind ?? 'text',
        heading: run[0]?.heading ?? [],
        pageStart: pages.length ? Math.min(...pages) : undefined,
        pageEnd: ends.length ? Math.max(...ends) : undefined,
        route: run[0]?.route ?? d?.route,
        text,
        score: g.best,
      };
    });
}

/** Whole-document context for summaries: consecutive passages grouped into numbered sections. */
export function documentSources(docId: string, budget: number): Source[] {
  const { chunks, docs } = getIndex();
  const d = docs.get(docId);
  const own = chunks.filter((c) => c.docId === docId).sort((a, b) => a.i - b.i);
  if (!d || !own.length) return [];
  const total = own.reduce((s, c) => s + body(c).length, 0);
  // too long for the model: keep an even sample of passages
  const keepEvery = total > budget ? total / budget : 1;
  const kept = keepEvery > 1 ? own.filter((_, i) => Math.floor(i / keepEvery) !== Math.floor((i - 1) / keepEvery) || i === 0) : own;
  const target = Math.max(2400, Math.min(6000, Math.ceil(kept.reduce((s, c) => s + body(c).length, 0) / 12)));
  const out: Source[] = [];
  let run: ChunkRecord[] = [];
  let len = 0;
  const flush = () => {
    if (!run.length) return;
    const pages = run.map((c) => c.pageStart).filter((p): p is number => p !== undefined);
    out.push({
      n: out.length + 1,
      docId,
      chunkIds: run.map((c) => c.id),
      title: d.title,
      kind: d.kind,
      heading: run[0].heading,
      pageStart: pages.length ? Math.min(...pages) : undefined,
      pageEnd: pages.length ? Math.max(...run.map((c) => c.pageEnd ?? c.pageStart ?? 0)) : undefined,
      route: run[0].route ?? d.route,
      text: run.map((c, i) => (i === 0 ? c.text.replace(/^…/, '') : body(c))).join('\n'),
      score: 1,
    });
    run = [];
    len = 0;
  };
  for (const c of kept) {
    if (len + c.text.length > target) flush();
    run.push(c);
    len += c.text.length;
  }
  flush();
  return out;
}
