import { mean, sum } from './math';

export interface Confusion {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

const div = (a: number, b: number) => (b === 0 ? NaN : a / b);

export function binaryMetrics({ tp, fp, fn, tn }: Confusion) {
  const total = tp + fp + fn + tn;
  const precision = div(tp, tp + fp);
  const recall = div(tp, tp + fn);
  const specificity = div(tn, tn + fp);
  const f1 = div(2 * precision * recall, precision + recall);
  const mccDen = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  return {
    total,
    accuracy: div(tp + tn, total),
    errorRate: div(fp + fn, total),
    precision,
    recall,
    specificity,
    fpr: div(fp, fp + tn),
    fnr: div(fn, fn + tp),
    npv: div(tn, tn + fn),
    f1,
    balancedAccuracy: (recall + specificity) / 2,
    mcc: mccDen === 0 ? 0 : (tp * tn - fp * fn) / mccDen,
  };
}

export function fbeta(p: number, r: number, beta: number) {
  const b2 = beta * beta;
  return div((1 + b2) * p * r, b2 * p + r);
}

export function confusionAt(y: number[], score: number[], thr: number): Confusion {
  const c = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (let i = 0; i < y.length; i++) {
    const pred = score[i] >= thr;
    if (pred && y[i]) c.tp++;
    else if (pred && !y[i]) c.fp++;
    else if (!pred && y[i]) c.fn++;
    else c.tn++;
  }
  return c;
}

export interface RocPoint {
  thr: number;
  tpr: number;
  fpr: number;
  precision: number;
  recall: number;
  tp: number;
  fp: number;
}

/** ROC points at every distinct threshold (score ≥ thr ⇒ positive), from strict to lenient. */
export function rocCurve(y: number[], score: number[]) {
  const P = y.filter(Boolean).length;
  const N = y.length - P;
  const thrs = [...new Set(score)].sort((a, b) => b - a);
  const pts: RocPoint[] = [{ thr: Infinity, tpr: 0, fpr: 0, precision: 1, recall: 0, tp: 0, fp: 0 }];
  for (const t of thrs) {
    const c = confusionAt(y, score, t);
    pts.push({
      thr: t,
      tpr: c.tp / P,
      fpr: c.fp / N,
      precision: c.tp + c.fp ? c.tp / (c.tp + c.fp) : 1,
      recall: c.tp / P,
      tp: c.tp,
      fp: c.fp,
    });
  }
  let auc = 0;
  const segs: { x0: number; x1: number; y0: number; y1: number; area: number }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const area = ((pts[i].fpr - pts[i - 1].fpr) * (pts[i].tpr + pts[i - 1].tpr)) / 2;
    segs.push({ x0: pts[i - 1].fpr, x1: pts[i].fpr, y0: pts[i - 1].tpr, y1: pts[i].tpr, area });
    auc += area;
  }
  return { pts, auc, segs, P, N };
}

/** AUC as P(score⁺ > score⁻) (ties count ½) — the Mann–Whitney view. */
export function aucRank(y: number[], score: number[]) {
  const pos = score.filter((_, i) => y[i]);
  const neg = score.filter((_, i) => !y[i]);
  let s = 0;
  for (const p of pos) for (const q of neg) s += p > q ? 1 : p === q ? 0.5 : 0;
  return s / (pos.length * neg.length);
}

export function averagePrecision(y: number[], score: number[]) {
  const { pts } = rocCurve(y, score);
  let ap = 0;
  for (let i = 1; i < pts.length; i++) ap += (pts[i].recall - pts[i - 1].recall) * pts[i].precision;
  return ap;
}

/* ------------------------------------------------------------------------ */
/* Multiclass                                                                */
/* ------------------------------------------------------------------------ */

/** cm[i][j] = count of true class i predicted as class j */
export function multiclassReport(cm: number[][], labels: string[]) {
  const k = cm.length;
  const total = sum(cm.map((r) => sum(r)));
  const per = labels.map((label, c) => {
    const tp = cm[c][c];
    const support = sum(cm[c]);
    const predicted = sum(cm.map((r) => r[c]));
    const precision = predicted ? tp / predicted : 0;
    const recall = support ? tp / support : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { label, tp, fp: predicted - tp, fn: support - tp, support, predicted, precision, recall, f1 };
  });
  const correct = sum(cm.map((r, i) => r[i]));
  const macro = {
    precision: mean(per.map((p) => p.precision)),
    recall: mean(per.map((p) => p.recall)),
    f1: mean(per.map((p) => p.f1)),
  };
  const weighted = {
    precision: sum(per.map((p) => p.precision * p.support)) / total,
    recall: sum(per.map((p) => p.recall * p.support)) / total,
    f1: sum(per.map((p) => p.f1 * p.support)) / total,
  };
  const tpSum = sum(per.map((p) => p.tp));
  const fpSum = sum(per.map((p) => p.fp));
  const fnSum = sum(per.map((p) => p.fn));
  const micro = {
    precision: tpSum / (tpSum + fpSum),
    recall: tpSum / (tpSum + fnSum),
    f1: (2 * tpSum) / (2 * tpSum + fpSum + fnSum),
  };
  return { k, total, correct, accuracy: correct / total, per, macro, weighted, micro };
}

/* ------------------------------------------------------------------------ */
/* Regression                                                                */
/* ------------------------------------------------------------------------ */

export function regressionMetrics(y: number[], p: number[]) {
  const yb = mean(y);
  const res = y.map((v, i) => v - p[i]);
  const sse = sum(res.map((r) => r * r));
  const sst = sum(y.map((v) => (v - yb) ** 2));
  const mse = sse / y.length;
  const nonzero = y.filter((v) => v !== 0).length === y.length;
  return {
    yb,
    res,
    sse,
    sst,
    mae: mean(res.map(Math.abs)),
    mse,
    rmse: Math.sqrt(mse),
    r2: 1 - sse / sst,
    mape: nonzero ? mean(res.map((r, i) => Math.abs(r / y[i]))) : NaN,
  };
}

/* ------------------------------------------------------------------------ */
/* Losses as a function of the margin m = y·f(x)                             */
/* ------------------------------------------------------------------------ */

export const lossFns = {
  zeroOne: (m: number) => (m <= 0 ? 1 : 0),
  hinge: (m: number) => Math.max(0, 1 - m),
  log: (m: number) => Math.log2(1 + Math.exp(-m)),
  squaredHinge: (m: number) => Math.max(0, 1 - m) ** 2,
  exponential: (m: number) => Math.exp(-m),
};
