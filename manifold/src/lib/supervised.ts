import { dist2, euclid, manhattan, mean, sigmoid, sum } from './math';
import type { Rng } from './rng';

/* ------------------------------------------------------------------------ */
/* k-NN                                                                      */
/* ------------------------------------------------------------------------ */

export type Metric = 'euclidean' | 'manhattan' | 'minkowski3';

export function distance(a: number[], b: number[], m: Metric) {
  if (m === 'manhattan') return manhattan(a, b);
  if (m === 'minkowski3') return Math.cbrt(a.reduce((s, ai, i) => s + Math.abs(ai - b[i]) ** 3, 0));
  return euclid(a, b);
}

export function knnPredict(X: number[][], y: number[], q: number[], k: number, m: Metric = 'euclidean', weighted = false) {
  const d = X.map((x, i) => ({ i, d: distance(x, q, m) })).sort((a, b) => a.d - b.d || a.i - b.i);
  const nn = d.slice(0, k);
  const votes = new Map<number, number>();
  for (const { i, d: di } of nn) votes.set(y[i], (votes.get(y[i]) ?? 0) + (weighted ? 1 / (di + 1e-9) : 1));
  let best = -1;
  let bv = -Infinity;
  for (const [c, v] of votes) if (v > bv + 1e-12) {
    bv = v;
    best = c;
  }
  return { label: best, nn, votes };
}

/* ------------------------------------------------------------------------ */
/* Simple & multiple linear regression                                       */
/* ------------------------------------------------------------------------ */

export function ols1(x: number[], y: number[]) {
  const xb = mean(x);
  const yb = mean(y);
  const dx = x.map((v) => v - xb);
  const dy = y.map((v) => v - yb);
  const sxy = sum(dx.map((v, i) => v * dy[i]));
  const sxx = sum(dx.map((v) => v * v));
  const b = sxy / sxx;
  const a = yb - b * xb;
  const pred = x.map((v) => a + b * v);
  const res = y.map((v, i) => v - pred[i]);
  const sse = sum(res.map((r) => r * r));
  const sst = sum(dy.map((v) => v * v));
  return {
    xb,
    yb,
    dx,
    dy,
    sxy,
    sxx,
    b,
    a,
    pred,
    res,
    sse,
    sst,
    mse: sse / x.length,
    rmse: Math.sqrt(sse / x.length),
    mae: mean(res.map(Math.abs)),
    r2: 1 - sse / sst,
    sumX: sum(x),
    sumY: sum(y),
    sumXY: sum(x.map((v, i) => v * y[i])),
    sumX2: sum(x.map((v) => v * v)),
  };
}

/* ------------------------------------------------------------------------ */
/* Logistic regression (Newton / IRLS), L2 on weights only (sklearn style)   */
/* ------------------------------------------------------------------------ */

export function logisticFit(X: number[][], y: number[], C = 1, iters = 60) {
  const d = X[0].length;
  let w = new Array(d + 1).fill(0); // w[0] intercept
  const lam = C > 0 && Number.isFinite(C) ? 1 / C : 0;
  for (let it = 0; it < iters; it++) {
    const g = new Array(d + 1).fill(0);
    const H: number[][] = Array.from({ length: d + 1 }, () => new Array(d + 1).fill(0));
    for (let i = 0; i < X.length; i++) {
      const xi = [1, ...X[i]];
      const p = sigmoid(xi.reduce((s, v, j) => s + v * w[j], 0));
      const r = p * (1 - p);
      for (let a = 0; a <= d; a++) {
        g[a] += (p - y[i]) * xi[a];
        for (let b = 0; b <= d; b++) H[a][b] += r * xi[a] * xi[b];
      }
    }
    for (let a = 1; a <= d; a++) {
      g[a] += lam * w[a];
      H[a][a] += lam;
    }
    for (let a = 0; a <= d; a++) H[a][a] += 1e-9;
    const step = solveSmall(H, g);
    w = w.map((v, a) => v - step[a]);
    if (Math.sqrt(sum(step.map((s) => s * s))) < 1e-10) break;
  }
  const prob = (x: number[]) => sigmoid(w[0] + x.reduce((s, v, j) => s + v * w[j + 1], 0));
  const logloss = -mean(X.map((x, i) => {
    const p = Math.min(1 - 1e-12, Math.max(1e-12, prob(x)));
    return y[i] * Math.log(p) + (1 - y[i]) * Math.log(1 - p);
  }));
  return { w, prob, logloss };
}

function solveSmall(A: number[][], b: number[]) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || Math.abs(M[c][c]) < 1e-15) continue;
      const fct = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= fct * M[c][k];
    }
  }
  return M.map((r, i) => (Math.abs(r[i]) < 1e-15 ? 0 : r[n] / r[i]));
}

/* ------------------------------------------------------------------------ */
/* SVM — simplified SMO (Platt) with linear / RBF kernels                    */
/* ------------------------------------------------------------------------ */

export type Kernel = { type: 'linear' } | { type: 'rbf'; gamma: number } | { type: 'poly'; degree: number };

export function kfun(k: Kernel, a: number[], b: number[]) {
  if (k.type === 'rbf') return Math.exp(-k.gamma * dist2(a, b));
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  if (k.type === 'poly') return (1 + dot) ** k.degree;
  return dot;
}

export interface SvmModel {
  alpha: number[];
  b: number;
  X: number[][];
  y: number[]; // ±1
  kernel: Kernel;
  decision: (x: number[]) => number;
  sv: number[];
  w?: number[];
}

export function svmTrain(X: number[][], yIn: number[], C: number, kernel: Kernel, rng: Rng, maxPasses = 8, maxIter = 4000): SvmModel {
  const n = X.length;
  const y = yIn.map((v) => (v > 0 ? 1 : -1));
  const K = X.map((a) => X.map((b) => kfun(kernel, a, b)));
  const alpha = new Array(n).fill(0);
  let b = 0;
  const tol = 1e-3;
  const fx = (i: number) => {
    let s = b;
    for (let j = 0; j < n; j++) if (alpha[j] !== 0) s += alpha[j] * y[j] * K[j][i];
    return s;
  };
  let passes = 0;
  let iter = 0;
  while (passes < maxPasses && iter < maxIter) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      const Ei = fx(i) - y[i];
      if ((y[i] * Ei < -tol && alpha[i] < C) || (y[i] * Ei > tol && alpha[i] > 0)) {
        let j = Math.floor(rng() * (n - 1));
        if (j >= i) j++;
        const Ej = fx(j) - y[j];
        const ai = alpha[i];
        const aj = alpha[j];
        let L: number;
        let H: number;
        if (y[i] !== y[j]) {
          L = Math.max(0, aj - ai);
          H = Math.min(C, C + aj - ai);
        } else {
          L = Math.max(0, ai + aj - C);
          H = Math.min(C, ai + aj);
        }
        if (Math.abs(L - H) < 1e-12) continue;
        const eta = 2 * K[i][j] - K[i][i] - K[j][j];
        if (eta >= 0) continue;
        let ajNew = aj - (y[j] * (Ei - Ej)) / eta;
        ajNew = Math.min(H, Math.max(L, ajNew));
        if (Math.abs(ajNew - aj) < 1e-6) continue;
        const aiNew = ai + y[i] * y[j] * (aj - ajNew);
        const b1 = b - Ei - y[i] * (aiNew - ai) * K[i][i] - y[j] * (ajNew - aj) * K[i][j];
        const b2 = b - Ej - y[i] * (aiNew - ai) * K[i][j] - y[j] * (ajNew - aj) * K[j][j];
        alpha[i] = aiNew;
        alpha[j] = ajNew;
        if (aiNew > 0 && aiNew < C) b = b1;
        else if (ajNew > 0 && ajNew < C) b = b2;
        else b = (b1 + b2) / 2;
        changed++;
      }
      iter++;
    }
    passes = changed === 0 ? passes + 1 : 0;
  }
  const sv = alpha.map((a, i) => (a > 1e-6 ? i : -1)).filter((i) => i >= 0);
  const decision = (x: number[]) => {
    let s = b;
    for (const j of sv) s += alpha[j] * y[j] * kfun(kernel, X[j], x);
    return s;
  };
  let w: number[] | undefined;
  if (kernel.type === 'linear') {
    w = X[0].map((_, d) => sv.reduce((s, j) => s + alpha[j] * y[j] * X[j][d], 0));
  }
  return { alpha, b, X, y, kernel, decision, sv, w };
}

/* ------------------------------------------------------------------------ */
/* AdaBoost with decision stumps                                             */
/* ------------------------------------------------------------------------ */

export interface Stump {
  feat: number;
  thr: number;
  pol: 1 | -1;
  alpha: number;
  err: number;
}

export function stumpPredict(s: Stump, x: number[]) {
  return s.pol * (x[s.feat] < s.thr ? -1 : 1);
}

export function adaboost(X: number[][], yIn: number[], rounds: number) {
  const n = X.length;
  const y = yIn.map((v) => (v > 0 ? 1 : -1));
  let w = new Array(n).fill(1 / n);
  const stumps: Stump[] = [];
  const weights: number[][] = [w.slice()];
  for (let t = 0; t < rounds; t++) {
    let best: Stump | null = null;
    for (let f = 0; f < X[0].length; f++) {
      const vals = [...new Set(X.map((x) => x[f]))].sort((a, b) => a - b);
      const thrs = vals.map((v, i) => (i === 0 ? v - 1e-3 : (v + vals[i - 1]) / 2));
      thrs.push(vals[vals.length - 1] + 1e-3);
      for (const thr of thrs)
        for (const pol of [1, -1] as const) {
          let err = 0;
          for (let i = 0; i < n; i++) if (pol * (X[i][f] < thr ? -1 : 1) !== y[i]) err += w[i];
          if (!best || err < best.err) best = { feat: f, thr, pol, err, alpha: 0 };
        }
    }
    const s = best!;
    const e = Math.min(1 - 1e-10, Math.max(1e-10, s.err));
    s.alpha = 0.5 * Math.log((1 - e) / e);
    stumps.push(s);
    w = w.map((wi, i) => wi * Math.exp(-s.alpha * y[i] * stumpPredict(s, X[i])));
    const z = sum(w);
    w = w.map((wi) => wi / z);
    weights.push(w.slice());
  }
  const score = (x: number[], upto = stumps.length) => stumps.slice(0, upto).reduce((s, st) => s + st.alpha * stumpPredict(st, x), 0);
  return { stumps, weights, score };
}

/* ------------------------------------------------------------------------ */
/* Categorical Naive Bayes                                                   */
/* ------------------------------------------------------------------------ */

export function naiveBayes(
  rows: { x: string[]; y: string }[],
  attrs: string[],
  query: string[],
  alpha = 0,
) {
  const classes = [...new Set(rows.map((r) => r.y))];
  const N = rows.length;
  const per = classes.map((c) => {
    const sub = rows.filter((r) => r.y === c);
    const prior = sub.length / N;
    const terms = attrs.map((a, i) => {
      const vals = [...new Set(rows.map((r) => r.x[i]))];
      const cnt = sub.filter((r) => r.x[i] === query[i]).length;
      const p = (cnt + alpha) / (sub.length + alpha * vals.length);
      return { attr: a, value: query[i], cnt, n: sub.length, k: vals.length, p };
    });
    const score = prior * terms.reduce((s, t) => s * t.p, 1);
    return { cls: c, nc: sub.length, prior, terms, score };
  });
  const total = sum(per.map((p) => p.score));
  return { classes, per, total, posterior: per.map((p) => (total > 0 ? p.score / total : 0)) };
}

export function gaussianPdf(x: number, mu: number, sd: number) {
  return Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
}
