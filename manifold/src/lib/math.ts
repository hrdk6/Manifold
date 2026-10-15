export const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);

/** Sample variance (n − 1) unless population=true. */
export function variance(a: number[], population = false) {
  const m = mean(a);
  const ss = sum(a.map((v) => (v - m) ** 2));
  return ss / (population ? a.length : a.length - 1);
}

export const std = (a: number[], population = false) => Math.sqrt(variance(a, population));

export function covariance(a: number[], b: number[], population = false) {
  const ma = mean(a);
  const mb = mean(b);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (population ? a.length : a.length - 1);
}

export function median(a: number[]) {
  const s = a.slice().sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function quantile(a: number[], q: number) {
  const s = a.slice().sort((x, y) => x - y);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** Fisher–Pearson sample skewness (adjusted), same as pandas .skew(). */
export function skewness(a: number[]) {
  const n = a.length;
  if (n < 3) return 0;
  const m = mean(a);
  const m2 = sum(a.map((v) => (v - m) ** 2)) / n;
  const m3 = sum(a.map((v) => (v - m) ** 3)) / n;
  if (m2 === 0) return 0;
  const g1 = m3 / Math.pow(m2, 1.5);
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const dist2 = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
};
export const euclid = (a: number[], b: number[]) => Math.sqrt(dist2(a, b));
export const manhattan = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s;
};

export function log2(x: number) {
  return Math.log(x) / Math.LN2;
}

/** Entropy of a count vector, in bits. */
export function entropy(counts: number[]) {
  const n = sum(counts);
  if (n === 0) return 0;
  let h = 0;
  for (const c of counts) if (c > 0) h -= (c / n) * log2(c / n);
  return h;
}

export function gini(counts: number[]) {
  const n = sum(counts);
  if (n === 0) return 0;
  return 1 - sum(counts.map((c) => (c / n) ** 2));
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Solve A x = b with Gaussian elimination + partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c];
    if (Math.abs(piv) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / piv;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]));
}

/** Least squares fit of polynomial of degree d; returns coefficients c0..cd. */
export function polyfit(xs: number[], ys: number[], d: number, ridge = 0): number[] {
  const m = d + 1;
  const A: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const b = new Array(m).fill(0);
  for (let i = 0; i < xs.length; i++) {
    const pw: number[] = [1];
    for (let k = 1; k < m; k++) pw.push(pw[k - 1] * xs[i]);
    for (let r = 0; r < m; r++) {
      b[r] += pw[r] * ys[i];
      for (let c = 0; c < m; c++) A[r][c] += pw[r] * pw[c];
    }
  }
  for (let k = 1; k < m; k++) A[k][k] += ridge;
  return solve(A, b);
}

export const polyval = (c: number[], x: number) => {
  let y = 0;
  for (let k = c.length - 1; k >= 0; k--) y = y * x + c[k];
  return y;
};

/** Eigen-decomposition of a symmetric 2×2 matrix [[a,b],[b,d]]. λ1 ≥ λ2, unit vectors. */
export function eig2(a: number, b: number, d: number) {
  const tr = a + d;
  const det = a * d - b * b;
  const disc = Math.sqrt(Math.max(0, tr * tr - 4 * det));
  const l1 = (tr + disc) / 2;
  const l2 = (tr - disc) / 2;
  const vec = (l: number): [number, number] => {
    let v: [number, number];
    if (Math.abs(b) > 1e-12) v = [b, l - a];
    else v = a >= d ? (l === l1 ? [1, 0] : [0, 1]) : l === l1 ? [0, 1] : [1, 0];
    const n = Math.hypot(v[0], v[1]);
    v = [v[0] / n, v[1] / n];
    if (v[0] < 0 || (Math.abs(v[0]) < 1e-12 && v[1] < 0)) v = [-v[0], -v[1]];
    return v;
  };
  return { tr, det, disc, l1, l2, v1: vec(l1), v2: vec(l2) };
}

/** Jacobi eigenvalue algorithm for symmetric matrices. Returns values desc + vectors (columns). */
export function eigSym(S: number[][]) {
  const n = S.length;
  const A = S.map((r) => r.slice());
  const V: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p];
          const akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k];
          const aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p];
          const vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const idx = Array.from({ length: n }, (_, i) => i).sort((i, j) => A[j][j] - A[i][i]);
  return {
    values: idx.map((i) => A[i][i]),
    vectors: idx.map((i) => V.map((row) => row[i])),
  };
}

export function covMatrix(X: number[][], population = false) {
  const d = X[0].length;
  const n = X.length;
  const mu = Array.from({ length: d }, (_, j) => mean(X.map((r) => r[j])));
  const C = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const r of X) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += (r[i] - mu[i]) * (r[j] - mu[j]);
  const den = population ? n : n - 1;
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] /= den;
  return { mu, C };
}

/** PCA (centred, n−1 covariance). */
export function pca(X: number[][], k = 2) {
  const { mu, C } = covMatrix(X);
  const { values, vectors } = eigSym(C);
  const comps = vectors.slice(0, k);
  const proj = X.map((r) => comps.map((v) => v.reduce((s, vi, j) => s + vi * (r[j] - mu[j]), 0)));
  const total = sum(values);
  return { mu, values, comps, proj, ratio: values.map((v) => v / total) };
}

export function range(n: number, start = 0) {
  return Array.from({ length: n }, (_, i) => i + start);
}

export function linspace(a: number, b: number, n: number) {
  if (n === 1) return [a];
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

export function argmax(a: number[]) {
  let bi = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[bi]) bi = i;
  return bi;
}

export function argmin(a: number[]) {
  let bi = 0;
  for (let i = 1; i < a.length; i++) if (a[i] < a[bi]) bi = i;
  return bi;
}
