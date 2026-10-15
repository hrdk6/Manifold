import { dist2, euclid, mean } from './math';
import type { Rng } from './rng';

export type Pt = [number, number];

/* ------------------------------------------------------------------------ */
/* k-Means (Lloyd) with full trace                                           */
/* ------------------------------------------------------------------------ */

export interface KMeansIter {
  centroids: number[][];
  dists: number[][]; // [point][cluster]
  assign: number[];
  newCentroids: number[][];
  inertia: number;
  changed: boolean;
}

export function kmeansTrace(X: number[][], init: number[][], maxIter = 20) {
  let C = init.map((c) => c.slice());
  const iters: KMeansIter[] = [];
  let prev: number[] | null = null;
  for (let it = 0; it < maxIter; it++) {
    const dists = X.map((x) => C.map((c) => euclid(x, c)));
    const assign = dists.map((d) => d.indexOf(Math.min(...d)));
    const newC = C.map((c, k) => {
      const members = X.filter((_, i) => assign[i] === k);
      if (!members.length) return c.slice();
      return c.map((_, j) => mean(members.map((m) => m[j])));
    });
    const inertia = X.reduce((s, x, i) => s + dist2(x, C[assign[i]]), 0);
    const changed = !prev || prev.some((a, i) => a !== assign[i]);
    iters.push({ centroids: C, dists, assign, newCentroids: newC, inertia, changed });
    const moved = newC.some((c, k) => euclid(c, C[k]) > 1e-9);
    prev = assign;
    C = newC;
    if (!moved) break;
  }
  return iters;
}

export function kmeansPP(X: number[][], k: number, rng: Rng) {
  const C: number[][] = [X[Math.floor(rng() * X.length)].slice()];
  while (C.length < k) {
    const d = X.map((x) => Math.min(...C.map((c) => dist2(x, c))));
    const tot = d.reduce((a, b) => a + b, 0);
    let r = rng() * tot;
    let idx = 0;
    for (; idx < d.length; idx++) {
      r -= d[idx];
      if (r <= 0) break;
    }
    C.push(X[Math.min(idx, X.length - 1)].slice());
  }
  return C;
}

export function kmeans(X: number[][], k: number, rng: Rng, nInit = 4) {
  let best: { assign: number[]; centroids: number[][]; inertia: number } | null = null;
  for (let t = 0; t < nInit; t++) {
    const tr = kmeansTrace(X, kmeansPP(X, k, rng), 60);
    const last = tr[tr.length - 1];
    const assign = X.map((x) => {
      let bi = 0;
      let bd = Infinity;
      last.newCentroids.forEach((c, i) => {
        const d = dist2(x, c);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      return bi;
    });
    const inertia = X.reduce((s, x, i) => s + dist2(x, last.newCentroids[assign[i]]), 0);
    if (!best || inertia < best.inertia) best = { assign, centroids: last.newCentroids, inertia };
  }
  return best!;
}

/* ------------------------------------------------------------------------ */
/* DBSCAN with trace                                                         */
/* ------------------------------------------------------------------------ */

export type DbKind = 'core' | 'border' | 'noise';

export interface DbscanResult {
  neighbors: number[][]; // includes the point itself
  kind: DbKind[];
  label: number[]; // -1 = noise
  order: { point: number; cluster: number; via: number | null; kind: DbKind }[];
  nClusters: number;
}

export function dbscan(X: number[][], eps: number, minPts: number): DbscanResult {
  const n = X.length;
  const neighbors = X.map((a) => X.map((b, j) => (euclid(a, b) <= eps + 1e-9 ? j : -1)).filter((j) => j >= 0));
  const isCore = neighbors.map((nb) => nb.length >= minPts);
  const label = new Array(n).fill(-2); // -2 unvisited
  const order: DbscanResult['order'] = [];
  let c = 0;
  for (let i = 0; i < n; i++) {
    if (label[i] !== -2 || !isCore[i]) continue;
    label[i] = c;
    order.push({ point: i, cluster: c, via: null, kind: 'core' });
    const queue = [i];
    while (queue.length) {
      const p = queue.shift()!;
      if (!isCore[p]) continue;
      for (const q of neighbors[p]) {
        if (label[q] === -2 || label[q] === -1) {
          label[q] = c;
          order.push({ point: q, cluster: c, via: p, kind: isCore[q] ? 'core' : 'border' });
          if (isCore[q]) queue.push(q);
        }
      }
    }
    c++;
  }
  for (let i = 0; i < n; i++) if (label[i] === -2) label[i] = -1;
  const kind: DbKind[] = label.map((l, i) => (isCore[i] ? 'core' : l >= 0 ? 'border' : 'noise'));
  for (let i = 0; i < n; i++) if (label[i] === -1) order.push({ point: i, cluster: -1, via: null, kind: 'noise' });
  return { neighbors, kind, label, order, nClusters: c };
}

/* ------------------------------------------------------------------------ */
/* Agglomerative clustering                                                  */
/* ------------------------------------------------------------------------ */

export type Linkage = 'single' | 'complete' | 'average' | 'ward';

export interface Merge {
  a: number; // cluster id
  b: number;
  dist: number;
  id: number; // new cluster id
  members: number[];
}

export function agglomerative(X: number[][], linkage: Linkage) {
  const n = X.length;
  let clusters: { id: number; members: number[] }[] = X.map((_, i) => ({ id: i, members: [i] }));
  const merges: Merge[] = [];
  const D = X.map((a) => X.map((b) => euclid(a, b)));
  const cdist = (A: number[], B: number[]) => {
    if (linkage === 'ward') {
      const ca = centroid(A.map((i) => X[i]));
      const cb = centroid(B.map((i) => X[i]));
      // increase in total within-cluster variance
      return Math.sqrt(((2 * A.length * B.length) / (A.length + B.length)) * dist2(ca, cb));
    }
    let best = linkage === 'single' ? Infinity : linkage === 'complete' ? -Infinity : 0;
    for (const i of A)
      for (const j of B) {
        const d = D[i][j];
        if (linkage === 'single') best = Math.min(best, d);
        else if (linkage === 'complete') best = Math.max(best, d);
        else best += d;
      }
    return linkage === 'average' ? best / (A.length * B.length) : best;
  };
  let next = n;
  while (clusters.length > 1) {
    let bi = 0;
    let bj = 1;
    let bd = Infinity;
    for (let i = 0; i < clusters.length; i++)
      for (let j = i + 1; j < clusters.length; j++) {
        const d = cdist(clusters[i].members, clusters[j].members);
        if (d < bd - 1e-12) {
          bd = d;
          bi = i;
          bj = j;
        }
      }
    const members = [...clusters[bi].members, ...clusters[bj].members];
    merges.push({ a: clusters[bi].id, b: clusters[bj].id, dist: bd, id: next, members });
    const merged = { id: next++, members };
    clusters = clusters.filter((_, k) => k !== bi && k !== bj);
    clusters.push(merged);
  }
  return merges;
}

export function cutMerges(n: number, merges: Merge[], k: number) {
  // apply first n-k merges
  const label = Array.from({ length: n }, (_, i) => i);
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) groups.set(i, [i]);
  for (let m = 0; m < n - k; m++) {
    const mg = merges[m];
    const members = [...(groups.get(mg.a) ?? []), ...(groups.get(mg.b) ?? [])];
    groups.delete(mg.a);
    groups.delete(mg.b);
    groups.set(mg.id, members);
  }
  let c = 0;
  for (const [, members] of groups) {
    for (const i of members) label[i] = c;
    c++;
  }
  return label;
}

export function centroid(P: number[][]) {
  return P[0].map((_, j) => mean(P.map((p) => p[j])));
}

/* ------------------------------------------------------------------------ */
/* Clustering quality                                                        */
/* ------------------------------------------------------------------------ */

export function silhouette(X: number[][], label: number[]) {
  const ids = [...new Set(label.filter((l) => l >= 0))];
  if (ids.length < 2) return NaN;
  let tot = 0;
  let cnt = 0;
  X.forEach((x, i) => {
    if (label[i] < 0) return;
    const own = X.filter((_, j) => j !== i && label[j] === label[i]);
    if (!own.length) return;
    const a = mean(own.map((p) => euclid(x, p)));
    let b = Infinity;
    for (const c of ids) {
      if (c === label[i]) continue;
      const other = X.filter((_, j) => label[j] === c);
      if (other.length) b = Math.min(b, mean(other.map((p) => euclid(x, p))));
    }
    tot += (b - a) / Math.max(a, b);
    cnt++;
  });
  return cnt ? tot / cnt : NaN;
}

/** Adjusted Rand Index. */
export function ari(a: number[], b: number[]) {
  const n = a.length;
  const comb2 = (x: number) => (x * (x - 1)) / 2;
  const ka = [...new Set(a)];
  const kb = [...new Set(b)];
  const table = ka.map((u) => kb.map((v) => a.reduce((s, ai, i) => s + (ai === u && b[i] === v ? 1 : 0), 0)));
  const sumComb = table.flat().reduce((s, x) => s + comb2(x), 0);
  const rowC = table.map((r) => comb2(r.reduce((s, x) => s + x, 0))).reduce((s, x) => s + x, 0);
  const colC = kb.map((_, j) => comb2(table.reduce((s, r) => s + r[j], 0))).reduce((s, x) => s + x, 0);
  const exp = (rowC * colC) / comb2(n);
  const max = (rowC + colC) / 2;
  if (max === exp) return 1;
  return (sumComb - exp) / (max - exp);
}
