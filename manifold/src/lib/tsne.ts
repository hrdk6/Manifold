import { dist2 } from './math';
import { gaussian, type Rng } from './rng';

/**
 * Exact t-SNE (van der Maaten & Hinton, 2008) — O(n²) per step, fine for a few hundred points.
 * Implemented as a stepper so the figure can animate the optimisation.
 */
export class TSNE {
  n: number;
  P: Float64Array;
  Y: number[][];
  gains: number[][];
  ystep: number[][];
  iter = 0;
  lr: number;
  exaggerationIters = 100;
  cost = 0;

  constructor(X: number[][], perplexity: number, rng: Rng, lr = 120) {
    this.n = X.length;
    this.lr = lr;
    this.P = TSNE.jointP(X, perplexity);
    this.Y = X.map(() => [gaussian(rng, 0, 1e-4) * 100, gaussian(rng, 0, 1e-4) * 100]);
    this.gains = X.map(() => [1, 1]);
    this.ystep = X.map(() => [0, 0]);
  }

  static conditionalRow(D: number[], i: number, perplexity: number) {
    const n = D.length;
    const target = Math.log(perplexity);
    let beta = 1;
    let lo = -Infinity;
    let hi = Infinity;
    const p = new Float64Array(n);
    for (let t = 0; t < 60; t++) {
      let sumP = 0;
      for (let j = 0; j < n; j++) {
        p[j] = j === i ? 0 : Math.exp(-D[j] * beta);
        sumP += p[j];
      }
      if (sumP === 0) sumP = 1e-12;
      let H = 0;
      for (let j = 0; j < n; j++) {
        p[j] /= sumP;
        if (p[j] > 1e-12) H -= p[j] * Math.log(p[j]);
      }
      if (Math.abs(H - target) < 1e-5) break;
      if (H > target) {
        lo = beta;
        beta = hi === Infinity ? beta * 2 : (beta + hi) / 2;
      } else {
        hi = beta;
        beta = lo === -Infinity ? beta / 2 : (beta + lo) / 2;
      }
    }
    return p;
  }

  static jointP(X: number[][], perplexity: number) {
    const n = X.length;
    const P = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
      const D = X.map((x) => dist2(x, X[i]));
      const row = TSNE.conditionalRow(D, i, perplexity);
      for (let j = 0; j < n; j++) P[i * n + j] = row[j];
    }
    const out = new Float64Array(n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) out[i * n + j] = Math.max((P[i * n + j] + P[j * n + i]) / (2 * n), 1e-100);
    return out;
  }

  step() {
    const { n, P, Y } = this;
    const exag = this.iter < this.exaggerationIters ? 4 : 1;
    const num = new Float64Array(n * n);
    let sumQ = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const dx = Y[i][0] - Y[j][0];
        const dy = Y[i][1] - Y[j][1];
        const q = 1 / (1 + dx * dx + dy * dy);
        num[i * n + j] = q;
        num[j * n + i] = q;
        sumQ += 2 * q;
      }
    const grad = Y.map(() => [0, 0]);
    let cost = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const q = num[i * n + j];
        const Q = Math.max(q / sumQ, 1e-100);
        const p = P[i * n + j];
        const mult = 4 * (exag * p - Q) * q;
        grad[i][0] += mult * (Y[i][0] - Y[j][0]);
        grad[i][1] += mult * (Y[i][1] - Y[j][1]);
        if (exag === 1) cost += p * Math.log(p / Q);
      }
    }
    const momentum = this.iter < 250 ? 0.5 : 0.8;
    const mean = [0, 0];
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < 2; d++) {
        const g = grad[i][d];
        const s = this.ystep[i][d];
        this.gains[i][d] = Math.sign(g) === Math.sign(s) ? this.gains[i][d] * 0.8 : this.gains[i][d] + 0.2;
        if (this.gains[i][d] < 0.01) this.gains[i][d] = 0.01;
        this.ystep[i][d] = momentum * s - this.lr * this.gains[i][d] * g;
        Y[i][d] += this.ystep[i][d];
        mean[d] += Y[i][d];
      }
    }
    for (let i = 0; i < n; i++) {
      Y[i][0] -= mean[0] / n;
      Y[i][1] -= mean[1] / n;
    }
    if (exag === 1) this.cost = cost;
    this.iter++;
  }
}
