import { gaussian, mulberry32, uniform, type Rng } from './rng';

export interface Labeled {
  X: number[][];
  y: number[];
}

export function blobs(seed: number, centers: number[][], n: number, sd = 0.6): Labeled {
  const rng = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % centers.length;
    X.push(centers[c].map((m) => gaussian(rng, m, sd)));
    y.push(c);
  }
  return { X, y };
}

export function moons(seed: number, n: number, noise = 0.1): Labeled {
  const rng = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2;
    const t = Math.PI * rng();
    const x = c === 0 ? [Math.cos(t), Math.sin(t)] : [1 - Math.cos(t), 0.5 - Math.sin(t)];
    X.push([x[0] + gaussian(rng, 0, noise), x[1] + gaussian(rng, 0, noise)]);
    y.push(c);
  }
  return { X, y };
}

export function circles(seed: number, n: number, noise = 0.06, factor = 0.45): Labeled {
  const rng = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2;
    const t = 2 * Math.PI * rng();
    const r = c === 0 ? 1 : factor;
    X.push([r * Math.cos(t) + gaussian(rng, 0, noise), r * Math.sin(t) + gaussian(rng, 0, noise)]);
    y.push(c);
  }
  return { X, y };
}

/** mglearn.make_wave equivalent */
export function wave(seed: number, n: number) {
  const rng = mulberry32(seed);
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const xi = uniform(rng, -3, 3);
    const yn = Math.sin(4 * xi) + xi;
    x.push(xi);
    y.push((yn + gaussian(rng)) / 2);
  }
  return { x, y };
}

/** Noisy 1-D regression sample from a smooth function. */
export function curve(seed: number, n: number, fn: (x: number) => number, noise: number, lo = 0, hi = 1) {
  const rng = mulberry32(seed);
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const xi = uniform(rng, lo, hi);
    x.push(xi);
    y.push(fn(xi) + gaussian(rng, 0, noise));
  }
  return { x, y };
}

/** Two overlapping 2-D Gaussian classes, linearly-ish separable. */
export function forge(seed: number, n = 40, sep = 2.2): Labeled {
  return blobs(seed, [
    [-sep / 2, -sep / 3],
    [sep / 2, sep / 3],
  ], n, 0.85);
}

/* ------------------------------------------------------------------------ */
/* Procedural 8×8 "handwritten" digits (stand-in for sklearn's load_digits)  */
/* ------------------------------------------------------------------------ */

const STROKES: Record<number, number[][][]> = {
  0: [[[0.5, 0.08], [0.78, 0.2], [0.85, 0.5], [0.78, 0.8], [0.5, 0.92], [0.22, 0.8], [0.15, 0.5], [0.22, 0.2], [0.5, 0.08]]],
  1: [[[0.35, 0.25], [0.55, 0.08], [0.55, 0.92]], [[0.35, 0.92], [0.75, 0.92]]],
  2: [[[0.2, 0.25], [0.4, 0.08], [0.7, 0.1], [0.8, 0.32], [0.6, 0.55], [0.2, 0.92], [0.82, 0.92]]],
  3: [[[0.2, 0.12], [0.75, 0.12], [0.45, 0.45], [0.75, 0.6], [0.72, 0.85], [0.45, 0.93], [0.2, 0.85]]],
  4: [[[0.65, 0.92], [0.65, 0.08], [0.15, 0.65], [0.85, 0.65]]],
  5: [[[0.8, 0.1], [0.25, 0.1], [0.22, 0.45], [0.6, 0.42], [0.8, 0.62], [0.65, 0.9], [0.2, 0.88]]],
  6: [[[0.72, 0.1], [0.35, 0.35], [0.2, 0.68], [0.4, 0.92], [0.72, 0.85], [0.75, 0.6], [0.45, 0.52], [0.22, 0.68]]],
  7: [[[0.15, 0.1], [0.85, 0.1], [0.45, 0.92]], [[0.35, 0.5], [0.72, 0.5]]],
  8: [[[0.5, 0.5], [0.25, 0.3], [0.5, 0.08], [0.75, 0.3], [0.5, 0.5], [0.22, 0.72], [0.5, 0.93], [0.78, 0.72], [0.5, 0.5]]],
  9: [[[0.78, 0.35], [0.5, 0.48], [0.25, 0.32], [0.45, 0.08], [0.75, 0.15], [0.78, 0.35], [0.7, 0.92]]],
};

function segDist(px: number, py: number, a: number[], b: number[]) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - (a[0] + t * vx), py - (a[1] + t * vy));
}

export function renderDigit(d: number, rng: Rng) {
  const rot = gaussian(rng, 0, 0.13);
  const sx = 1 + gaussian(rng, 0, 0.09);
  const sy = 1 + gaussian(rng, 0, 0.07);
  const shear = gaussian(rng, 0, 0.15);
  const tx = gaussian(rng, 0, 0.04);
  const ty = gaussian(rng, 0, 0.04);
  const thick = 0.075 + rng() * 0.05;
  const jitter = 0.035;
  const strokes = STROKES[d].map((s) =>
    s.map(([x, y]) => {
      let u = x - 0.5 + gaussian(rng, 0, jitter);
      let v = y - 0.5 + gaussian(rng, 0, jitter);
      u = u * sx + shear * v;
      v = v * sy;
      const ru = u * Math.cos(rot) - v * Math.sin(rot);
      const rv = u * Math.sin(rot) + v * Math.cos(rot);
      return [ru + 0.5 + tx, rv + 0.5 + ty];
    }),
  );
  const img: number[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      let acc = 0;
      for (let sr = 0; sr < 3; sr++)
        for (let sc = 0; sc < 3; sc++) {
          const px = (c + (sc + 0.5) / 3) / 8;
          const py = (r + (sr + 0.5) / 3) / 8;
          let md = Infinity;
          for (const s of strokes) for (let k = 1; k < s.length; k++) md = Math.min(md, segDist(px, py, s[k - 1], s[k]));
          acc += Math.max(0, Math.min(1, (thick + 0.045 - md) / 0.045));
        }
      img.push(Math.round((acc / 9) * 16));
    }
  return img;
}

export function digits(seed: number, perClass: number, classes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  const rng = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < perClass; i++)
    for (const d of classes) {
      X.push(renderDigit(d, rng));
      y.push(d);
    }
  return { X, y };
}

/** Train/test split preserving order randomness. */
export function split<T>(items: T[], testFrac: number, rng: Rng) {
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const nTest = Math.round(items.length * testFrac);
  return { test: idx.slice(0, nTest), train: idx.slice(nTest) };
}
