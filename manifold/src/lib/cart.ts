import { gini, mean } from './math';
import type { Rng } from './rng';

/** CART for continuous features (classification with Gini, or regression with MSE). */
export interface CartNode {
  leaf: boolean;
  value: number; // class (classification) or mean (regression)
  proba: number[]; // class distribution
  n: number;
  feat?: number;
  thr?: number;
  left?: CartNode;
  right?: CartNode;
  depth: number;
  impurity: number;
}

interface Opts {
  maxDepth: number;
  minLeaf?: number;
  nClasses?: number;
  regression?: boolean;
  maxFeatures?: number;
  rng?: Rng;
}

function counts(y: number[], idx: number[], k: number) {
  const c = new Array(k).fill(0);
  for (const i of idx) c[y[i]]++;
  return c;
}

function sse(y: number[], idx: number[]) {
  if (!idx.length) return 0;
  const m = mean(idx.map((i) => y[i]));
  return idx.reduce((s, i) => s + (y[i] - m) ** 2, 0);
}

export function buildCart(X: number[][], y: number[], opts: Opts, idx = X.map((_, i) => i), depth = 0): CartNode {
  const k = opts.nClasses ?? Math.max(...y) + 1;
  const minLeaf = opts.minLeaf ?? 1;
  const reg = !!opts.regression;
  const c = reg ? [] : counts(y, idx, k);
  const value = reg ? mean(idx.map((i) => y[i])) : c.indexOf(Math.max(...c));
  const impurity = reg ? sse(y, idx) / Math.max(1, idx.length) : gini(c);
  const node: CartNode = { leaf: true, value, proba: reg ? [] : c.map((v) => v / idx.length), n: idx.length, depth, impurity };
  if (depth >= opts.maxDepth || idx.length < 2 * minLeaf || impurity < 1e-12) return node;

  const d = X[0].length;
  let feats = Array.from({ length: d }, (_, j) => j);
  if (opts.maxFeatures && opts.maxFeatures < d && opts.rng) {
    const r = opts.rng;
    feats = feats.sort(() => r() - 0.5).slice(0, opts.maxFeatures);
  }
  let best: { f: number; t: number; score: number } | null = null;
  for (const f of feats) {
    const sorted = idx.slice().sort((a, b) => X[a][f] - X[b][f]);
    for (let s = minLeaf; s <= sorted.length - minLeaf; s++) {
      const a = X[sorted[s - 1]][f];
      const b = X[sorted[s]]?.[f];
      if (b === undefined || a === b) continue;
      const L = sorted.slice(0, s);
      const R = sorted.slice(s);
      const score = reg
        ? sse(y, L) + sse(y, R)
        : (L.length * gini(counts(y, L, k)) + R.length * gini(counts(y, R, k))) / sorted.length;
      if (!best || score < best.score - 1e-12) best = { f, t: (a + b) / 2, score };
    }
  }
  if (!best) return node;
  const parentScore = reg ? sse(y, idx) : impurity;
  if (best.score >= parentScore - 1e-12) return node;
  const L = idx.filter((i) => X[i][best!.f] <= best!.t);
  const R = idx.filter((i) => X[i][best!.f] > best!.t);
  node.leaf = false;
  node.feat = best.f;
  node.thr = best.t;
  node.left = buildCart(X, y, opts, L, depth + 1);
  node.right = buildCart(X, y, opts, R, depth + 1);
  return node;
}

export function cartLeaf(node: CartNode, x: number[]): CartNode {
  let n = node;
  while (!n.leaf) n = x[n.feat!] <= n.thr! ? n.left! : n.right!;
  return n;
}

export function cartDepth(node: CartNode): number {
  return node.leaf ? 0 : 1 + Math.max(cartDepth(node.left!), cartDepth(node.right!));
}

export function cartLeaves(node: CartNode): number {
  return node.leaf ? 1 : cartLeaves(node.left!) + cartLeaves(node.right!);
}

/** Random forest (bootstrap + feature subsampling). */
export function randomForest(X: number[][], y: number[], nTrees: number, maxDepth: number, rng: Rng, maxFeatures = 1) {
  const k = Math.max(...y) + 1;
  const trees: { tree: CartNode; sample: number[] }[] = [];
  for (let t = 0; t < nTrees; t++) {
    const sample = X.map(() => Math.floor(rng() * X.length));
    trees.push({ tree: buildCart(X, y, { maxDepth, nClasses: k, maxFeatures, rng }, sample), sample });
  }
  const proba = (x: number[], upto = trees.length) => {
    const p = new Array(k).fill(0);
    for (let t = 0; t < upto; t++) {
      const leaf = cartLeaf(trees[t].tree, x);
      leaf.proba.forEach((v, i) => (p[i] += v / upto));
    }
    return p;
  };
  return { trees, proba, k };
}

/** Gradient boosting for regression with depth-limited trees (squared loss). */
export function gradientBoost(x: number[], y: number[], nTrees: number, depth: number, lr: number) {
  const X = x.map((v) => [v]);
  const f0 = mean(y);
  const trees: CartNode[] = [];
  let pred = y.map(() => f0);
  const stages: number[][] = [pred.slice()];
  for (let t = 0; t < nTrees; t++) {
    const res = y.map((v, i) => v - pred[i]);
    const tree = buildCart(X, res, { maxDepth: depth, regression: true });
    trees.push(tree);
    pred = pred.map((p, i) => p + lr * cartLeaf(tree, X[i]).value);
    stages.push(pred.slice());
  }
  const predict = (v: number, upto = trees.length) => f0 + trees.slice(0, upto).reduce((s, t) => s + lr * cartLeaf(t, [v]).value, 0);
  return { f0, trees, predict, stages };
}
