import { useMemo, useRef, useState } from 'react';
import { Seg, Slider, Toggle } from '../components/controls';
import { cssVar, hexToRgb, Marker, Plot } from '../components/Plot';
import { Figure } from '../components/prose';
import { curve, forge, wave } from '../lib/datasets';
import { f, fx } from '../lib/fmt';
import { mean, polyfit, polyval, range, sum } from '../lib/math';
import { lasso, ridge, standardize } from '../lib/linear';
import { gaussian, mulberry32 } from '../lib/rng';
import { knnPredict, ols1, type Metric } from '../lib/supervised';
import { Playground2D, type LPoint } from './playground';

const line = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

/* ------------------------------------------------------------------------ */
/* Model complexity: polynomial degree vs train/test error                   */
/* ------------------------------------------------------------------------ */

const truth = (x: number) => Math.sin(2 * Math.PI * x) * 0.9 + 0.4 * x;

export function ComplexityFigure() {
  const [deg, setDeg] = useState(3);
  const [n, setN] = useState(20);
  const train = useMemo(() => curve(5, n, truth, 0.28), [n]);
  const test = useMemo(() => curve(99, 200, truth, 0.28), []);
  const scale = (x: number) => x * 2 - 1;
  const fits = useMemo(
    () =>
      range(16).map((d) => {
        const c = polyfit(train.x.map(scale), train.y, d, 1e-9);
        const mse = (xs: number[], ys: number[]) => mean(xs.map((x, i) => (polyval(c, scale(x)) - ys[i]) ** 2));
        return { c, tr: mse(train.x, train.y), te: mse(test.x, test.y) };
      }),
    [train, test],
  );
  const cur = fits[deg];
  const bestDeg = fits.reduce((b, v, i) => (v.te < fits[b].te ? i : b), 0);
  const xs = range(161).map((i) => i / 160);
  const verdict = deg < Math.max(1, bestDeg - 1) ? 'Underfitting: too simple to follow the curve.' : deg > bestDeg + 3 ? 'Overfitting: chasing the noise between points.' : 'About right: captures the trend, ignores the noise.';
  const errMax = 0.8;

  return (
    <Figure
      title="Model complexity, overfitting and underfitting"
      hint="Change the polynomial degree and the amount of training data"
      caption={
        <>
          Filled dots are training data, hollow ones unseen test data, the dashed line the true function. As the degree grows, training
          error always falls, but test error falls then <b>rises again</b>. The sweet spot sits at the bottom of the test curve. With more
          training data the same high-degree model overfits far less.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '1rem' }}>
        <Slider label="Polynomial degree" value={deg} min={0} max={15} onChange={setDeg} />
        <Slider label="Training points" value={n} min={8} max={120} onChange={setN} />
        <div className="legend">
          <span>
            <i style={{ background: 'var(--ultra)' }} /> train
          </span>
          <span>
            <i style={{ background: 'transparent', border: '1.5px solid var(--ink-3)' }} /> test
          </span>
        </div>
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[0, 1]} yDomain={[-1.6, 2]} height={300} xLabel="x" yLabel="y">
            {(s) => (
              <>
                {test.x.slice(0, 60).map((x, i) => (
                  <circle key={`t${i}`} cx={s.x(x)} cy={s.y(test.y[i])} r={3} fill="none" stroke="var(--ink-3)" strokeWidth={1} opacity={0.6} />
                ))}
                <path d={line(xs.map((x) => [s.x(x), s.y(truth(x))]))} fill="none" stroke="var(--ink-3)" strokeDasharray="5 4" strokeWidth={1.5} />
                <path
                  d={line(xs.map((x) => [s.x(x), s.y(Math.max(-3, Math.min(3, polyval(cur.c, scale(x)))))]))}
                  fill="none"
                  stroke="var(--rose)"
                  strokeWidth={2.4}
                />
                {train.x.map((x, i) => (
                  <circle key={i} cx={s.x(x)} cy={s.y(train.y[i])} r={4} fill="var(--ultra)" stroke="var(--surface)" strokeWidth={1.2} />
                ))}
              </>
            )}
          </Plot>
        </div>
        <div className="viz-side">
          <div className="plot-wrap">
            <Plot xDomain={[0, 15]} yDomain={[0, errMax]} height={190} xLabel="degree (complexity)" yLabel="MSE" yTicks={[0, 0.2, 0.4, 0.6, 0.8]}>
              {(s) => (
                <>
                  <path d={line(fits.map((v, i) => [s.x(i), s.y(Math.min(errMax, v.tr))]))} fill="none" stroke="var(--ultra)" strokeWidth={2} />
                  <path d={line(fits.map((v, i) => [s.x(i), s.y(Math.min(errMax, v.te))]))} fill="none" stroke="var(--rose)" strokeWidth={2} />
                  <line x1={s.x(deg)} x2={s.x(deg)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--ink)" strokeDasharray="3 3" />
                  <circle cx={s.x(bestDeg)} cy={s.y(Math.min(errMax, fits[bestDeg].te))} r={4.5} fill="var(--surface)" stroke="var(--rose)" strokeWidth={2} />
                </>
              )}
            </Plot>
          </div>
          <div className="legend">
            <span>
              <i className="keyline" style={{ color: 'var(--ultra)' }} /> training error
            </span>
            <span>
              <i className="keyline" style={{ color: 'var(--rose)' }} /> test error
            </span>
          </div>
          <dl className="readout">
            <dt>Training MSE</dt>
            <dd>{fx(cur.tr, 3)}</dd>
            <dt>Test MSE</dt>
            <dd>{fx(cur.te, 3)}</dd>
            <dt>Best degree on test</dt>
            <dd>{bestDeg}</dd>
          </dl>
          <p style={{ fontWeight: 650 }}>{verdict}</p>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* k-NN classification playground                                            */
/* ------------------------------------------------------------------------ */

const KNN_DATA = (() => {
  const { X, y } = forge(21, 36, 2.0);
  return X.map((r, i) => ({ x: r[0], y: r[1], c: y[i] }));
})();
const KNN_TEST = (() => {
  const { X, y } = forge(77, 200, 2.0);
  return { X, y };
})();

export function KNNFigure() {
  const [pts, setPts] = useState<LPoint[]>(KNN_DATA);
  const [k, setK] = useState(3);
  const [metric, setMetric] = useState<Metric>('euclidean');
  const [q, setQ] = useState<[number, number]>([0.1, 0.4]);
  const X = pts.map((p) => [p.x, p.y]);
  const y = pts.map((p) => p.c);
  const kk = Math.min(k, Math.max(1, pts.length));
  const res = pts.length ? knnPredict(X, y, q, kk, metric) : null;
  const field = (a: number, b: number) => {
    if (!pts.length) return null;
    const r = knnPredict(X, y, [a, b], kk, metric);
    const total = sum([...r.votes.values()]);
    return { cls: r.label, conf: (r.votes.get(r.label) ?? 0) / total };
  };
  const curveData = useMemo(() => {
    const TX = KNN_DATA.map((p) => [p.x, p.y]);
    const Ty = KNN_DATA.map((p) => p.c);
    return range(15, 1).map((kv) => {
      const tr = mean(TX.map((x, i) => (knnPredict(TX, Ty, x, kv, metric).label === Ty[i] ? 1 : 0)));
      const te = mean(KNN_TEST.X.map((x, i) => (knnPredict(TX, Ty, x, kv, metric).label === KNN_TEST.y[i] ? 1 : 0)));
      return { k: kv, tr, te };
    });
  }, [metric]);

  return (
    <Figure
      title="k-nearest neighbours: votes and decision regions"
      hint="Drag the black query point; change k"
      caption={
        <>
          The shaded background is what the classifier would predict at every location; paler shading means a closer vote. With{' '}
          <b>k = 1</b> every training point carves out its own island and the boundary is jagged (high variance). Larger k smooths the boundary
          (more bias). The small chart shows the classic pattern on held-out data: training accuracy is perfect at k = 1, test accuracy peaks
          at a moderate k.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.8rem' }}>
        <Slider label="Neighbours k" value={k} min={1} max={15} onChange={setK} />
        <Seg
          label="Distance"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'euclidean', label: 'Euclidean' },
            { value: 'manhattan', label: 'Manhattan' },
          ]}
        />
        <button className="btn btn--ghost btn--sm" onClick={() => setPts(KNN_DATA)}>
          Reset points
        </button>
      </div>
      <div className="viz-grid">
        <Playground2D
          points={pts}
          setPoints={setPts}
          domain={[-3.5, 3.5, -3, 3]}
          field={field}
          fieldKey={`${kk}-${metric}-${pts.length}-${pts.map((p) => p.x + p.y).join()}`}
          ring={(i) => (res?.nn.some((n) => n.i === i) ? 'var(--ink)' : undefined)}
          query={q}
          onQuery={setQ}
          overlay={(s) => (
            <>
              {res?.nn.map((n) => (
                <line key={n.i} x1={s.x(q[0])} y1={s.y(q[1])} x2={s.x(pts[n.i].x)} y2={s.y(pts[n.i].y)} stroke="var(--ink)" strokeOpacity={0.55} strokeDasharray="4 3" />
              ))}
            </>
          )}
        />
        <div className="viz-side">
          <div className="panel">
            <h4>Query point ({f(q[0], 2)}, {f(q[1], 2)})</h4>
            {res && (
              <>
                <p>
                  Votes among the {kk} nearest:{' '}
                  {[...res.votes.entries()].map(([c, v]) => (
                    <span key={c} style={{ marginRight: 10, fontWeight: 700, color: c === 0 ? 'var(--ultra)' : 'var(--rose)' }}>
                      {String.fromCharCode(65 + c)}: {v}
                    </span>
                  ))}
                </p>
                <p>
                  Prediction: <strong style={{ color: res.label === 0 ? 'var(--ultra)' : 'var(--rose)' }}>class {String.fromCharCode(65 + res.label)}</strong>
                </p>
              </>
            )}
          </div>
          <div>
            <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
              Accuracy against k (fixed dataset)
            </div>
            <div className="plot-wrap">
              <Plot xDomain={[1, 15]} yDomain={[0.6, 1.02]} height={160} xLabel="k" yTicks={[0.6, 0.7, 0.8, 0.9, 1]}>
                {(s) => (
                  <>
                    <path d={line(curveData.map((d) => [s.x(d.k), s.y(d.tr)]))} fill="none" stroke="var(--ultra)" strokeWidth={2} />
                    <path d={line(curveData.map((d) => [s.x(d.k), s.y(d.te)]))} fill="none" stroke="var(--rose)" strokeWidth={2} />
                    <line x1={s.x(k)} x2={s.x(k)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--ink)" strokeDasharray="3 3" />
                  </>
                )}
              </Plot>
            </div>
            <div className="legend" style={{ marginTop: '0.3rem' }}>
              <span>
                <i className="keyline" style={{ color: 'var(--ultra)' }} /> training
              </span>
              <span>
                <i className="keyline" style={{ color: 'var(--rose)' }} /> test
              </span>
            </div>
          </div>
        </div>
      </div>
    </Figure>
  );
}

export function KNNRegressionFigure() {
  const [k, setK] = useState(3);
  const data = useMemo(() => wave(8, 40), []);
  const test = useMemo(() => wave(31, 200), []);
  const pred = (x0: number) => {
    const d = data.x.map((x, i) => ({ i, d: Math.abs(x - x0) })).sort((a, b) => a.d - b.d).slice(0, k);
    return mean(d.map((v) => data.y[v.i]));
  };
  const r2 = useMemo(() => {
    const p = test.x.map(pred);
    const yb = mean(test.y);
    return 1 - sum(test.y.map((v, i) => (v - p[i]) ** 2)) / sum(test.y.map((v) => (v - yb) ** 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, test]);
  const xs = range(400).map((i) => -3 + (6 * i) / 399);
  return (
    <Figure
      title="k-NN regression: averaging the neighbours’ targets"
      caption={
        <>
          For regression, k-NN predicts the mean target of the k nearest training points, so the prediction is a step function. k = 1 passes
          through every training point (and every bit of noise); large k flattens it. The test R² tells you which is generalising.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.8rem' }}>
        <Slider label="Neighbours k" value={k} min={1} max={20} onChange={setK} />
        <dl className="readout" style={{ minWidth: '10rem' }}>
          <dt>Test R²</dt>
          <dd>{fx(r2, 3)}</dd>
        </dl>
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[-3, 3]} yDomain={[-2.4, 2.4]} height={260} xLabel="feature" yLabel="target">
          {(s) => (
            <>
              <path d={line(xs.map((x) => [s.x(x), s.y(pred(x))]))} fill="none" stroke="var(--rose)" strokeWidth={2.2} />
              {data.x.map((x, i) => (
                <circle key={i} cx={s.x(x)} cy={s.y(data.y[i])} r={4} fill="var(--ultra)" stroke="var(--surface)" />
              ))}
            </>
          )}
        </Plot>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Least squares playground                                                  */
/* ------------------------------------------------------------------------ */

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MARKS = [35, 50, 60, 70, 80, 85, 90, 94, 97, 98];

export function LeastSquaresFigure() {
  const fit = useMemo(() => ols1(HOURS, MARKS), []);
  const [a, setA] = useState(55);
  const [b, setB] = useState(3);
  const [squares, setSquares] = useState(true);
  const pred = HOURS.map((x) => a + b * x);
  const sse = sum(MARKS.map((y, i) => (y - pred[i]) ** 2));
  const ybar = mean(MARKS);
  const sst = sum(MARKS.map((y) => (y - ybar) ** 2));
  const drag = useRef<'l' | 'r' | null>(null);
  const x0 = 0;
  const x1 = 11;
  const yl = a + b * x0;
  const yr = a + b * x1;
  const isBest = Math.abs(a - fit.a) < 0.05 && Math.abs(b - fit.b) < 0.005;

  return (
    <Figure
      title="Least squares: the line that minimises the squared residuals"
      hint="Drag either end of the line"
      caption={
        <>
          Each vertical segment is a residual <b>yᵢ − ŷᵢ</b>; each square has area equal to the squared residual. Ordinary least squares picks
          the one line whose squares have the smallest total area (SSE). Try to beat it by hand, then snap to the exact solution.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.8rem' }}>
        <Toggle label="Show squared residuals" checked={squares} onChange={setSquares} />
        <button
          className="btn btn--primary btn--sm"
          onClick={() => {
            setA(fit.a);
            setB(fit.b);
          }}
        >
          Snap to least squares
        </button>
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot
            xDomain={[0, 11]}
            yDomain={[20, 115]}
            height={340}
            xLabel="Hours studied"
            yLabel="Marks"
            onPointer={(kind, p) => {
              if (kind === 'move' && drag.current) {
                if (drag.current === 'l') {
                  const newYl = p[1];
                  const nb = (yr - newYl) / (x1 - x0);
                  setB(nb);
                  setA(newYl - nb * x0);
                } else {
                  const newYr = p[1];
                  const nb = (newYr - yl) / (x1 - x0);
                  setB(nb);
                  setA(yl - nb * x0);
                }
              } else if (kind === 'up' || kind === 'leave') drag.current = null;
            }}
          >
            {(s) => (
              <>
                {HOURS.map((x, i) => {
                  const r = MARKS[i] - pred[i];
                  const side = Math.abs(s.y(MARKS[i]) - s.y(pred[i]));
                  return (
                    <g key={i}>
                      {squares && (
                        <rect
                          x={r > 0 ? s.x(x) : s.x(x) - side}
                          y={Math.min(s.y(MARKS[i]), s.y(pred[i]))}
                          width={side}
                          height={side}
                          fill="var(--rose)"
                          opacity={0.13}
                          stroke="var(--rose)"
                          strokeOpacity={0.4}
                        />
                      )}
                      <line x1={s.x(x)} x2={s.x(x)} y1={s.y(MARKS[i])} y2={s.y(pred[i])} stroke="var(--rose)" strokeWidth={1.5} />
                    </g>
                  );
                })}
                <line x1={s.x(x0)} y1={s.y(yl)} x2={s.x(x1)} y2={s.y(yr)} stroke="var(--ink)" strokeWidth={2.2} />
                {HOURS.map((x, i) => (
                  <circle key={i} cx={s.x(x)} cy={s.y(MARKS[i])} r={5} fill="var(--ultra)" stroke="var(--surface)" strokeWidth={1.5} />
                ))}
                {(['l', 'r'] as const).map((h) => (
                  <circle
                    key={h}
                    cx={s.x(h === 'l' ? x0 : x1) + (h === 'l' ? 8 : -8)}
                    cy={s.y(h === 'l' ? yl + b * (8 / (s.w / 11)) : yr - b * (8 / (s.w / 11)))}
                    r={9}
                    fill="var(--surface)"
                    stroke="var(--ink)"
                    strokeWidth={2.5}
                    style={{ cursor: 'ns-resize' }}
                    onPointerDown={(e) => {
                      drag.current = h;
                      (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId);
                    }}
                  />
                ))}
              </>
            )}
          </Plot>
        </div>
        <div className="viz-side">
          <div className="panel">
            <h4>Your line</h4>
            <p style={{ fontFamily: 'var(--font-code)', fontSize: '0.86rem' }}>
              ŷ = {fx(a, 2)} + {fx(b, 3)}·x
            </p>
          </div>
          <dl className="readout">
            <dt>SSE (total square area)</dt>
            <dd style={{ color: isBest ? 'var(--viridian)' : undefined }}>{fx(sse, 1)}</dd>
            <dt>Least-squares SSE</dt>
            <dd>{fx(fit.sse, 1)}</dd>
            <dt>R² of your line</dt>
            <dd>{fx(1 - sse / sst, 4)}</dd>
          </dl>
          <div className="panel">
            <h4>The least-squares answer</h4>
            <p style={{ fontFamily: 'var(--font-code)', fontSize: '0.86rem' }}>
              ŷ = {fx(fit.a, 4)} + {fx(fit.b, 4)}·x
            </p>
            <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem' }}>R² = {fx(fit.r2, 4)}. No other line has a smaller SSE.</p>
          </div>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Gradient descent on the MSE surface                                        */
/* ------------------------------------------------------------------------ */

export function GradientDescentFigure() {
  const [lr, setLr] = useState(0.03);
  const [steps, setSteps] = useState(60);
  const [stdz, setStdz] = useState(false);
  const xm = mean(HOURS);
  const xs = Math.sqrt(mean(HOURS.map((x) => (x - xm) ** 2)));
  const J = (b0: number, b1: number) => mean(HOURS.map((x, i) => (b0 + b1 * x - MARKS[i]) ** 2)) / 2;
  const fit = useMemo(() => ols1(HOURS, MARKS), []);
  const path = useMemo(() => {
    const out: [number, number][] = [[0, 0]];
    let c0 = 0;
    let c1 = 0; // parameters in the optimisation space
    const xx = stdz ? HOURS.map((x) => (x - xm) / xs) : HOURS;
    for (let t = 0; t < steps; t++) {
      const r = xx.map((x, i) => c0 + c1 * x - MARKS[i]);
      const g0 = mean(r);
      const g1 = mean(r.map((v, i) => v * xx[i]));
      c0 -= lr * g0 * (stdz ? 10 : 1);
      c1 -= lr * g1 * (stdz ? 10 : 1);
      if (!Number.isFinite(c0) || Math.abs(c0) > 1e6) break;
      out.push(stdz ? [c0 - (c1 * xm) / xs, c1 / xs] : [c0, c1]);
    }
    return out;
  }, [lr, steps, stdz, xm, xs]);
  const last = path[path.length - 1];
  const diverged = !Number.isFinite(last[0]) || Math.abs(last[0]) > 500;

  return (
    <Figure
      title="Gradient descent on the squared-error surface"
      hint="Change the learning rate and number of steps"
      caption={
        <>
          The background shows the cost <b>J(b₀, b₁) = (1/2n) Σ (b₀ + b₁x − y)²</b> for the hours/marks data: darker means lower. Each step
          moves against the gradient. With raw hours the valley is long and narrow, so descent zig-zags and crawls; a learning rate that is too
          large overshoots and diverges. Standardising the feature makes the valley round, and descent heads straight for the minimum. (The
          standardised run uses a 10× larger step, which is now safe.)
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.8rem' }}>
        <Slider label="Learning rate η" value={lr} min={0.002} max={0.06} step={0.002} onChange={setLr} format={(v) => f(v, 3)} />
        <Slider label="Steps" value={steps} min={1} max={400} onChange={setSteps} />
        <Toggle label="Standardise hours first" checked={stdz} onChange={setStdz} />
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot
            xDomain={[-10, 90]}
            yDomain={[-4, 16]}
            height={330}
            xLabel="intercept b₀"
            yLabel="slope b₁"
            layer={(ctx, s) => {
              const c = hexToRgb(cssVar('--ultra') || '#2f49d1');
              const cell = 4;
              for (let py = s.m.t; py < s.m.t + s.h; py += cell)
                for (let px = s.m.l; px < s.m.l + s.w; px += cell) {
                  const v = Math.log10(J(s.ix(px), s.iy(py)) + 1);
                  const band = Math.floor(v * 4) / 4;
                  const t = Math.max(0, Math.min(1, 1 - (band - 0.8) / 3.2));
                  ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.05 + 0.5 * t * t).toFixed(3)})`;
                  ctx.fillRect(px, py, cell + 0.5, cell + 0.5);
                }
            }}
            layerKey="J"
          >
            {(s) => (
              <>
                <path d={line(path.filter((p) => Math.abs(p[0]) < 1e4).map((p) => [s.x(p[0]), s.y(p[1])]))} fill="none" stroke="var(--rose)" strokeWidth={2} />
                {path.slice(0, 120).map((p, i) =>
                  Math.abs(p[0]) < 1e4 ? <circle key={i} cx={s.x(p[0])} cy={s.y(p[1])} r={2.4} fill="var(--rose)" /> : null,
                )}
                <circle cx={s.x(fit.a)} cy={s.y(fit.b)} r={6} fill="none" stroke="var(--ink)" strokeWidth={2} />
                <text x={s.x(fit.a) + 9} y={s.y(fit.b) - 8} style={{ fill: 'var(--ink)', fontWeight: 700 }}>
                  minimum
                </text>
              </>
            )}
          </Plot>
        </div>
        <dl className="readout" style={{ alignContent: 'start' }}>
          <dt>Current b₀</dt>
          <dd>{diverged ? 'diverged' : fx(last[0], 3)}</dd>
          <dt>Current b₁</dt>
          <dd>{diverged ? '—' : fx(last[1], 3)}</dd>
          <dt>Cost J</dt>
          <dd>{diverged ? '∞' : fx(J(last[0], last[1]), 2)}</dd>
          <dt>Optimum (OLS)</dt>
          <dd>
            {fx(fit.a, 2)}, {fx(fit.b, 3)}
          </dd>
          <dt>Minimum J</dt>
          <dd>{fx(J(fit.a, fit.b), 2)}</dd>
        </dl>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Ridge vs Lasso coefficients                                               */
/* ------------------------------------------------------------------------ */

const RL = (() => {
  const rng = mulberry32(42);
  const n = 50;
  const d = 8;
  const trueW = [3.5, -2.8, 2, 0, 0, 1.2, 0, 0];
  const make = (m: number) => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < m; i++) {
      const base = gaussian(rng);
      const row = range(d).map((j) => (j === 3 ? base * 0.9 + gaussian(rng, 0, 0.45) : j === 0 ? base + gaussian(rng, 0, 0.5) : gaussian(rng)));
      X.push(row);
      y.push(row.reduce((s, v, j) => s + v * trueW[j], 0) + gaussian(rng, 0, 1.6));
    }
    return { X, y };
  };
  const tr = make(n);
  const te = make(400);
  const st = standardize(tr.X);
  const scaleT = (X: number[][]) => X.map((r) => r.map((v, j) => (v - st.mu[j]) / st.sd[j]));
  return { X: st.Z, y: tr.y, Xt: scaleT(te.X), yt: te.y, trueW };
})();

export function RidgeLassoFigure() {
  const [la, setLa] = useState(0); // log10 alpha
  const alpha = Math.pow(10, la);
  const models = useMemo(() => {
    const ols = ridge(RL.X, RL.y, 0);
    const rd = ridge(RL.X, RL.y, alpha * 10);
    const ls = lasso(RL.X, RL.y, alpha / 10);
    const score = (m: { w: number[]; intercept: number }, X: number[][], y: number[]) => {
      const p = X.map((x) => m.intercept + m.w.reduce((s, w, j) => s + w * x[j], 0));
      const yb = mean(y);
      return 1 - sum(y.map((v, i) => (v - p[i]) ** 2)) / sum(y.map((v) => (v - yb) ** 2));
    };
    return [
      { name: 'Linear regression', m: ols, color: 'var(--ink-2)' },
      { name: `Ridge (α = ${f(alpha * 10, 3)})`, m: rd, color: 'var(--ultra)' },
      { name: `Lasso (α = ${f(alpha / 10, 4)})`, m: ls, color: 'var(--rose)' },
    ].map((o) => ({ ...o, tr: score(o.m, RL.X, RL.y), te: score(o.m, RL.Xt, RL.yt) }));
  }, [alpha]);
  const W = 4.5;
  return (
    <Figure
      title="Regularisation: Ridge shrinks, Lasso selects"
      hint="Increase the regularisation strength"
      caption={
        <>
          Eight standardised features, of which only four truly matter (true weights shown as grey ticks). Ridge (L2) pulls every coefficient
          smoothly toward zero but rarely to exactly zero. Lasso (L1) drives the unhelpful ones to <b>exactly zero</b>, performing feature
          selection. Too much of either underfits: watch the test R² fall.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '1rem' }}>
        <Slider label="Regularisation strength (log scale)" value={la} min={-2} max={2} step={0.05} onChange={setLa} format={(v) => `×${f(Math.pow(10, v), 3)}`} width="14rem" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1rem' }}>
        {models.map((o) => (
          <div key={o.name}>
            <div className="ctl__label" style={{ marginBottom: '0.4rem' }}>
              {o.name}
            </div>
            <svg viewBox="0 0 260 190" style={{ width: '100%', height: 'auto' }} role="img" aria-label={`${o.name} coefficients`}>
              <line x1={20} x2={250} y1={95} y2={95} stroke="var(--rule-strong)" />
              {o.m.w.map((w, j) => {
                const x = 30 + j * 28;
                const h = (Math.max(-W, Math.min(W, w)) / W) * 80;
                const t = (RL.trueW[j] / W) * 80;
                return (
                  <g key={j}>
                    <rect x={x - 8} y={h > 0 ? 95 - h : 95} width={16} height={Math.max(0.8, Math.abs(h))} rx={2} fill={o.color} opacity={Math.abs(w) < 1e-6 ? 0.25 : 0.9} />
                    <line x1={x - 11} x2={x + 11} y1={95 - t} y2={95 - t} stroke="var(--ink-3)" strokeWidth={2} />
                    <text x={x} y={186} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>
                      x{j + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
            <dl className="readout">
              <dt>Non-zero coefficients</dt>
              <dd>{o.m.w.filter((w) => Math.abs(w) > 1e-6).length} of 8</dd>
              <dt>Train R²</dt>
              <dd>{fx(o.tr, 3)}</dd>
              <dt>Test R²</dt>
              <dd>{fx(o.te, 3)}</dd>
            </dl>
          </div>
        ))}
      </div>
    </Figure>
  );
}

export { HOURS, MARKS, Marker };
