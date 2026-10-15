import { mean, solve } from './math';

/** Standardise columns; returns scaled X and the stats. */
export function standardize(X: number[][]) {
  const d = X[0].length;
  const mu = Array.from({ length: d }, (_, j) => mean(X.map((r) => r[j])));
  const sd = Array.from({ length: d }, (_, j) => Math.sqrt(mean(X.map((r) => (r[j] - mu[j]) ** 2))) || 1);
  return { Z: X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j])), mu, sd };
}

/** Ridge regression (intercept unpenalised) on centred data. alpha = 0 → OLS. */
export function ridge(X: number[][], y: number[], alpha: number) {
  const d = X[0].length;
  const mx = Array.from({ length: d }, (_, j) => mean(X.map((r) => r[j])));
  const my = mean(y);
  const Xc = X.map((r) => r.map((v, j) => v - mx[j]));
  const yc = y.map((v) => v - my);
  const A = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => Xc.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? alpha : 0)));
  const b = Array.from({ length: d }, (_, i) => Xc.reduce((s, r, k) => s + r[i] * yc[k], 0));
  const w = solve(A, b);
  const intercept = my - w.reduce((s, wi, j) => s + wi * mx[j], 0);
  return { w, intercept };
}

/** Lasso via cyclic coordinate descent, sklearn objective: (1/2n)||y − Xw||² + α||w||₁. */
export function lasso(X: number[][], y: number[], alpha: number, iters = 400) {
  const n = X.length;
  const d = X[0].length;
  const mx = Array.from({ length: d }, (_, j) => mean(X.map((r) => r[j])));
  const my = mean(y);
  const Xc = X.map((r) => r.map((v, j) => v - mx[j]));
  const yc = y.map((v) => v - my);
  const w = new Array(d).fill(0);
  const colSq = Array.from({ length: d }, (_, j) => Xc.reduce((s, r) => s + r[j] * r[j], 0) / n);
  const resid = yc.slice();
  for (let it = 0; it < iters; it++) {
    let maxDelta = 0;
    for (let j = 0; j < d; j++) {
      if (colSq[j] === 0) continue;
      let rho = 0;
      for (let i = 0; i < n; i++) rho += Xc[i][j] * (resid[i] + Xc[i][j] * w[j]);
      rho /= n;
      const nw = Math.sign(rho) * Math.max(0, Math.abs(rho) - alpha) / colSq[j];
      const delta = nw - w[j];
      if (delta !== 0) {
        for (let i = 0; i < n; i++) resid[i] -= Xc[i][j] * delta;
        w[j] = nw;
        maxDelta = Math.max(maxDelta, Math.abs(delta));
      }
    }
    if (maxDelta < 1e-8) break;
  }
  const intercept = my - w.reduce((s, wi, j) => s + wi * mx[j], 0);
  return { w, intercept };
}

export function predictLinear(m: { w: number[]; intercept: number }, x: number[]) {
  return m.intercept + m.w.reduce((s, wi, j) => s + wi * x[j], 0);
}

export function r2(y: number[], p: number[]) {
  const yb = mean(y);
  const ssr = y.reduce((s, v, i) => s + (v - p[i]) ** 2, 0);
  const sst = y.reduce((s, v) => s + (v - yb) ** 2, 0);
  return 1 - ssr / sst;
}
