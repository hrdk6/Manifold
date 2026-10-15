import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Seg, Slider, StepperBar, Toggle, useStepper } from '../components/controls';
import { cssVar, hexToRgb, Plot, type Scales } from '../components/Plot';
import { Figure } from '../components/prose';
import { ari, agglomerative, cutMerges, dbscan, kmeans, kmeansPP, kmeansTrace, silhouette, type Linkage } from '../lib/cluster';
import { blobs, circles, digits, moons } from '../lib/datasets';
import { f, fx } from '../lib/fmt';
import { dist2, mean, median, pca, quantile, range, std } from '../lib/math';
import { gaussian, mulberry32 } from '../lib/rng';
import { useThemeName } from '../lib/theme';
import { TSNE } from '../lib/tsne';

const line = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

export const CLUSTER_COLORS = ['var(--ultra)', 'var(--rose)', 'var(--ochre)', 'var(--viridian)', 'var(--violet)', '#2a9fd6', '#e8702a', '#7b9a2a', '#c74fb6', '#6b7a90'];
export const clusterColor = (i: number) => (i < 0 ? 'var(--ink-3)' : CLUSTER_COLORS[i % CLUSTER_COLORS.length]);

function Dot({ s, x, y, c, r = 4.2, hollow }: { s: Scales; x: number; y: number; c: number; r?: number; hollow?: boolean }) {
  return hollow ? (
    <circle cx={s.x(x)} cy={s.y(y)} r={r} fill="var(--surface)" stroke={clusterColor(c)} strokeWidth={1.6} />
  ) : (
    <circle cx={s.x(x)} cy={s.y(y)} r={r} fill={clusterColor(c)} stroke="var(--surface)" strokeWidth={1} />
  );
}

/* ------------------------------------------------------------------------ */
/* Supervised vs unsupervised: remove the labels                             */
/* ------------------------------------------------------------------------ */

const UNSUP = blobs(3, [[-2, -1], [2, 1.5], [0.5, -2.5]], 75, 0.7);

export function LabelsFigure() {
  const [mode, setMode] = useState<'labels' | 'none' | 'found'>('labels');
  const km = useMemo(() => kmeans(UNSUP.X, 3, mulberry32(4)), []);
  return (
    <Figure
      title="Same data, with and without labels"
      hint="Switch between the three views"
      caption={
        <>
          Supervised learning sees the colours (the labels) and learns to predict them. Unsupervised learning sees only grey points and must
          discover structure by itself; here k-means finds three groups. Whether those groups match anything meaningful is for a human to
          judge, since there is no ground truth to check against.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { value: 'labels', label: 'Labelled (supervised)' },
            { value: 'none', label: 'Unlabelled' },
            { value: 'found', label: 'Clusters found by k-means' },
          ]}
        />
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[-4.5, 4.5]} yDomain={[-4.5, 3.5]} height={300} equal>
          {(s) => (
            <>
              {UNSUP.X.map((x, i) =>
                mode === 'none' ? (
                  <circle key={i} cx={s.x(x[0])} cy={s.y(x[1])} r={4.2} fill="var(--ink-3)" opacity={0.7} />
                ) : (
                  <Dot key={i} s={s} x={x[0]} y={x[1]} c={mode === 'labels' ? UNSUP.y[i] : km.assign[i]} />
                ),
              )}
              {mode === 'found' &&
                km.centroids.map((c, k) => (
                  <path key={k} d={`M${s.x(c[0]) - 8} ${s.y(c[1])} h16 M${s.x(c[0])} ${s.y(c[1]) - 8} v16`} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
                ))}
            </>
          )}
        </Plot>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Feature scaling and its effect on k-means                                 */
/* ------------------------------------------------------------------------ */

const SCALE_DATA = (() => {
  const rng = mulberry32(19);
  const X: number[][] = [];
  const y: number[] = [];
  // age (years) vs annual income (₹ thousands): three customer groups, separated by age
  const groups = [
    [24, 520],
    [42, 560],
    [62, 540],
  ];
  for (let i = 0; i < 90; i++) {
    const g = i % 3;
    X.push([gaussian(rng, groups[g][0], 3.2), gaussian(rng, groups[g][1], 160)]);
    y.push(g);
  }
  X.push([40, 1900]);
  y.push(1); // an outlier earner
  return { X, y };
})();

type Scaler = 'raw' | 'standard' | 'minmax' | 'robust' | 'normalizer';

function applyScaler(X: number[][], kind: Scaler) {
  const cols = [0, 1].map((j) => X.map((r) => r[j]));
  if (kind === 'raw') return X.map((r) => r.slice());
  if (kind === 'standard') {
    const m = cols.map((c) => mean(c));
    const s = cols.map((c) => std(c, true));
    return X.map((r) => r.map((v, j) => (v - m[j]) / s[j]));
  }
  if (kind === 'minmax') {
    const lo = cols.map((c) => Math.min(...c));
    const hi = cols.map((c) => Math.max(...c));
    return X.map((r) => r.map((v, j) => (v - lo[j]) / (hi[j] - lo[j])));
  }
  if (kind === 'robust') {
    const md = cols.map((c) => median(c));
    const iqr = cols.map((c) => quantile(c, 0.75) - quantile(c, 0.25));
    return X.map((r) => r.map((v, j) => (v - md[j]) / iqr[j]));
  }
  return X.map((r) => {
    const n = Math.hypot(r[0], r[1]);
    return r.map((v) => v / n);
  });
}

export function ScalingFigure() {
  const [kind, setKind] = useState<Scaler>('raw');
  const Z = useMemo(() => applyScaler(SCALE_DATA.X, kind), [kind]);
  const km = useMemo(() => kmeans(Z, 3, mulberry32(8), 6), [Z]);
  const score = ari(km.assign, SCALE_DATA.y);
  const xs = Z.map((r) => r[0]);
  const ys = Z.map((r) => r[1]);
  const pad = (lo: number, hi: number): [number, number] => {
    const d = (hi - lo) * 0.08 || 1;
    return [lo - d, hi + d];
  };
  const xd = pad(Math.min(...xs), Math.max(...xs));
  const yd = pad(Math.min(...ys), Math.max(...ys));
  const equal = kind !== 'raw';
  const desc: Record<Scaler, string> = {
    raw: 'Age spans about 50 years; income spans about ₹1,500k. Euclidean distance is almost entirely income, so k-means splits the data by income and ignores the age groups.',
    standard: 'StandardScaler: each feature has mean 0 and standard deviation 1. Both features now count equally and k-means finds the three age groups.',
    minmax: 'MinMaxScaler: each feature is squeezed into [0, 1]. The single high earner compresses everyone else into a narrow income band.',
    robust: 'RobustScaler: centres on the median and divides by the inter-quartile range, so the outlier barely affects the scaling of everyone else.',
    normalizer: 'Normalizer: rescales each row (not each feature) to length 1, keeping only the direction. Useful for text and angles; wrong tool here.',
  };
  return (
    <Figure
      title="Feature scaling decides what k-means sees"
      hint="Choose a scaler and watch the clusters change"
      caption={
        <>
          Customers described by age (years) and annual income (₹ thousands), with one very high earner. The true groups differ by age. The
          plot is drawn with equal units on both axes after scaling, exactly as a distance-based algorithm sees the data. The agreement score
          (ARI) is 1 for a perfect match with the true groups, about 0 for random.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          value={kind}
          onChange={setKind}
          options={[
            { value: 'raw', label: 'No scaling' },
            { value: 'standard', label: 'StandardScaler' },
            { value: 'minmax', label: 'MinMaxScaler' },
            { value: 'robust', label: 'RobustScaler' },
            { value: 'normalizer', label: 'Normalizer' },
          ]}
        />
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={xd} yDomain={yd} height={320} equal={equal} xLabel={kind === 'raw' ? 'age (years)' : 'age (scaled)'} yLabel={kind === 'raw' ? 'income (₹k)' : 'income (scaled)'}>
            {(s) => (
              <>
                {Z.map((r, i) => (
                  <Dot key={i} s={s} x={r[0]} y={r[1]} c={km.assign[i]} r={i === Z.length - 1 ? 6 : 4.2} />
                ))}
              </>
            )}
          </Plot>
        </div>
        <div className="viz-side">
          <dl className="readout">
            <dt>k-means agreement with true groups (ARI)</dt>
            <dd style={{ color: score > 0.8 ? 'var(--viridian)' : score < 0.3 ? 'var(--rose)' : 'var(--ochre)' }}>{fx(score, 3)}</dd>
            <dt>Age range after scaling</dt>
            <dd>
              {f(Math.min(...xs), 2)} to {f(Math.max(...xs), 2)}
            </dd>
            <dt>Income range after scaling</dt>
            <dd>
              {f(Math.min(...ys), 2)} to {f(Math.max(...ys), 2)}
            </dd>
          </dl>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--ink-2)' }}>{desc[kind]}</p>
        </div>
      </div>
    </Figure>
  );
}

export function TrainTestScalingFigure() {
  const data = useMemo(() => {
    const rng = mulberry32(7);
    const tr = range(50).map(() => [gaussian(rng, 3, 1.4), gaussian(rng, 2, 0.9)]);
    const te = range(12).map(() => [gaussian(rng, 4.2, 1), gaussian(rng, 2.6, 0.6)]);
    return { tr, te };
  }, []);
  const mm = (X: number[][], ref: number[][]) => {
    const lo = [0, 1].map((j) => Math.min(...ref.map((r) => r[j])));
    const hi = [0, 1].map((j) => Math.max(...ref.map((r) => r[j])));
    return X.map((r) => r.map((v, j) => (v - lo[j]) / (hi[j] - lo[j])));
  };
  const panels = [
    { t: 'Original data', tr: data.tr, te: data.te, d: [-1, 7.5, -1, 5] as const },
    { t: 'Scaled correctly (fit on training set)', tr: mm(data.tr, data.tr), te: mm(data.te, data.tr), d: [-0.15, 1.25, -0.15, 1.2] as const },
    { t: 'Scaled wrongly (test fitted separately)', tr: mm(data.tr, data.tr), te: mm(data.te, data.te), d: [-0.15, 1.25, -0.15, 1.2] as const },
  ];
  return (
    <Figure
      title="Scale training and test data the same way"
      caption={
        <>
          The scaler’s parameters (minimum and maximum here) must be learned from the training set and then <b>applied unchanged</b> to the test
          set. Fitting a separate scaler on the test set moves the test points (rose) to different positions relative to the training points
          (blue), so the model sees data that no longer matches what it was trained on.
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '0.8rem' }}>
        {panels.map((p) => (
          <div key={p.t}>
            <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
              {p.t}
            </div>
            <div className="plot-wrap">
              <Plot xDomain={[p.d[0], p.d[1]]} yDomain={[p.d[2], p.d[3]]} height={200} xTicks={4} yTicks={4}>
                {(s) => (
                  <>
                    {p.tr.map((r, i) => (
                      <circle key={i} cx={s.x(r[0])} cy={s.y(r[1])} r={3.6} fill="var(--ultra)" opacity={0.75} />
                    ))}
                    {p.te.map((r, i) => (
                      <path key={`t${i}`} d={`M${s.x(r[0])} ${s.y(r[1]) - 5} L${s.x(r[0]) + 4.5} ${s.y(r[1]) + 3.5} L${s.x(r[0]) - 4.5} ${s.y(r[1]) + 3.5}Z`} fill="var(--rose)" />
                    ))}
                  </>
                )}
              </Plot>
            </div>
          </div>
        ))}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* PCA: find the direction of maximum variance                               */
/* ------------------------------------------------------------------------ */

const PCA_DATA = (() => {
  const rng = mulberry32(31);
  return range(60).map(() => {
    const t = gaussian(rng, 0, 1.6);
    const u = gaussian(rng, 0, 0.45);
    const a = 0.6;
    return [t * Math.cos(a) - u * Math.sin(a) + 0.4, t * Math.sin(a) + u * Math.cos(a) - 0.2];
  });
})();

export function PCAFigure() {
  const res = useMemo(() => pca(PCA_DATA, 2), []);
  const pcAngle = (Math.atan2(res.comps[0][1], res.comps[0][0]) * 180) / Math.PI;
  const [ang, setAng] = useState(10);
  const [showProj, setShowProj] = useState(true);
  const rad = (ang * Math.PI) / 180;
  const u = [Math.cos(rad), Math.sin(rad)];
  const mu = res.mu;
  const scores = PCA_DATA.map((p) => (p[0] - mu[0]) * u[0] + (p[1] - mu[1]) * u[1]);
  const v = mean(scores.map((s) => s * s)) * (PCA_DATA.length / (PCA_DATA.length - 1));
  const total = res.values[0] + res.values[1];
  const angles = range(181).map((a) => a - 90);
  const varAt = (a: number) => {
    const r = (a * Math.PI) / 180;
    const sc = PCA_DATA.map((p) => (p[0] - mu[0]) * Math.cos(r) + (p[1] - mu[1]) * Math.sin(r));
    return mean(sc.map((s) => s * s)) * (PCA_DATA.length / (PCA_DATA.length - 1));
  };
  const angNorm = ((((pcAngle + 90) % 180) + 180) % 180) - 90;
  return (
    <Figure
      title="PCA: rotate the axis until the projected spread is largest"
      hint="Drag the slider, or snap to the first principal component"
      caption={
        <>
          Each point is projected onto the rotating line (thin segments). The spread of those projections is the variance captured by that
          direction. The direction with the <b>maximum variance</b> is the first principal component (PC1), the eigenvector of the covariance
          matrix with the largest eigenvalue. PC2 is perpendicular to it and captures what is left. Keeping only PC1 reduces 2-D to 1-D while
          losing as little variance as possible.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Slider label="Axis angle" value={ang} min={-90} max={90} step={0.5} onChange={setAng} format={(a) => `${f(a, 1)}°`} width="14rem" />
        <button className="btn btn--primary btn--sm" onClick={() => setAng(Number(angNorm.toFixed(1)))}>
          Snap to PC1
        </button>
        <Toggle label="Show projections" checked={showProj} onChange={setShowProj} />
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[-4.5, 5]} yDomain={[-3.6, 3.4]} height={330} equal>
            {(s) => {
              const L = 6;
              return (
                <>
                  <line x1={s.x(mu[0] - u[0] * L)} y1={s.y(mu[1] - u[1] * L)} x2={s.x(mu[0] + u[0] * L)} y2={s.y(mu[1] + u[1] * L)} stroke="var(--ink)" strokeWidth={2} />
                  {showProj &&
                    PCA_DATA.map((p, i) => {
                      const q = [mu[0] + u[0] * scores[i], mu[1] + u[1] * scores[i]];
                      return <line key={`l${i}`} x1={s.x(p[0])} y1={s.y(p[1])} x2={s.x(q[0])} y2={s.y(q[1])} stroke="var(--rose)" strokeOpacity={0.45} />;
                    })}
                  {PCA_DATA.map((p, i) => (
                    <circle key={i} cx={s.x(p[0])} cy={s.y(p[1])} r={4} fill="var(--ultra)" stroke="var(--surface)" />
                  ))}
                  {showProj &&
                    scores.map((sc, i) => (
                      <circle key={`q${i}`} cx={s.x(mu[0] + u[0] * sc)} cy={s.y(mu[1] + u[1] * sc)} r={2.6} fill="var(--rose)" />
                    ))}
                  {res.comps.map((c, k) => {
                    const len = Math.sqrt(res.values[k]) * 2;
                    return (
                      <g key={k}>
                        <line x1={s.x(mu[0])} y1={s.y(mu[1])} x2={s.x(mu[0] + c[0] * len)} y2={s.y(mu[1] + c[1] * len)} stroke="var(--ochre)" strokeWidth={3} markerEnd="url(#pcarr)" />
                        <text x={s.x(mu[0] + c[0] * len) + 6} y={s.y(mu[1] + c[1] * len) - 4} style={{ fill: 'var(--ochre)', fontWeight: 800, fontSize: 12 }}>
                          PC{k + 1}
                        </text>
                      </g>
                    );
                  })}
                  <defs>
                    <marker id="pcarr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                      <path d="M0 0 L10 5 L0 10z" fill="var(--ochre)" />
                    </marker>
                  </defs>
                </>
              );
            }}
          </Plot>
        </div>
        <div className="viz-side">
          <div>
            <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
              Variance captured vs angle
            </div>
            <div className="plot-wrap">
              <Plot xDomain={[-90, 90]} yDomain={[0, res.values[0] * 1.12]} height={150} xTicks={[-90, -45, 0, 45, 90]} yTicks={3}>
                {(s) => (
                  <>
                    <path d={line(angles.map((a) => [s.x(a), s.y(varAt(a))]))} fill="none" stroke="var(--ultra)" strokeWidth={2} />
                    <line x1={s.x(ang)} x2={s.x(ang)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--rose)" strokeDasharray="3 3" />
                    <circle cx={s.x(ang)} cy={s.y(v)} r={4} fill="var(--rose)" />
                  </>
                )}
              </Plot>
            </div>
          </div>
          <dl className="readout">
            <dt>Variance along this axis</dt>
            <dd>{fx(v, 3)}</dd>
            <dt>λ₁ (PC1 variance)</dt>
            <dd>{fx(res.values[0], 3)}</dd>
            <dt>λ₂ (PC2 variance)</dt>
            <dd>{fx(res.values[1], 3)}</dd>
            <dt>Share kept by this axis</dt>
            <dd>{fx((v / total) * 100, 1)}%</dd>
            <dt>PC1 explains</dt>
            <dd>{fx(res.ratio[0] * 100, 1)}%</dd>
          </dl>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Curse of dimensionality: distances concentrate                            */
/* ------------------------------------------------------------------------ */

export function CurseFigure() {
  const dims = [1, 2, 3, 5, 10, 20, 50, 100, 200, 500];
  const data = useMemo(() => {
    const rng = mulberry32(2);
    return dims.map((d) => {
      const pts = range(300).map(() => range(d).map(() => rng()));
      const q = range(d).map(() => rng());
      const ds = pts.map((p) => Math.sqrt(dist2(p, q)));
      const mn = Math.min(...ds);
      const mx = Math.max(...ds);
      return { d, contrast: (mx - mn) / mn, mn, mx, avg: mean(ds) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sel, setSel] = useState(4);
  const cur = data[sel];
  return (
    <Figure
      title="The curse of dimensionality: everything becomes equally far away"
      hint="Pick a number of dimensions"
      caption={
        <>
          300 random points in a unit hypercube and one query point. In low dimensions the nearest point is much closer than the farthest. As
          dimensions grow, the ratio (farthest − nearest) / nearest collapses toward zero: every point is roughly the same distance away, so
          “nearest neighbour” stops meaning anything and distance-based methods (k-NN, k-means, DBSCAN) degrade. The data also becomes sparse:
          the volume grows exponentially while the number of samples does not.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg value={sel} onChange={setSel} options={data.map((d, i) => ({ value: i, label: `${d.d}-D` }))} />
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[0, dims.length - 1]} yDomain={[0, Math.max(...data.map((d) => Math.log10(d.contrast + 1))) * 1.1]} height={230} xTicks={range(dims.length)} xFormat={(v) => String(dims[Math.round(v)] ?? '')} xLabel="dimensions" yLabel="log₁₀(1 + contrast)">
            {(s) => (
              <>
                <path d={line(data.map((d, i) => [s.x(i), s.y(Math.log10(d.contrast + 1))]))} fill="none" stroke="var(--ultra)" strokeWidth={2.4} />
                {data.map((d, i) => (
                  <circle key={i} cx={s.x(i)} cy={s.y(Math.log10(d.contrast + 1))} r={i === sel ? 6 : 3.5} fill={i === sel ? 'var(--rose)' : 'var(--ultra)'} />
                ))}
              </>
            )}
          </Plot>
        </div>
        <dl className="readout" style={{ alignContent: 'start' }}>
          <dt>Dimensions</dt>
          <dd>{cur.d}</dd>
          <dt>Nearest distance</dt>
          <dd>{fx(cur.mn, 3)}</dd>
          <dt>Farthest distance</dt>
          <dd>{fx(cur.mx, 3)}</dd>
          <dt>Relative contrast</dt>
          <dd>{fx(cur.contrast, 3)}</dd>
          <dt>Samples to keep 10 per unit length</dt>
          <dd>{cur.d <= 15 ? (10 ** cur.d).toLocaleString('en-IN') : `10^${cur.d}`}</dd>
        </dl>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Digits: PCA explained variance and reconstruction                         */
/* ------------------------------------------------------------------------ */

const DIGITS = digits(23, 30); // 300 samples, 64 features

function DigitCanvas({ img, size = 56, tint }: { img: number[]; size?: number; tint?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useThemeName();
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const ink = hexToRgb(cssVar(tint ?? '--ink') || '#172033');
    const bg = hexToRgb(cssVar('--surface') || '#ffffff');
    const im = ctx.createImageData(8, 8);
    img.forEach((v, i) => {
      const t = Math.max(0, Math.min(1, v / 16));
      im.data[i * 4] = bg[0] + (ink[0] - bg[0]) * t;
      im.data[i * 4 + 1] = bg[1] + (ink[1] - bg[1]) * t;
      im.data[i * 4 + 2] = bg[2] + (ink[2] - bg[2]) * t;
      im.data[i * 4 + 3] = 255;
    });
    ctx.putImageData(im, 0, 0);
  }, [img, theme, tint]);
  return <canvas ref={ref} width={8} height={8} style={{ width: size, height: size, imageRendering: 'pixelated', borderRadius: 4, border: '1px solid var(--rule)' }} />;
}

export function DigitsPCAFigure() {
  const res = useMemo(() => pca(DIGITS.X, 64), []);
  const [k, setK] = useState(5);
  const cum = res.ratio.reduce<number[]>((acc, r) => [...acc, (acc[acc.length - 1] ?? 0) + r], []);
  const samples = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => DIGITS.y.indexOf(d));
  const recon = (i: number) => {
    const x = DIGITS.X[i];
    const z = res.comps.slice(0, k).map((c) => c.reduce((s, cj, j) => s + cj * (x[j] - res.mu[j]), 0));
    return res.mu.map((m, j) => m + z.reduce((s, zk, kk) => s + zk * res.comps[kk][j], 0));
  };
  return (
    <Figure
      title="How many components do you need?"
      hint="Keep more or fewer principal components"
      caption={
        <>
          300 handwritten digits, each an 8 × 8 image (64 features). The bars show the share of variance each component explains; the line is
          the running total. The bottom row rebuilds each digit from only the first k components: with a handful the digits are recognisable,
          because most of the 64 pixels are redundant.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Slider label="Components kept k" value={k} min={1} max={40} onChange={setK} />
        <dl className="readout" style={{ minWidth: '13rem' }}>
          <dt>Variance kept</dt>
          <dd>{fx(cum[k - 1] * 100, 1)}%</dd>
          <dt>Dimensions</dt>
          <dd>64 → {k}</dd>
        </dl>
      </div>
      <div className="plot-wrap" style={{ marginBottom: '0.8rem' }}>
        <Plot xDomain={[0, 41]} yDomain={[0, 1]} height={180} xLabel="principal component" yTicks={[0, 0.25, 0.5, 0.75, 1]}>
          {(s) => (
            <>
              {res.ratio.slice(0, 40).map((r, i) => (
                <rect key={i} x={s.x(i + 0.6)} y={s.y(r)} width={Math.max(1, s.x(1.4) - s.x(0.6) - 1)} height={s.y(0) - s.y(r)} fill={i < k ? 'var(--ultra)' : 'var(--rule-strong)'} />
              ))}
              <path d={line(cum.slice(0, 40).map((c, i) => [s.x(i + 1), s.y(c)]))} fill="none" stroke="var(--rose)" strokeWidth={2} />
            </>
          )}
        </Plot>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 0.8rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--ink-3)' }}>
        <span>original</span>
        <div className="digit-strip">
          {samples.map((i) => (
            <DigitCanvas key={i} img={DIGITS.X[i]} size={40} />
          ))}
        </div>
        <span>{k} PCs</span>
        <div className="digit-strip">
          {samples.map((i) => (
            <DigitCanvas key={i} img={recon(i)} size={40} tint="--ultra" />
          ))}
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* t-SNE vs PCA on digits, animated                                          */
/* ------------------------------------------------------------------------ */

export function TSNEFigure() {
  const sub = useMemo(() => digits(5, 20), []); // 200 digits
  const pc = useMemo(() => pca(sub.X, 2), [sub]);
  const [perp, setPerp] = useState(20);
  const [running, setRunning] = useState(true);
  const [iter, setIter] = useState(0);
  const [, force] = useState(0);
  const ts = useRef<TSNE | null>(null);
  useEffect(() => {
    ts.current = new TSNE(sub.X, perp, mulberry32(1), 100);
    setIter(0);
    setRunning(true);
  }, [sub, perp]);
  useEffect(() => {
    if (!running) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const tick = () => {
      const t = ts.current;
      if (!t) return;
      const n = reduce ? 40 : 4;
      for (let i = 0; i < n && t.iter < 700; i++) t.step();
      setIter(t.iter);
      force((v) => v + 1);
      if (t.iter < 700) raf = requestAnimationFrame(tick);
      else setRunning(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, perp]);
  const Y = ts.current?.Y ?? [];
  const ext = (vals: number[]): [number, number] => {
    if (!vals.length) return [-1, 1];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const p = (hi - lo) * 0.08 + 1e-6;
    return [lo - p, hi + p];
  };
  const panel = (pts: number[][], title: string) => (
    <div>
      <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
        {title}
      </div>
      <div className="plot-wrap">
        <Plot xDomain={ext(pts.map((p) => p[0]))} yDomain={ext(pts.map((p) => p[1]))} height={300} axes={false} grid={false}>
          {(s) => (
            <>
              {pts.map((p, i) => (
                <text key={i} x={s.x(p[0])} y={s.y(p[1]) + 4} textAnchor="middle" style={{ fill: clusterColor(sub.y[i]), fontWeight: 800, fontSize: 12 }}>
                  {sub.y[i]}
                </text>
              ))}
            </>
          )}
        </Plot>
      </div>
    </div>
  );
  return (
    <Figure
      title="PCA versus t-SNE on handwritten digits"
      hint="Watch t-SNE optimise; change the perplexity"
      caption={
        <>
          Each number is one 64-pixel digit image, drawn at its 2-D position. PCA (left) is a linear projection that preserves global variance:
          some digits separate, many overlap. t-SNE (right) optimises positions so that points that were neighbours in 64-D stay neighbours in
          2-D, and pulls the ten digit classes into distinct clusters, without ever being told the labels.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Slider label="Perplexity" value={perp} min={5} max={50} onChange={setPerp} />
        <button className="btn btn--sm" onClick={() => setRunning((r) => !r)} disabled={iter >= 700}>
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            ts.current = new TSNE(sub.X, perp, mulberry32(Math.floor(Math.random() * 1000)), 100);
            setIter(0);
            setRunning(true);
          }}
        >
          Restart with new seed
        </button>
        <span className="figure__hint">
          Iteration {iter} of 700{iter < 100 ? ' (early exaggeration)' : ''}
          {ts.current && iter > 100 ? `, KL = ${fx(ts.current.cost, 3)}` : ''}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: '1rem' }}>
        {panel(pc.proj, 'PCA: first two components')}
        {panel(Y, 't-SNE embedding')}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* k-means stepper                                                           */
/* ------------------------------------------------------------------------ */

const KM_SETS: Record<string, number[][]> = {
  blobs: blobs(10, [[-2.2, 1.5], [2, 1.8], [0, -2]], 75, 0.75).X,
  uneven: blobs(12, [[-2, 0], [1.8, 0.4], [2.6, -0.4]], 60, 0.55).X.concat(blobs(13, [[-2, 0]], 40, 1.1).X),
  moons: moons(4, 100, 0.08).X.map((r) => [r[0] * 2.4 - 1.2, r[1] * 2.4 - 0.6]),
};

export function KMeansFigure() {
  const [set, setSet] = useState<keyof typeof KM_SETS>('blobs');
  const [k, setK] = useState(3);
  const [seed, setSeed] = useState(2);
  const [init, setInit] = useState<'random' | 'pp'>('random');
  const X = KM_SETS[set];
  const trace = useMemo(() => {
    const rng = mulberry32(seed);
    const C = init === 'pp' ? kmeansPP(X, k, rng) : range(k).map(() => X[Math.floor(rng() * X.length)].slice());
    return kmeansTrace(X, C, 30);
  }, [X, k, seed, init]);
  // stages: for each iteration: 0 = show centroids, 1 = assign, 2 = move centroids
  const stages = trace.length * 2 + 1;
  const s = useStepper(stages, 900);
  const it = Math.min(trace.length - 1, Math.floor(Math.max(0, s.i - 1) / 2));
  const phase = s.i === 0 ? 'init' : (s.i - 1) % 2 === 0 ? 'assign' : 'update';
  const cur = trace[it];
  const centroids = phase === 'update' ? cur.newCentroids : cur.centroids;
  const showAssign = phase !== 'init';
  const elbow = useMemo(
    () =>
      range(8, 1).map((kk) => {
        const r = kmeans(X, kk, mulberry32(3), 4);
        return { k: kk, inertia: r.inertia };
      }),
    [X],
  );
  const converged = phase === 'update' && it === trace.length - 1;
  return (
    <Figure
      title="k-means, one step at a time"
      hint="Play, or step through assign → update"
      caption={
        <>
          k-means alternates two steps. <b>Assign</b>: colour every point by its nearest centroid (the shaded regions are these Voronoi cells).{' '}
          <b>Update</b>: move each centroid (cross) to the mean of its points. It stops when assignments no longer change. Try a few random seeds:
          different starting centroids can give different final clusters. On the moons, k-means fails because it can only make convex clusters.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          label="Data"
          value={set}
          onChange={(v) => {
            setSet(v);
            s.reset();
          }}
          options={[
            { value: 'blobs', label: 'Three blobs' },
            { value: 'uneven', label: 'Uneven sizes' },
            { value: 'moons', label: 'Two moons' },
          ]}
        />
        <Slider label="k" value={k} min={1} max={6} onChange={(v) => { setK(v); s.reset(); }} width="7rem" />
        <Seg
          label="Initialisation"
          value={init}
          onChange={(v) => {
            setInit(v);
            s.reset();
          }}
          options={[
            { value: 'random', label: 'Random points' },
            { value: 'pp', label: 'k-means++' },
          ]}
        />
        <button className="btn btn--ghost btn--sm" onClick={() => { setSeed((v) => v + 1); s.reset(); }}>
          New random start
        </button>
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot
            xDomain={[-4.5, 4.5]}
            yDomain={[-4, 4]}
            height={340}
            equal
            layer={(ctx, sc) => {
              const cols = ['--ultra', '--rose', '--ochre', '--viridian', '--violet'].map((v) => hexToRgb(cssVar(v) || '#888888'));
              const extra = ['#2a9fd6', '#e8702a'].map(hexToRgb);
              const all = [...cols, ...extra];
              for (let py = sc.m.t; py < sc.m.t + sc.h; py += 5)
                for (let px = sc.m.l; px < sc.m.l + sc.w; px += 5) {
                  const p = [sc.ix(px + 2.5), sc.iy(py + 2.5)];
                  let bi = 0;
                  let bd = Infinity;
                  centroids.forEach((c, i) => {
                    const d = dist2(p, c);
                    if (d < bd) {
                      bd = d;
                      bi = i;
                    }
                  });
                  const c = all[bi % all.length];
                  ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.1)`;
                  ctx.fillRect(px, py, 5.5, 5.5);
                }
            }}
            layerKey={`${centroids.map((c) => c.join()).join('|')}`}
          >
            {(sc) => (
              <>
                {X.map((p, i) =>
                  showAssign ? <Dot key={i} s={sc} x={p[0]} y={p[1]} c={cur.assign[i]} r={3.6} /> : <circle key={i} cx={sc.x(p[0])} cy={sc.y(p[1])} r={3.6} fill="var(--ink-3)" opacity={0.7} />,
                )}
                {phase === 'update' &&
                  cur.centroids.map((c, j) => (
                    <line key={`m${j}`} x1={sc.x(c[0])} y1={sc.y(c[1])} x2={sc.x(cur.newCentroids[j][0])} y2={sc.y(cur.newCentroids[j][1])} stroke="var(--ink)" strokeDasharray="3 3" strokeWidth={1.5} />
                  ))}
                {centroids.map((c, j) => (
                  <g key={j}>
                    <circle cx={sc.x(c[0])} cy={sc.y(c[1])} r={11} fill="var(--surface)" stroke={clusterColor(j)} strokeWidth={3} />
                    <path d={`M${sc.x(c[0]) - 5} ${sc.y(c[1])} h10 M${sc.x(c[0])} ${sc.y(c[1]) - 5} v10`} stroke="var(--ink)" strokeWidth={2.4} strokeLinecap="round" />
                  </g>
                ))}
              </>
            )}
          </Plot>
        </div>
        <div className="viz-side">
          <div className="trace">
            <div className="trace__title">
              {phase === 'init' ? 'Initialise' : `Iteration ${it + 1}: ${phase === 'assign' ? 'assign points' : 'update centroids'}`}
            </div>
            <div style={{ color: 'var(--ink-2)' }}>
              {phase === 'init' && `Pick ${k} starting centroids (${init === 'pp' ? 'k-means++ spreads them out' : 'random data points'}).`}
              {phase === 'assign' && `Each point joins its nearest centroid. Inertia (sum of squared distances) = ${fx(cur.inertia, 2)}.`}
              {phase === 'update' && (converged ? 'Centroids no longer move: converged.' : 'Each centroid moves to the mean of its assigned points.')}
            </div>
          </div>
          <div>
            <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
              Elbow method: inertia against k
            </div>
            <div className="plot-wrap">
              <Plot xDomain={[1, 8]} yDomain={[0, elbow[0].inertia * 1.05]} height={150} xTicks={range(8, 1)} yTicks={3} xLabel="k">
                {(sc) => (
                  <>
                    <path d={line(elbow.map((e) => [sc.x(e.k), sc.y(e.inertia)]))} fill="none" stroke="var(--ultra)" strokeWidth={2} />
                    {elbow.map((e) => (
                      <circle key={e.k} cx={sc.x(e.k)} cy={sc.y(e.inertia)} r={e.k === k ? 5.5 : 3} fill={e.k === k ? 'var(--rose)' : 'var(--ultra)'} />
                    ))}
                  </>
                )}
              </Plot>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: '0.8rem' }}>
        <StepperBar s={s} labels={(i) => (i === 0 ? 'Initial centroids' : `Step ${i} of ${stages - 1}`)} />
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Agglomerative clustering with dendrogram                                  */
/* ------------------------------------------------------------------------ */

const AG_PTS = [
  [1, 1],
  [1.5, 1.6],
  [2.2, 1.1],
  [5, 4.2],
  [5.6, 4.8],
  [6.2, 4.1],
  [3.6, 2.9],
  [8, 1],
  [8.5, 1.7],
  [4.4, 5.8],
];
const AG_LABELS = 'ABCDEFGHIJ'.split('');

export function DendrogramFigure() {
  const [link, setLink] = useState<Linkage>('single');
  const merges = useMemo(() => agglomerative(AG_PTS, link), [link]);
  const s = useStepper(merges.length + 1, 900);
  const done = s.i;
  const k = AG_PTS.length - done;
  const labels = useMemo(() => cutMerges(AG_PTS.length, merges, Math.max(1, k)), [merges, k]);
  // leaf order for the dendrogram
  const order: number[] = [];
  const childrenOf = new Map<number, [number, number]>();
  merges.forEach((m) => childrenOf.set(m.id, [m.a, m.b]));
  const walk = (id: number) => {
    const c = childrenOf.get(id);
    if (!c) order.push(id);
    else {
      walk(c[0]);
      walk(c[1]);
    }
  };
  walk(merges[merges.length - 1].id);
  const maxD = merges[merges.length - 1].dist;
  const W = 520;
  const H = 230;
  const xOf = new Map<number, number>();
  order.forEach((leaf, i) => xOf.set(leaf, 30 + (i * (W - 60)) / (order.length - 1)));
  const yOf = (d: number) => H - 30 - (d / maxD) * (H - 50);
  const hOf = new Map<number, number>();
  merges.forEach((m) => {
    xOf.set(m.id, ((xOf.get(m.a) ?? 0) + (xOf.get(m.b) ?? 0)) / 2);
    hOf.set(m.id, m.dist);
  });
  return (
    <Figure
      title="Agglomerative clustering builds a dendrogram"
      hint="Step through the merges; change the linkage"
      caption={
        <>
          Start with every point as its own cluster and repeatedly merge the two closest clusters. The dendrogram records each merge at the
          height of the distance at which it happened. Cutting it horizontally gives any number of clusters; a long vertical gap before the next
          merge suggests a natural number of clusters. The linkage decides how “distance between clusters” is measured.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          label="Linkage"
          value={link}
          onChange={(v) => {
            setLink(v);
            s.reset();
          }}
          options={[
            { value: 'single', label: 'Single (min)' },
            { value: 'complete', label: 'Complete (max)' },
            { value: 'average', label: 'Average' },
            { value: 'ward', label: 'Ward' },
          ]}
        />
      </div>
      <div className="viz-grid">
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Dendrogram">
            <line x1={20} x2={W - 10} y1={H - 30} y2={H - 30} stroke="var(--rule-strong)" />
            {merges.slice(0, done).map((m) => {
              const xa = xOf.get(m.a)!;
              const xb = xOf.get(m.b)!;
              const ya = hOf.has(m.a) ? yOf(hOf.get(m.a)!) : H - 30;
              const yb = hOf.has(m.b) ? yOf(hOf.get(m.b)!) : H - 30;
              const y = yOf(m.dist);
              return <path key={m.id} d={`M${xa} ${ya} V${y} H${xb} V${yb}`} fill="none" stroke="var(--ink)" strokeWidth={1.8} />;
            })}
            {done > 0 && done < merges.length && (
              <line x1={20} x2={W - 10} y1={(yOf(merges[done - 1].dist) + yOf(merges[done].dist)) / 2} y2={(yOf(merges[done - 1].dist) + yOf(merges[done].dist)) / 2} stroke="var(--rose)" strokeDasharray="5 4" strokeWidth={1.5} />
            )}
            {order.map((leaf) => (
              <text key={leaf} x={xOf.get(leaf)} y={H - 12} textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13, fill: clusterColor(labels[leaf]) }}>
                {AG_LABELS[leaf]}
              </text>
            ))}
          </svg>
        </div>
        <div className="plot-wrap">
          <Plot xDomain={[0, 9.5]} yDomain={[0, 6.6]} height={230} equal xTicks={5} yTicks={4}>
            {(sc) => (
              <>
                {AG_PTS.map((p, i) => (
                  <g key={i}>
                    <circle cx={sc.x(p[0])} cy={sc.y(p[1])} r={9} fill={clusterColor(labels[i])} opacity={0.9} />
                    <text x={sc.x(p[0])} y={sc.y(p[1]) + 4} textAnchor="middle" style={{ fill: 'var(--surface)', fontWeight: 800, fontSize: 10 }}>
                      {AG_LABELS[i]}
                    </text>
                  </g>
                ))}
              </>
            )}
          </Plot>
        </div>
      </div>
      <div style={{ marginTop: '0.8rem' }}>
        <StepperBar
          s={s}
          labels={(i) => (i === 0 ? `${AG_PTS.length} singleton clusters` : `Merge ${i}: ${k} clusters left (distance ${fx(merges[i - 1].dist, 2)})`)}
        />
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* DBSCAN                                                                    */
/* ------------------------------------------------------------------------ */

const DB_DATA = (() => {
  const m = moons(21, 120, 0.07).X.map((r) => [r[0] * 2.2 - 1, r[1] * 2.2 - 0.5]);
  const rng = mulberry32(5);
  const noise = range(14).map(() => [rng() * 7 - 3.5, rng() * 5.5 - 2.7]);
  return [...m, ...noise];
})();

export function DBSCANFigure() {
  const [eps, setEps] = useState(0.45);
  const [minPts, setMinPts] = useState(5);
  const [circlesOn, setCirclesOn] = useState(false);
  const res = useMemo(() => dbscan(DB_DATA, eps, minPts), [eps, minPts]);
  const km = useMemo(() => kmeans(DB_DATA, 2, mulberry32(2)), []);
  const [algo, setAlgo] = useState<'db' | 'km'>('db');
  const counts = { core: res.kind.filter((k) => k === 'core').length, border: res.kind.filter((k) => k === 'border').length, noise: res.kind.filter((k) => k === 'noise').length };
  return (
    <Figure
      title="DBSCAN: clusters are dense regions"
      hint="Change ε and MinPts; compare with k-means"
      caption={
        <>
          A point with at least MinPts points (itself included) within distance ε is a <b>core</b> point (large dot). Points within ε of a core
          point but not dense themselves are <b>border</b> points (small dot). Everything else is <b>noise</b> (grey ring). Clusters grow by
          chaining core points, so they can take any shape: DBSCAN finds both moons, which k-means with k = 2 cannot.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          value={algo}
          onChange={setAlgo}
          options={[
            { value: 'db', label: 'DBSCAN' },
            { value: 'km', label: 'k-means (k = 2)' },
          ]}
        />
        {algo === 'db' && (
          <>
            <Slider label="ε (eps)" value={eps} min={0.1} max={1.2} step={0.01} onChange={setEps} format={(v) => f(v, 2)} />
            <Slider label="MinPts" value={minPts} min={2} max={15} onChange={setMinPts} />
            <Toggle label="Show ε circles" checked={circlesOn} onChange={setCirclesOn} />
          </>
        )}
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[-3.8, 3.8]} yDomain={[-3, 2.9]} height={330} equal>
            {(sc) => {
              const r = sc.x(eps) - sc.x(0);
              return (
                <>
                  {algo === 'db' &&
                    circlesOn &&
                    DB_DATA.map((p, i) =>
                      res.kind[i] === 'core' ? <circle key={`c${i}`} cx={sc.x(p[0])} cy={sc.y(p[1])} r={r} fill={clusterColor(res.label[i])} opacity={0.06} stroke={clusterColor(res.label[i])} strokeOpacity={0.25} /> : null,
                    )}
                  {DB_DATA.map((p, i) => {
                    if (algo === 'km') return <Dot key={i} s={sc} x={p[0]} y={p[1]} c={km.assign[i]} />;
                    const kind = res.kind[i];
                    if (kind === 'noise') return <circle key={i} cx={sc.x(p[0])} cy={sc.y(p[1])} r={4} fill="none" stroke="var(--ink-3)" strokeWidth={1.6} />;
                    return <Dot key={i} s={sc} x={p[0]} y={p[1]} c={res.label[i]} r={kind === 'core' ? 4.6 : 2.8} />;
                  })}
                </>
              );
            }}
          </Plot>
        </div>
        <dl className="readout" style={{ alignContent: 'start' }}>
          {algo === 'db' ? (
            <>
              <dt>Clusters found</dt>
              <dd>{res.nClusters}</dd>
              <dt>Core points</dt>
              <dd>{counts.core}</dd>
              <dt>Border points</dt>
              <dd>{counts.border}</dd>
              <dt>Noise points</dt>
              <dd>{counts.noise}</dd>
              <dt>Silhouette (non-noise)</dt>
              <dd>{fx(silhouette(DB_DATA, res.label), 3)}</dd>
            </>
          ) : (
            <>
              <dt>Clusters</dt>
              <dd>2 (fixed in advance)</dd>
              <dt>Noise points</dt>
              <dd>0 (every point is assigned)</dd>
            </>
          )}
        </dl>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Comparing algorithms across datasets                                       */
/* ------------------------------------------------------------------------ */

export function CompareClusteringFigure() {
  const sets = useMemo(() => {
    const b = blobs(41, [[-2, -1], [2, -1], [0, 2]], 90, 0.6);
    const m = moons(42, 100, 0.07);
    const c = circles(43, 120, 0.05, 0.45);
    return [
      { name: 'Blobs', X: b.X, y: b.y, k: 3, eps: 0.6 },
      { name: 'Moons', X: m.X.map((r) => [r[0] * 2 - 1, r[1] * 2 - 0.5]), y: m.y, k: 2, eps: 0.38 },
      { name: 'Circles', X: c.X.map((r) => [r[0] * 2.5, r[1] * 2.5]), y: c.y, k: 2, eps: 0.42 },
    ];
  }, []);
  const results = useMemo(
    () =>
      sets.map((d) => {
        const km = kmeans(d.X, d.k, mulberry32(1)).assign;
        const ag = cutMerges(d.X.length, agglomerative(d.X, 'ward'), d.k);
        const agS = cutMerges(d.X.length, agglomerative(d.X, 'single'), d.k);
        const db = dbscan(d.X, d.eps, 5).label;
        return [
          { name: 'k-means', lab: km },
          { name: 'Agglomerative (ward)', lab: ag },
          { name: 'Agglomerative (single)', lab: agS },
          { name: 'DBSCAN', lab: db },
        ];
      }),
    [sets],
  );
  return (
    <Figure
      title="No clustering algorithm wins everywhere"
      caption={
        <>
          Four algorithms on three datasets with known groups. ARI (adjusted Rand index) compares the result with the true grouping: 1 is perfect,
          about 0 is random. k-means and Ward linkage assume compact, roughly spherical clusters; single linkage and DBSCAN follow connected
          shapes but can chain clusters together or mark points as noise (grey).
        </>
      }
    >
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '5rem repeat(4, minmax(8.5rem, 1fr))', gap: '0.5rem', minWidth: '40rem' }}>
          <span />
          {results[0].map((r) => (
            <div key={r.name} className="ctl__label" style={{ justifyContent: 'center', textAlign: 'center' }}>
              {r.name}
            </div>
          ))}
          {sets.map((d, di) => (
            <Fragment key={d.name}>
              <div className="ctl__label" style={{ alignSelf: 'center' }}>
                {d.name}
              </div>
              {results[di].map((r) => (
                <div key={`${di}${r.name}`}>
                  <div className="plot-wrap">
                    <Plot xDomain={[-3.4, 3.4]} yDomain={[-3, 3]} height={130} axes={false} grid={false} equal>
                      {(sc) => (
                        <>
                          {d.X.map((p, i) => (
                            <circle key={i} cx={sc.x(p[0])} cy={sc.y(p[1])} r={2.4} fill={clusterColor(r.lab[i])} />
                          ))}
                        </>
                      )}
                    </Plot>
                  </div>
                  <div style={{ fontSize: '0.74rem', textAlign: 'center', color: 'var(--ink-2)', marginTop: 2 }}>ARI {fx(ari(r.lab, d.y), 2)}</div>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </Figure>
  );
}
