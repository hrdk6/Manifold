import { useMemo, useState } from 'react';
import { Seg, Slider, StepperBar, Toggle, useStepper } from '../components/controls';
import { Plot } from '../components/Plot';
import { Figure } from '../components/prose';
import { buildCart, cartLeaf } from '../lib/cart';
import { wave } from '../lib/datasets';
import { f, fx } from '../lib/fmt';
import { r2, ridge, standardize } from '../lib/linear';
import { mean, range, skewness, solve, std, sum, variance } from '../lib/math';
import { gaussian, mulberry32, type Rng } from '../lib/rng';
import { logisticFit } from '../lib/supervised';

const line = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

/* ------------------------------------------------------------------------ */
/* Encoders                                                                  */
/* ------------------------------------------------------------------------ */

const ENC_ROWS = [
  ['1', 'Red', 'Large'],
  ['2', 'Blue', 'Medium'],
  ['3', 'Green', 'Small'],
  ['4', 'Red', 'Medium'],
];

export function EncodingFigure() {
  const [mode, setMode] = useState<'onehot' | 'label' | 'ordinal' | 'binary'>('onehot');
  const [dropFirst, setDropFirst] = useState(false);
  const colors = [...new Set(ENC_ROWS.map((r) => r[1]))].sort();
  const sizes = [...new Set(ENC_ROWS.map((r) => r[2]))].sort();
  const sizeOrder = ['Small', 'Medium', 'Large'];
  let head: string[] = ['ID'];
  let body: (string | number)[][] = [];
  if (mode === 'onehot') {
    const cs = dropFirst ? colors.slice(1) : colors;
    const ss = dropFirst ? sizes.slice(1) : sizes;
    head = ['ID', ...cs.map((c) => `Color_${c}`), ...ss.map((s) => `Size_${s}`)];
    body = ENC_ROWS.map((r) => [r[0], ...cs.map((c) => (r[1] === c ? 1 : 0)), ...ss.map((s) => (r[2] === s ? 1 : 0))]);
  } else if (mode === 'label') {
    head = ['ID', 'Color (label)', 'Size (label)'];
    body = ENC_ROWS.map((r) => [r[0], colors.indexOf(r[1]), sizes.indexOf(r[2])]);
  } else if (mode === 'ordinal') {
    head = ['ID', 'Color', 'Size (ordinal)'];
    body = ENC_ROWS.map((r) => [r[0], r[1], sizeOrder.indexOf(r[2])]);
  } else {
    const bits = Math.ceil(Math.log2(colors.length + 1));
    head = ['ID', ...range(bits).map((b) => `Color_b${bits - b}`), 'Size'];
    body = ENC_ROWS.map((r) => {
      const code = colors.indexOf(r[1]) + 1;
      return [r[0], ...range(bits).map((b) => (code >> (bits - 1 - b)) & 1), r[2]];
    });
  }
  const notes: Record<typeof mode, string> = {
    onehot: `Each category becomes its own 0/1 column; exactly one is 1 per original feature. ${colors.length} colours + ${sizes.length} sizes = ${colors.length + sizes.length} columns${dropFirst ? `, minus one per feature with drop_first = ${colors.length + sizes.length - 2}` : ''}. No false order is implied.`,
    label: 'Each category is replaced by an integer (alphabetical here: Blue 0, Green 1, Red 2). Compact, but a linear model will read Red > Green > Blue, an order that does not exist.',
    ordinal: 'Size has a real order, so encode it Small 0 < Medium 1 < Large 2. Use this only when the order is meaningful.',
    binary: 'Categories are numbered 1, 2, 3 and written in binary, one column per bit: fewer columns than one-hot when there are many categories.',
  };
  return (
    <Figure
      title="Four ways to turn categories into numbers"
      hint="Switch encodings"
      caption={<>The SEE ’25 7a table. One-hot is the safe default for nominal features like Color; ordinal encoding suits ordered features like Size.</>}
    >
      <div className="controls" style={{ marginBottom: '0.8rem' }}>
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { value: 'onehot', label: 'One-hot' },
            { value: 'label', label: 'Label' },
            { value: 'ordinal', label: 'Ordinal' },
            { value: 'binary', label: 'Binary' },
          ]}
        />
        {mode === 'onehot' && <Toggle label="drop_first (avoid the dummy trap)" checked={dropFirst} onChange={setDropFirst} />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(12rem, 0.6fr) minmax(0, 1.4fr)', gap: '1rem', alignItems: 'start' }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Color</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {ENC_ROWS.map((r) => (
                <tr key={r[0]}>
                  {r.map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {head.map((h) => (
                  <th key={h} className="n">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className="n" style={c === 1 && mode === 'onehot' && j > 0 ? { fontWeight: 800, color: 'var(--ultra)' } : undefined}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ marginTop: '0.8rem', fontSize: '0.9rem', color: 'var(--ink-2)', lineHeight: 1.55 }}>{notes[mode]}</p>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Binning: equal width vs equal frequency                                   */
/* ------------------------------------------------------------------------ */

const INCOME = (() => {
  const rng = mulberry32(14);
  return range(200).map(() => Math.round(Math.exp(gaussian(rng, 3.4, 0.6)) * 10) / 10);
})();

export function binEdges(values: number[], k: number, kind: 'width' | 'freq') {
  const s = values.slice().sort((a, b) => a - b);
  if (kind === 'width') {
    const lo = s[0];
    const hi = s[s.length - 1];
    return range(k + 1).map((i) => lo + ((hi - lo) * i) / k);
  }
  // quantiles with linear interpolation (numpy / pandas.qcut convention)
  return range(k + 1).map((i) => {
    const pos = ((s.length - 1) * i) / k;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  });
}

/** Right-closed bins (a, b] like pandas.cut / qcut; the minimum falls in the first bin. */
export function binIndex(v: number, edges: number[]) {
  for (let i = 1; i < edges.length - 1; i++) if (v <= edges[i] + 1e-12) return i - 1;
  return edges.length - 2;
}

export function BinningFigure() {
  const [kind, setKind] = useState<'width' | 'freq'>('width');
  const [k, setK] = useState(4);
  const edges = binEdges(INCOME, k, kind);
  const counts = range(k).map((b) => INCOME.filter((v) => binIndex(v, edges) === b).length);
  const lo = Math.min(...INCOME);
  const hi = Math.max(...INCOME);
  const hist = range(40).map((i) => {
    const a = lo + ((hi - lo) * i) / 40;
    const b = lo + ((hi - lo) * (i + 1)) / 40;
    return { a, b, n: INCOME.filter((v) => v >= a && (i === 39 ? v <= b : v < b)).length };
  });
  const maxN = Math.max(...hist.map((h) => h.n));
  return (
    <Figure
      title="Equal-width versus equal-frequency bins on a skewed variable"
      hint="Switch the strategy and the number of bins"
      caption={
        <>
          200 incomes (₹ thousands per month) with a long right tail. <b>Equal-width</b> bins split the range evenly, so almost everyone lands
          in the first one or two bins and the top bins hold a handful of outliers. <b>Equal-frequency</b> (quantile) bins put the same number of
          people in each bin: narrow bins where the data is dense, wide where it is sparse. That is how quantile binning tames skew.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          value={kind}
          onChange={setKind}
          options={[
            { value: 'width', label: 'Equal width' },
            { value: 'freq', label: 'Equal frequency' },
          ]}
        />
        <Slider label="Bins" value={k} min={2} max={8} onChange={setK} />
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[lo, hi]} yDomain={[0, maxN * 1.1]} height={250} xLabel="income (₹k)" yLabel="people">
            {(s) => (
              <>
                {hist.map((h, i) => (
                  <rect key={i} x={s.x(h.a) + 0.5} y={s.y(h.n)} width={Math.max(0.5, s.x(h.b) - s.x(h.a) - 1)} height={s.y(0) - s.y(h.n)} fill={`var(${binIndex((h.a + h.b) / 2, edges) % 2 ? '--rose' : '--ultra'})`} opacity={0.7} />
                ))}
                {edges.map((e, i) => (
                  <line key={i} x1={s.x(e)} x2={s.x(e)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--ink)" strokeWidth={1.4} strokeDasharray={i === 0 || i === edges.length - 1 ? undefined : '4 3'} />
                ))}
              </>
            )}
          </Plot>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Bin</th>
                <th>Range</th>
                <th className="n">Count</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c, b) => (
                <tr key={b}>
                  <td>{b + 1}</td>
                  <td>
                    {f(edges[b], 1)} – {f(edges[b + 1], 1)}
                  </td>
                  <td className="n">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Wave dataset: linear vs tree vs binned linear (Müller fig 4-1 / 4-2)       */
/* ------------------------------------------------------------------------ */

const WAVE = wave(0, 120);

function linFit(X: number[][], y: number[]) {
  const d = X[0].length;
  const A = range(d).map((i) => range(d).map((j) => sum(X.map((r) => r[i] * r[j])) + (i === j ? 1e-8 : 0)));
  const b = range(d).map((i) => sum(X.map((r, k) => r[i] * y[k])));
  return solve(A, b);
}

export function WaveBinningFigure() {
  const [model, setModel] = useState<'linear' | 'tree' | 'binned' | 'binslope'>('linear');
  const [k, setK] = useState(10);
  const edges = range(k + 1).map((i) => -3 + (6 * i) / k);
  const oneHot = (x: number) => range(k).map((b) => (binIndex(x, edges) === b ? 1 : 0));
  const pred = useMemo(() => {
    if (model === 'linear') {
      const w = linFit(WAVE.x.map((x) => [1, x]), WAVE.y);
      return (x: number) => w[0] + w[1] * x;
    }
    if (model === 'tree') {
      const t = buildCart(WAVE.x.map((x) => [x]), WAVE.y, { maxDepth: 3, regression: true, minLeaf: 3 });
      return (x: number) => cartLeaf(t, [x]).value;
    }
    if (model === 'binned') {
      const w = linFit(WAVE.x.map(oneHot), WAVE.y);
      return (x: number) => sum(oneHot(x).map((v, i) => v * w[i]));
    }
    const feats = (x: number) => [...oneHot(x), x];
    const w = linFit(WAVE.x.map(feats), WAVE.y);
    return (x: number) => sum(feats(x).map((v, i) => v * w[i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, k]);
  const score = r2(WAVE.y, WAVE.x.map(pred));
  const xs = range(400).map((i) => -3 + (6 * i) / 399);
  const desc: Record<typeof model, string> = {
    linear: 'A linear model can only draw a straight line through the wave.',
    tree: 'A decision tree (depth 3) cuts the input into intervals and predicts a constant in each: flexible, but blocky.',
    binned: 'Binning x into intervals and one-hot encoding the bins lets the linear model learn one constant per bin: it now behaves like a tree with fixed splits.',
    binslope: 'Adding the original feature back gives each bin an offset with one shared slope; an interaction (bin × x) would give each bin its own slope.',
  };
  return (
    <Figure
      title="Binning makes a linear model more flexible"
      hint="Compare the four models"
      caption={
        <>
          The wave dataset (one input, noisy wavy target). Binning is most useful for linear models: it lets them represent non-linear
          relationships. It barely helps trees, which already split the input into intervals themselves.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          value={model}
          onChange={setModel}
          options={[
            { value: 'linear', label: 'Linear regression' },
            { value: 'tree', label: 'Decision tree' },
            { value: 'binned', label: 'Linear on bins' },
            { value: 'binslope', label: 'Bins + original feature' },
          ]}
        />
        {(model === 'binned' || model === 'binslope') && <Slider label="Bins" value={k} min={2} max={20} onChange={setK} />}
        <dl className="readout" style={{ minWidth: '8rem' }}>
          <dt>Training R²</dt>
          <dd>{fx(score, 3)}</dd>
        </dl>
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[-3, 3]} yDomain={[-2.4, 2.4]} height={270} xLabel="input feature" yLabel="target">
          {(s) => (
            <>
              {(model === 'binned' || model === 'binslope') &&
                edges.map((e, i) => <line key={i} x1={s.x(e)} x2={s.x(e)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--rule-strong)" strokeDasharray="3 3" />)}
              {WAVE.x.map((x, i) => (
                <circle key={i} cx={s.x(x)} cy={s.y(WAVE.y[i])} r={3.4} fill="var(--ultra)" opacity={0.75} />
              ))}
              <path d={line(xs.map((x) => [s.x(x), s.y(pred(x))]))} fill="none" stroke="var(--rose)" strokeWidth={2.6} />
            </>
          )}
        </Plot>
      </div>
      <p style={{ marginTop: '0.6rem', fontSize: '0.9rem', color: 'var(--ink-2)' }}>{desc[model]}</p>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Interaction features: ice-cream sales                                     */
/* ------------------------------------------------------------------------ */

export function InteractionFigure() {
  const [inter, setInter] = useState(true);
  const temps = [15, 20, 25, 30];
  const sales = (t: number, a: number) => (inter ? 500 + 0.0014 * t * a * 30 : 500 + 40 * (t - 15) + 0.9 * a);
  const ads = range(41).map((i) => i * 50);
  return (
    <Figure
      title="An interaction: the effect of advertising depends on temperature"
      hint="Toggle the interaction term"
      caption={
        <>
          Each line is a different temperature. Without an interaction term the model can only shift the line up or down for hotter days (same
          slope). With the product feature temperature × advertising, the slope itself changes: an extra ₹100 of advertising sells far more ice
          cream on a 30 °C day than on a 15 °C day.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Toggle label="Include temperature × advertising" checked={inter} onChange={setInter} />
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[0, 2000]} yDomain={[0, 3200]} height={250} xLabel="advertising spend (₹)" yLabel="sales (₹)">
          {(s) => (
            <>
              {temps.map((t, i) => (
                <g key={t}>
                  <path d={line(ads.map((a) => [s.x(a), s.y(sales(t, a))]))} fill="none" stroke={['var(--ultra)', 'var(--viridian)', 'var(--ochre)', 'var(--rose)'][i]} strokeWidth={2.4} />
                  <text x={s.x(2000) - 4} y={s.y(sales(t, 2000)) - 6} textAnchor="end" style={{ fill: ['var(--ultra)', 'var(--viridian)', 'var(--ochre)', 'var(--rose)'][i], fontWeight: 700 }}>
                    {t} °C
                  </text>
                </g>
              ))}
            </>
          )}
        </Plot>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Polynomial features: degree explorer on the wave data                     */
/* ------------------------------------------------------------------------ */

export function PolyFeaturesFigure() {
  const [deg, setDeg] = useState(3);
  const [nf, setNf] = useState(2);
  const [ridgeOn, setRidgeOn] = useState(false);
  const comb = (n: number, r: number) => {
    let c = 1;
    for (let i = 1; i <= r; i++) c = (c * (n - r + i)) / i;
    return Math.round(c);
  };
  const terms = comb(nf + deg, deg);
  const split = 60;
  const tr = { x: WAVE.x.slice(0, split), y: WAVE.y.slice(0, split) };
  const te = { x: WAVE.x.slice(split), y: WAVE.y.slice(split) };
  const feats = (x: number) => range(deg + 1).map((p) => (x / 3) ** p);
  const w = useMemo(() => {
    const X = tr.x.map(feats);
    const d = X[0].length;
    const A = range(d).map((i) => range(d).map((j) => sum(X.map((r) => r[i] * r[j])) + (i === j && i > 0 ? (ridgeOn ? 1 : 1e-10) : 0)));
    const b = range(d).map((i) => sum(X.map((r, kk) => r[i] * tr.y[kk])));
    return solve(A, b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deg, ridgeOn]);
  const pred = (x: number) => sum(feats(x).map((v, i) => v * w[i]));
  const trR2 = r2(tr.y, tr.x.map(pred));
  const teR2 = r2(te.y, te.x.map(pred));
  const xs = range(400).map((i) => -3 + (6 * i) / 399);
  return (
    <Figure
      title="Polynomial features: more terms, more flexibility, more risk"
      hint="Raise the degree; add Ridge regularisation"
      caption={
        <>
          PolynomialFeatures adds x², x³, … (and all products between features). A linear model on these features fits curves. The training R²
          keeps rising with the degree, but the test R² eventually collapses, and the curve swings wildly at the edges where data is scarce.
          Ridge regularisation tames high degrees.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Slider label="Degree" value={deg} min={1} max={15} onChange={setDeg} />
        <Toggle label="Ridge (α = 1)" checked={ridgeOn} onChange={setRidgeOn} />
        <dl className="readout" style={{ minWidth: '10rem' }}>
          <dt>Training R²</dt>
          <dd>{fx(trR2, 3)}</dd>
          <dt>Test R²</dt>
          <dd style={{ color: teR2 < 0.5 ? 'var(--rose)' : undefined }}>{fx(teR2, 3)}</dd>
        </dl>
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[-3, 3]} yDomain={[-2.6, 2.6]} height={270} xLabel="x" yLabel="y">
            {(s) => (
              <>
                {te.x.map((x, i) => (
                  <circle key={`t${i}`} cx={s.x(x)} cy={s.y(te.y[i])} r={3.2} fill="none" stroke="var(--ink-3)" />
                ))}
                {tr.x.map((x, i) => (
                  <circle key={i} cx={s.x(x)} cy={s.y(tr.y[i])} r={3.6} fill="var(--ultra)" />
                ))}
                <path d={line(xs.map((x) => [s.x(x), s.y(Math.max(-3, Math.min(3, pred(x))))]))} fill="none" stroke="var(--rose)" strokeWidth={2.4} />
              </>
            )}
          </Plot>
        </div>
        <div className="viz-side">
          <div className="panel">
            <h4>How many features does PolynomialFeatures make?</h4>
            <Slider label="Original features n" value={nf} min={1} max={10} onChange={setNf} />
            <p style={{ marginTop: '0.5rem' }}>
              With n = {nf} and degree {deg}: <strong>{terms.toLocaleString('en-IN')}</strong> columns (including the bias column), C(n + d, d).
            </p>
            {nf === 2 && deg <= 3 && (
              <p style={{ fontFamily: 'var(--font-code)', fontSize: '0.78rem', color: 'var(--ink-2)' }}>
                {deg >= 1 && '1, x₁, x₂'}
                {deg >= 2 && ', x₁², x₁x₂, x₂²'}
                {deg >= 3 && ', x₁³, x₁²x₂, x₁x₂², x₂³'}
              </p>
            )}
          </div>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Log transform of count data (Müller §4.4)                                 */
/* ------------------------------------------------------------------------ */

function poisson(rng: Rng, lam: number) {
  if (lam > 60) return Math.max(0, Math.round(gaussian(rng, lam, Math.sqrt(lam))));
  const L = Math.exp(-lam);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

const COUNTS = (() => {
  const rng = mulberry32(0);
  const n = 1000;
  const Xorg = range(n).map(() => [gaussian(rng), gaussian(rng), gaussian(rng)]);
  const w = [gaussian(rng), gaussian(rng), gaussian(rng)];
  const X = Xorg.map((r) => r.map((v) => poisson(rng, 10 * Math.exp(v))));
  const y = Xorg.map((r) => r[0] * w[0] + r[1] * w[1] + r[2] * w[2]);
  return { X, y };
})();

export function TransformFigure() {
  const [t, setT] = useState<'none' | 'log' | 'sqrt'>('none');
  const tf = (v: number) => (t === 'log' ? Math.log(v + 1) : t === 'sqrt' ? Math.sqrt(v) : v);
  const col = COUNTS.X.map((r) => tf(r[0]));
  const lo = Math.min(...col);
  const hi = Math.max(...col);
  const bins = 30;
  const hist = range(bins).map((i) => {
    const a = lo + ((hi - lo) * i) / bins;
    const b = lo + ((hi - lo) * (i + 1)) / bins;
    return { a, b, n: col.filter((v) => v >= a && (i === bins - 1 ? v <= b : v < b)).length };
  });
  const scores = useMemo(() => {
    const out: Record<string, number> = {};
    for (const k of ['none', 'log', 'sqrt'] as const) {
      const f2 = (v: number) => (k === 'log' ? Math.log(v + 1) : k === 'sqrt' ? Math.sqrt(v) : v);
      const X = COUNTS.X.map((r) => r.map(f2));
      const trn = 750;
      const m = ridge(X.slice(0, trn), COUNTS.y.slice(0, trn), 1);
      const p = X.slice(trn).map((x) => m.intercept + sum(x.map((v, j) => v * m.w[j])));
      out[k] = r2(COUNTS.y.slice(trn), p);
    }
    return out;
  }, []);
  const maxN = Math.max(...hist.map((h) => h.n));
  return (
    <Figure
      title="A log transform turns skewed counts into a bell shape"
      hint="Apply log or square root to the feature"
      caption={
        <>
          Synthetic count data like Müller and Guido’s example: most values are small, a few are huge (a Poisson distribution with varying
          rate). Linear models struggle with such features. After log(x + 1) the distribution is roughly symmetric and a Ridge regression on the
          same data does much better on the test set.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          value={t}
          onChange={setT}
          options={[
            { value: 'none', label: 'Raw counts' },
            { value: 'sqrt', label: '√x' },
            { value: 'log', label: 'log(x + 1)' },
          ]}
        />
        <dl className="readout" style={{ minWidth: '13rem' }}>
          <dt>Skewness</dt>
          <dd>{fx(skewness(col), 2)}</dd>
          <dt>Ridge test R², all features</dt>
          <dd style={{ color: scores[t] > 0.8 ? 'var(--viridian)' : 'var(--rose)' }}>{fx(scores[t], 3)}</dd>
        </dl>
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[lo, hi]} yDomain={[0, maxN * 1.1]} height={230} xLabel={t === 'none' ? 'value' : t === 'log' ? 'log(value + 1)' : '√value'} yLabel="count">
          {(s) => (
            <>
              {hist.map((h, i) => (
                <rect key={i} x={s.x(h.a) + 0.5} y={s.y(h.n)} width={Math.max(0.5, s.x(h.b) - s.x(h.a) - 1)} height={s.y(0) - s.y(h.n)} fill="var(--ultra)" opacity={0.8} />
              ))}
            </>
          )}
        </Plot>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Automatic feature selection                                               */
/* ------------------------------------------------------------------------ */

const FS = (() => {
  const rng = mulberry32(77);
  const n = 240;
  const nInf = 5;
  const nNoise = 15;
  const wTrue = [2.2, -1.8, 1.4, 1.0, -0.7];
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const inf = range(nInf).map(() => gaussian(rng));
    const noise = range(nNoise).map(() => gaussian(rng));
    const z = sum(inf.map((v, j) => v * wTrue[j])) + gaussian(rng, 0, 1);
    X.push([...inf, ...noise]);
    y.push(z > 0 ? 1 : 0);
  }
  // shuffle the column order so informative features are not first
  const order = [3, 12, 0, 17, 8, 1, 14, 6, 19, 2, 10, 15, 4, 11, 7, 16, 5, 13, 9, 18].map((v) => v);
  const Xo = X.map((r) => order.map((j) => r[j]));
  const informative = order.map((j) => j < nInf);
  return { X: standardize(Xo).Z, y, informative, d: nInf + nNoise };
})();

function anovaF(X: number[][], y: number[], j: number) {
  const g0 = X.filter((_, i) => y[i] === 0).map((r) => r[j]);
  const g1 = X.filter((_, i) => y[i] === 1).map((r) => r[j]);
  const all = X.map((r) => r[j]);
  const m = mean(all);
  const ssb = g0.length * (mean(g0) - m) ** 2 + g1.length * (mean(g1) - m) ** 2;
  const ssw = sum(g0.map((v) => (v - mean(g0)) ** 2)) + sum(g1.map((v) => (v - mean(g1)) ** 2));
  return ssb / 1 / (ssw / (all.length - 2));
}

export function FeatureSelectionFigure() {
  const [method, setMethod] = useState<'univariate' | 'model' | 'rfe'>('univariate');
  const [keep, setKeep] = useState(5);
  const F = useMemo(() => range(FS.d).map((j) => anovaF(FS.X, FS.y, j)), []);
  const model = useMemo(() => logisticFit(FS.X, FS.y, 0.5, 30), []);
  const coefs = model.w.slice(1).map(Math.abs);
  const rfe = useMemo(() => {
    // eliminate one feature at a time with logistic-regression coefficients
    let remaining = range(FS.d);
    const removed: number[] = [];
    while (remaining.length > 1) {
      const m = logisticFit(FS.X.map((r) => remaining.map((j) => r[j])), FS.y, 0.5, 25);
      const imp = m.w.slice(1).map(Math.abs);
      const worst = imp.indexOf(Math.min(...imp));
      removed.push(remaining[worst]);
      remaining = remaining.filter((_, k) => k !== worst);
    }
    removed.push(remaining[0]);
    return removed; // order of elimination; last is the strongest
  }, []);
  const s = useStepper(FS.d - keep + 1, 500);
  const scoresShown = method === 'univariate' ? F : method === 'model' ? coefs : coefs;
  const ranking = method === 'rfe' ? null : range(FS.d).sort((a, b) => scoresShown[b] - scoresShown[a]);
  const selected = new Set(method === 'rfe' ? rfe.slice(FS.d - keep) : ranking!.slice(0, keep));
  const eliminated = new Set(method === 'rfe' ? rfe.slice(0, s.i) : []);
  const correct = [...selected].filter((j) => FS.informative[j]).length;
  const maxS = Math.max(...scoresShown);
  return (
    <Figure
      title="Which features matter? Three automatic strategies"
      hint="Switch the method; step through RFE"
      caption={
        <>
          A classification dataset with 20 features, of which only 5 (marked ●) actually influence the label; the other 15 are pure noise.{' '}
          <b>Univariate</b> selection scores each feature alone with an ANOVA F-test. <b>Model-based</b> selection fits one model (here L2
          logistic regression) and keeps features with the largest coefficients. <b>RFE</b> repeatedly fits the model and removes the weakest
          feature until k remain.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          value={method}
          onChange={(v) => {
            setMethod(v);
            s.reset();
          }}
          options={[
            { value: 'univariate', label: 'Univariate (SelectKBest)' },
            { value: 'model', label: 'Model-based (SelectFromModel)' },
            { value: 'rfe', label: 'Recursive elimination (RFE)' },
          ]}
        />
        <Slider label="Features to keep k" value={keep} min={1} max={12} onChange={(v) => { setKeep(v); s.reset(); }} />
        <dl className="readout" style={{ minWidth: '12rem' }}>
          <dt>Truly informative among kept</dt>
          <dd>
            {correct} / {keep}
          </dd>
        </dl>
      </div>
      <div className="mini-bars">
        {range(FS.d).map((j) => {
          const sc = method === 'rfe' ? coefs[j] : scoresShown[j];
          const isSel = method === 'rfe' ? !eliminated.has(j) && (s.i < FS.d - keep ? true : selected.has(j)) : selected.has(j);
          const out = method === 'rfe' && eliminated.has(j);
          return (
            <div key={j} className="mini-bar" style={{ opacity: out ? 0.3 : 1, transition: 'opacity .3s' }}>
              <span style={{ fontWeight: 650 }}>
                {FS.informative[j] ? '● ' : '○ '}feature {j + 1}
              </span>
              <span className="mini-bar__track">
                <span className="mini-bar__fill" style={{ width: `${(sc / maxS) * 100}%`, background: isSel && !out ? 'var(--ultra)' : 'var(--rule-strong)' }} />
              </span>
              <span className="mini-bar__v">{out ? 'removed' : fx(sc, method === 'univariate' ? 1 : 2)}</span>
            </div>
          );
        })}
      </div>
      {method === 'rfe' && (
        <div style={{ marginTop: '0.8rem' }}>
          <StepperBar s={s} labels={(i) => (i === 0 ? `${FS.d} features` : `${FS.d - i} features left (removed feature ${rfe[i - 1] + 1})`)} />
        </div>
      )}
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Expert knowledge: bike rentals                                            */
/* ------------------------------------------------------------------------ */

const BIKES = (() => {
  const rng = mulberry32(9);
  const pts: { t: number; hour: number; day: number; y: number }[] = [];
  for (let d = 0; d < 31; d++)
    for (let h = 0; h < 24; h += 3) {
      const weekday = d % 7;
      const weekend = weekday >= 5;
      const commute = weekend ? 0 : 9 * Math.exp(-((h - 8) ** 2) / 4) + 11 * Math.exp(-((h - 18) ** 2) / 5);
      const leisure = weekend ? 10 * Math.exp(-((h - 14) ** 2) / 14) : 2 * Math.exp(-((h - 13) ** 2) / 10);
      pts.push({ t: d * 24 + h, hour: h, day: weekday, y: Math.max(0, 1 + commute + leisure + gaussian(rng, 0, 1.2)) });
    }
  return pts;
})();

export function BikeFigure() {
  const [feat, setFeat] = useState<'time' | 'hour' | 'hourday'>('time');
  const split = 23 * 8;
  const fx_ = (p: (typeof BIKES)[number]) => (feat === 'time' ? [p.t] : feat === 'hour' ? [p.hour] : [p.hour, p.day]);
  const tree = useMemo(() => {
    const tr = BIKES.slice(0, split);
    return buildCart(tr.map(fx_), tr.map((p) => p.y), { maxDepth: 8, regression: true, minLeaf: 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feat]);
  const pred = BIKES.map((p) => cartLeaf(tree, fx_(p)).value);
  const te = BIKES.slice(split);
  const teR2 = r2(te.map((p) => p.y), pred.slice(split));
  const maxY = Math.max(...BIKES.map((p) => p.y)) * 1.1;
  return (
    <Figure
      title="Domain knowledge beats raw timestamps"
      hint="Change the features given to the model"
      caption={
        <>
          Hourly bike rentals over a month (training: first 23 days; test: the last 8, shaded). A tree on the raw timestamp cannot extrapolate
          beyond the training period and predicts a flat line. Knowing that rentals follow the <b>hour of the day</b>, and differ between{' '}
          <b>weekdays and weekends</b>, turns the same model into a good one.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          value={feat}
          onChange={setFeat}
          options={[
            { value: 'time', label: 'Raw timestamp' },
            { value: 'hour', label: 'Hour of day' },
            { value: 'hourday', label: 'Hour + day of week' },
          ]}
        />
        <dl className="readout" style={{ minWidth: '8rem' }}>
          <dt>Test R²</dt>
          <dd style={{ color: teR2 > 0.7 ? 'var(--viridian)' : 'var(--rose)' }}>{fx(teR2, 3)}</dd>
        </dl>
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[0, 31 * 24]} yDomain={[0, maxY]} height={240} xTicks={range(6).map((i) => i * 6 * 24)} xFormat={(v) => `day ${Math.round(v / 24) + 1}`} yLabel="rentals">
          {(s) => (
            <>
              <rect x={s.x(split * 3)} y={s.m.t} width={s.x(31 * 24) - s.x(split * 3)} height={s.h} fill="var(--rose-soft)" />
              <path d={line(BIKES.map((p) => [s.x(p.t), s.y(p.y)]))} fill="none" stroke="var(--ultra)" strokeWidth={1.4} opacity={0.8} />
              <path d={line(BIKES.map((p, i) => [s.x(p.t), s.y(pred[i])]))} fill="none" stroke="var(--rose)" strokeWidth={1.8} />
            </>
          )}
        </Plot>
      </div>
      <div className="legend" style={{ marginTop: '0.5rem' }}>
        <span>
          <i className="keyline" style={{ color: 'var(--ultra)' }} /> actual rentals
        </span>
        <span>
          <i className="keyline" style={{ color: 'var(--rose)' }} /> tree prediction
        </span>
      </div>
    </Figure>
  );
}

export { mean, std, variance };
