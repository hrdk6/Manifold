import { useMemo, useState } from 'react';
import { Seg, Slider, Toggle } from '../components/controls';
import { paintDiverging, Plot } from '../components/Plot';
import { Figure } from '../components/prose';
import { buildCart, cartDepth, cartLeaf, cartLeaves, gradientBoost, randomForest, type CartNode } from '../lib/cart';
import { blobs, circles, forge, moons, wave } from '../lib/datasets';
import { f, fx } from '../lib/fmt';
import { entropy, gini, mean, range, sigmoid } from '../lib/math';
import { mulberry32 } from '../lib/rng';
import { adaboost, gaussianPdf, logisticFit, svmTrain } from '../lib/supervised';
import { fromXY, Playground2D, toXY, type LPoint } from './playground';

const line = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

/* ------------------------------------------------------------------------ */
/* Logistic regression in 1-D: hours studied → pass                          */
/* ------------------------------------------------------------------------ */

const LH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const LP = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
const LH2 = [0.5, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10];
const LP2 = [0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1];

export function LogisticFigure() {
  const [data, setData] = useState<'clean' | 'noisy'>('noisy');
  const xs = data === 'clean' ? LH : LH2;
  const ys = data === 'clean' ? LP : LP2;
  const fit = useMemo(() => logisticFit(xs.map((v) => [v]), ys, 1), [xs, ys]);
  const [w, setW] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [thr, setThr] = useState(0.5);
  const W1 = w ?? fit.w[1];
  const B0 = b ?? fit.w[0];
  const p = (x: number) => sigmoid(B0 + W1 * x);
  const loss = -mean(xs.map((x, i) => {
    const q = Math.min(1 - 1e-9, Math.max(1e-9, p(x)));
    return ys[i] ? Math.log(q) : Math.log(1 - q);
  }));
  const acc = mean(xs.map((x, i) => ((p(x) >= thr ? 1 : 0) === ys[i] ? 1 : 0)));
  const boundary = (Math.log(thr / (1 - thr)) - B0) / W1;
  const grid = range(201).map((i) => (i / 200) * 11);

  return (
    <Figure
      title="Logistic regression: squashing a line into a probability"
      hint="Adjust the weight, bias and decision threshold"
      caption={
        <>
          The model computes z = b + w·x and passes it through the sigmoid σ(z) = 1/(1 + e<sup>−z</sup>) to get P(pass | hours). The weight
          controls how steep the S-curve is, the bias shifts it sideways, and the decision boundary sits where the probability crosses the
          threshold. Log-loss punishes confident wrong answers heavily; “Fit” finds the weight and bias that minimise it.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.8rem' }}>
        <Seg
          label="Data"
          value={data}
          onChange={(v) => {
            setData(v);
            setW(null);
            setB(null);
          }}
          options={[
            { value: 'clean', label: 'Separable (slides)' },
            { value: 'noisy', label: 'Overlapping' },
          ]}
        />
        <Slider label="Weight w" value={W1} min={-1} max={6} step={0.01} onChange={setW} format={(v) => f(v, 2)} />
        <Slider label="Bias b" value={B0} min={-30} max={5} step={0.05} onChange={setB} format={(v) => f(v, 2)} />
        <Slider label="Threshold" value={thr} min={0.05} max={0.95} step={0.01} onChange={setThr} format={(v) => f(v, 2)} />
        <button
          className="btn btn--primary btn--sm"
          onClick={() => {
            setW(null);
            setB(null);
          }}
        >
          Fit (minimise log-loss)
        </button>
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[0, 11]} yDomain={[-0.08, 1.08]} height={300} xLabel="Hours studied" yLabel="P(pass)" yTicks={[0, 0.25, 0.5, 0.75, 1]}>
            {(s) => (
              <>
                <line x1={s.m.l} x2={s.m.l + s.w} y1={s.y(thr)} y2={s.y(thr)} stroke="var(--ochre)" strokeDasharray="5 4" />
                {Number.isFinite(boundary) && boundary > 0 && boundary < 11 && (
                  <>
                    <rect x={s.x(boundary)} y={s.m.t} width={s.x(11) - s.x(boundary)} height={s.h} fill="var(--ultra)" opacity={0.06} />
                    <line x1={s.x(boundary)} x2={s.x(boundary)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--ink)" strokeDasharray="3 3" />
                    <text x={s.x(boundary) + 6} y={s.m.t + 14} style={{ fill: 'var(--ink)', fontWeight: 700 }}>
                      boundary x = {f(boundary, 2)}
                    </text>
                  </>
                )}
                <path d={line(grid.map((x) => [s.x(x), s.y(p(x))]))} fill="none" stroke="var(--ultra)" strokeWidth={2.6} />
                {xs.map((x, i) => (
                  <g key={i}>
                    <line x1={s.x(x)} x2={s.x(x)} y1={s.y(ys[i])} y2={s.y(p(x))} stroke="var(--rose)" strokeOpacity={0.35} />
                    <circle cx={s.x(x)} cy={s.y(ys[i])} r={5.5} fill={ys[i] ? 'var(--ultra)' : 'var(--rose)'} stroke="var(--surface)" strokeWidth={1.5} />
                  </g>
                ))}
              </>
            )}
          </Plot>
        </div>
        <div className="viz-side">
          <dl className="readout">
            <dt>Weight w</dt>
            <dd>{fx(W1, 3)}</dd>
            <dt>Bias b</dt>
            <dd>{fx(B0, 3)}</dd>
            <dt>Odds ratio e^w</dt>
            <dd>{fx(Math.exp(W1), 3)}</dd>
            <dt>Mean log-loss</dt>
            <dd>{fx(loss, 4)}</dd>
            <dt>Accuracy at threshold</dt>
            <dd>{fx(acc * 100, 1)}%</dd>
          </dl>
          <p style={{ fontSize: '0.86rem', color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Each extra hour multiplies the odds of passing by e<sup>w</sup> = {f(Math.exp(W1), 2)}.
            {data === 'clean' && ' On perfectly separable data the unregularised optimum has w → ∞; the fit shown uses scikit-learn’s default L2 penalty (C = 1), which keeps w finite.'}
          </p>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Linear classifiers in 2-D: logistic regression with regularisation C      */
/* ------------------------------------------------------------------------ */

const FORGE = (() => {
  const { X, y } = forge(4, 40, 2.0);
  return fromXY(X, y);
})();

export function LinearClassifierFigure() {
  const [pts, setPts] = useState<LPoint[]>(FORGE);
  const [lc, setLc] = useState(0);
  const C = Math.pow(10, lc);
  const model = useMemo(() => {
    const { X, y } = toXY(pts);
    if (new Set(y).size < 2) return null;
    return logisticFit(X, y, C, 40);
  }, [pts, C]);
  const acc = model ? mean(pts.map((p) => ((model.prob([p.x, p.y]) >= 0.5 ? 1 : 0) === p.c ? 1 : 0))) : 0;
  return (
    <Figure
      title="A linear decision boundary, and what C does to it"
      hint="Add points or move them; change C"
      caption={
        <>
          Logistic regression in two dimensions draws a straight boundary w₁x₁ + w₂x₂ + b = 0, with probability fading away from it. In
          scikit-learn, <b>C</b> is the inverse of regularisation strength: small C forces small weights (a soft, cautious boundary that may
          misclassify a few points), large C lets the model bend toward every individual point.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Slider label="C (log scale)" value={lc} min={-3} max={3} step={0.1} onChange={setLc} format={() => f(C, 3)} />
        <dl className="readout" style={{ minWidth: '13rem' }}>
          <dt>Training accuracy</dt>
          <dd>{fx(acc * 100, 1)}%</dd>
          <dt>Weights (w₁, w₂)</dt>
          <dd>{model ? `${fx(model.w[1], 2)}, ${fx(model.w[2], 2)}` : '—'}</dd>
        </dl>
      </div>
      <Playground2D
        points={pts}
        setPoints={setPts}
        domain={[-3.5, 3.5, -3, 3]}
        height={340}
        field={model ? (a, b) => {
          const p1 = model.prob([a, b]);
          return { cls: p1 >= 0.5 ? 1 : 0, conf: Math.abs(p1 - 0.5) * 2 };
        } : undefined}
        fieldKey={`${C}-${pts.map((p) => p.x + p.y + p.c).join()}`}
        overlay={(s) => {
          if (!model || Math.abs(model.w[2]) < 1e-9) return null;
          const yAt = (x: number) => -(model.w[0] + model.w[1] * x) / model.w[2];
          return <line x1={s.x(-4)} y1={s.y(yAt(-4))} x2={s.x(4)} y2={s.y(yAt(4))} stroke="var(--ink)" strokeWidth={2} />;
        }}
      />
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Gaussian Naive Bayes in 1-D                                               */
/* ------------------------------------------------------------------------ */

export function GaussianNBFigure() {
  const [mu0, setMu0] = useState(4);
  const [mu1, setMu1] = useState(7);
  const [sd0, setSd0] = useState(1.2);
  const [sd1, setSd1] = useState(1.5);
  const [prior1, setPrior1] = useState(0.5);
  const xs = range(241).map((i) => (i / 240) * 12);
  const post = (x: number) => {
    const a = gaussianPdf(x, mu0, sd0) * (1 - prior1);
    const b = gaussianPdf(x, mu1, sd1) * prior1;
    return b / (a + b);
  };
  const ymax = Math.max(...xs.map((x) => Math.max(gaussianPdf(x, mu0, sd0) * (1 - prior1), gaussianPdf(x, mu1, sd1) * prior1))) * 1.15;
  const cross = xs.find((x, i) => i > 0 && (post(xs[i - 1]) - 0.5) * (post(x) - 0.5) <= 0);
  return (
    <Figure
      title="Gaussian Naive Bayes: class likelihoods to posterior"
      hint="Move the class means, spreads and prior"
      caption={
        <>
          For a numerical feature, Gaussian NB assumes each class’s values follow a normal distribution with its own mean and standard
          deviation (estimated from the training data). Multiplying each curve by the class prior and normalising gives the posterior
          P(class B | x), the dashed line. The decision boundary is where the weighted curves cross; a larger prior pushes it toward the
          other class.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.8rem' }}>
        <Slider label="Mean A" value={mu0} min={1} max={11} step={0.1} onChange={setMu0} />
        <Slider label="Spread A" value={sd0} min={0.4} max={3} step={0.05} onChange={setSd0} />
        <Slider label="Mean B" value={mu1} min={1} max={11} step={0.1} onChange={setMu1} />
        <Slider label="Spread B" value={sd1} min={0.4} max={3} step={0.05} onChange={setSd1} />
        <Slider label="Prior P(B)" value={prior1} min={0.05} max={0.95} step={0.01} onChange={setPrior1} format={(v) => f(v, 2)} />
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[0, 12]} yDomain={[0, 1]} height={270} xLabel="feature value x" yTicks={[0, 0.5, 1]}>
          {(s) => {
            const yy = (v: number) => s.y(v / ymax);
            return (
              <>
                <path d={line(xs.map((x) => [s.x(x), yy(gaussianPdf(x, mu0, sd0) * (1 - prior1))])) + `L${s.x(12)} ${s.y(0)} L${s.x(0)} ${s.y(0)}Z`} fill="var(--ultra)" opacity={0.15} />
                <path d={line(xs.map((x) => [s.x(x), yy(gaussianPdf(x, mu0, sd0) * (1 - prior1))]))} fill="none" stroke="var(--ultra)" strokeWidth={2} />
                <path d={line(xs.map((x) => [s.x(x), yy(gaussianPdf(x, mu1, sd1) * prior1)])) + `L${s.x(12)} ${s.y(0)} L${s.x(0)} ${s.y(0)}Z`} fill="var(--rose)" opacity={0.15} />
                <path d={line(xs.map((x) => [s.x(x), yy(gaussianPdf(x, mu1, sd1) * prior1)]))} fill="none" stroke="var(--rose)" strokeWidth={2} />
                <path d={line(xs.map((x) => [s.x(x), s.y(post(x))]))} fill="none" stroke="var(--ink)" strokeWidth={2} strokeDasharray="6 4" />
                {cross !== undefined && <line x1={s.x(cross)} x2={s.x(cross)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--ochre)" strokeWidth={2} />}
              </>
            );
          }}
        </Plot>
      </div>
      <div className="legend" style={{ marginTop: '0.5rem' }}>
        <span>
          <i style={{ background: 'var(--ultra)' }} /> P(x | A)·P(A)
        </span>
        <span>
          <i style={{ background: 'var(--rose)' }} /> P(x | B)·P(B)
        </span>
        <span>
          <i className="keyline keyline--dash" style={{ color: 'var(--ink)' }} /> posterior P(B | x)
        </span>
        <span>
          <i className="keyline" style={{ color: 'var(--ochre)' }} /> decision boundary {cross !== undefined ? `≈ ${f(cross, 2)}` : ''}
        </span>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Entropy and Gini                                                          */
/* ------------------------------------------------------------------------ */

export function ImpurityFigure() {
  const [pos, setPos] = useState(4);
  const [n, setN] = useState(6);
  const p = pos / n;
  const H = entropy([pos, n - pos]);
  const G = gini([pos, n - pos]);
  const ps = range(201).map((i) => i / 200);
  return (
    <Figure
      title="Impurity: how mixed is a node?"
      hint="Change how many of the examples are positive"
      caption={
        <>
          Entropy H = −p log₂ p − (1−p) log₂(1−p) is 0 for a pure node and peaks at <b>1 bit</b> for a 50/50 split. Gini impurity 1 − Σpᵢ²
          has the same shape with a maximum of 0.5. Decision trees choose the split that reduces impurity the most.
        </>
      }
    >
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[0, 1]} yDomain={[0, 1.08]} height={250} xLabel="proportion positive p" yTicks={[0, 0.25, 0.5, 0.75, 1]}>
            {(s) => (
              <>
                <path d={line(ps.map((q) => [s.x(q), s.y(entropy([q, 1 - q]))]))} fill="none" stroke="var(--ultra)" strokeWidth={2.4} />
                <path d={line(ps.map((q) => [s.x(q), s.y(gini([q, 1 - q]))]))} fill="none" stroke="var(--rose)" strokeWidth={2.4} />
                <line x1={s.x(p)} x2={s.x(p)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--ink)" strokeDasharray="3 3" />
                <circle cx={s.x(p)} cy={s.y(H)} r={5} fill="var(--ultra)" />
                <circle cx={s.x(p)} cy={s.y(G)} r={5} fill="var(--rose)" />
              </>
            )}
          </Plot>
        </div>
        <div className="viz-side">
          <div className="controls">
            <Slider label="Examples in node" value={n} min={2} max={20} onChange={(v) => { setN(v); setPos((q) => Math.min(q, v)); }} />
            <Slider label="Positive examples" value={pos} min={0} max={n} onChange={setPos} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {range(n).map((i) => (
              <span key={i} style={{ width: 16, height: 16, borderRadius: i < pos ? 8 : 3, background: i < pos ? 'var(--ultra)' : 'var(--rose)' }} />
            ))}
          </div>
          <dl className="readout">
            <dt>p = {pos}/{n}</dt>
            <dd>{fx(p, 3)}</dd>
            <dt>Entropy</dt>
            <dd style={{ color: 'var(--ultra)' }}>{fx(H, 4)} bits</dd>
            <dt>Gini</dt>
            <dd style={{ color: 'var(--rose)' }}>{fx(G, 4)}</dd>
          </dl>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Decision tree regions on 2-D data                                         */
/* ------------------------------------------------------------------------ */

const TREE_DATA = (() => {
  const { X, y } = moons(9, 90, 0.22);
  return fromXY(
    X.map((r) => [r[0] * 2 - 1, r[1] * 2 - 0.5]),
    y,
  );
})();

function TreeDiagram({ root, maxShow = 4 }: { root: CartNode; maxShow?: number }) {
  const W = 560;
  const levelH = 62;
  const items: { n: CartNode; x: number; y: number; px?: number; py?: number; side?: string }[] = [];
  const walk = (n: CartNode, x0: number, x1: number, d: number, px?: number, py?: number, side?: string) => {
    const x = (x0 + x1) / 2;
    const y = 22 + d * levelH;
    items.push({ n, x, y, px, py, side });
    if (!n.leaf && d < maxShow) {
      walk(n.left!, x0, x, d + 1, x, y, '≤');
      walk(n.right!, x, x1, d + 1, x, y, '>');
    }
  };
  walk(root, 0, W, 0);
  const H = Math.max(...items.map((i) => i.y)) + 30;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tree-svg" role="img" aria-label="Decision tree">
      {items.map((it, i) =>
        it.px !== undefined ? <line key={`e${i}`} className="tedge" x1={it.px} y1={it.py! + 12} x2={it.x} y2={it.y - 12} /> : null,
      )}
      {items.map((it, i) => {
        const truncated = !it.n.leaf && it.y >= 22 + maxShow * levelH;
        const isLeaf = it.n.leaf || truncated;
        const label = isLeaf ? `${it.n.n} pts` : `x${it.n.feat! + 1} ≤ ${f(it.n.thr!, 2)}`;
        const w = isLeaf ? 52 : 92;
        return (
          <g key={i} className={isLeaf ? 'tnode tleaf' : 'tnode'}>
            <rect
              x={it.x - w / 2}
              y={it.y - 12}
              width={w}
              height={24}
              rx={isLeaf ? 12 : 6}
              style={isLeaf ? { fill: it.n.value === 0 ? 'var(--ultra-soft)' : 'var(--rose-soft)', stroke: it.n.value === 0 ? 'var(--ultra)' : 'var(--rose)', strokeWidth: 1.2 } : undefined}
            />
            <text x={it.x} y={it.y + 4} textAnchor="middle" style={{ fontSize: isLeaf ? 10.5 : 11.5, fontWeight: 650 }}>
              {truncated ? '…' : label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function TreeRegionsFigure() {
  const [pts, setPts] = useState<LPoint[]>(TREE_DATA);
  const [depth, setDepth] = useState(2);
  const tree = useMemo(() => {
    const { X, y } = toXY(pts);
    if (!pts.length) return null;
    return buildCart(X, y, { maxDepth: depth, nClasses: 2 });
  }, [pts, depth]);
  const acc = tree ? mean(pts.map((p) => (cartLeaf(tree, [p.x, p.y]).value === p.c ? 1 : 0))) : 0;
  return (
    <Figure
      title="A decision tree carves the plane into rectangles"
      hint="Increase the maximum depth"
      caption={
        <>
          Each internal node tests one feature against a threshold, so every split is a vertical or horizontal line. Depth 1 is a single
          “stump”. As depth grows the regions fit the training data ever more tightly until every leaf is pure (100% training accuracy):
          the classic sign of an overfitting, high-variance model. Limiting <b>max_depth</b> (pre-pruning) is the usual cure.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Slider label="max_depth" value={depth} min={1} max={10} onChange={setDepth} />
        <dl className="readout" style={{ minWidth: '14rem' }}>
          <dt>Leaves</dt>
          <dd>{tree ? cartLeaves(tree) : 0}</dd>
          <dt>Actual depth</dt>
          <dd>{tree ? cartDepth(tree) : 0}</dd>
          <dt>Training accuracy</dt>
          <dd>{fx(acc * 100, 1)}%</dd>
        </dl>
        <button className="btn btn--ghost btn--sm" onClick={() => setPts(TREE_DATA)}>
          Reset points
        </button>
      </div>
      <div className="viz-grid">
        <Playground2D
          points={pts}
          setPoints={setPts}
          domain={[-3, 5, -2.5, 2.5]}
          height={330}
          cell={4}
          field={tree ? (a, b) => {
            const l = cartLeaf(tree, [a, b]);
            return { cls: l.value, conf: 0.35 + 0.65 * Math.max(...l.proba) };
          } : undefined}
          fieldKey={`${depth}-${pts.map((p) => p.x + p.y + p.c).join()}`}
        />
        <div>{tree && <TreeDiagram root={tree} />}</div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Ensembles: bagging / random forest, AdaBoost, gradient boosting           */
/* ------------------------------------------------------------------------ */

const ENS_DATA = (() => {
  const { X, y } = moons(13, 100, 0.25);
  return { X: X.map((r) => [r[0] * 2 - 1, r[1] * 2 - 0.5]), y };
})();

export function ForestFigure() {
  const [nTrees, setNTrees] = useState(1);
  const [depth, setDepth] = useState(6);
  const forest = useMemo(() => randomForest(ENS_DATA.X, ENS_DATA.y, 60, depth, mulberry32(3), 1), [depth]);
  const pts = fromXY(ENS_DATA.X, ENS_DATA.y);
  const acc = mean(ENS_DATA.X.map((x, i) => {
    const p = forest.proba(x, nTrees);
    return (p[1] > p[0] ? 1 : 0) === ENS_DATA.y[i] ? 1 : 0;
  }));
  return (
    <Figure
      title="Random forest: averaging many decorrelated trees"
      hint="Add trees to the forest"
      caption={
        <>
          Each tree is grown on a <b>bootstrap sample</b> (drawn with replacement) and considers a random subset of features at each split,
          so every tree overfits in a different way. One tree gives a blocky, noisy boundary; averaging the votes of many trees cancels much
          of that variance and leaves a smooth boundary with graded confidence.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Slider label="Trees in the forest" value={nTrees} min={1} max={60} onChange={setNTrees} />
        <Slider label="Depth of each tree" value={depth} min={1} max={12} onChange={setDepth} />
        <dl className="readout" style={{ minWidth: '12rem' }}>
          <dt>Training accuracy</dt>
          <dd>{fx(acc * 100, 1)}%</dd>
          <dt>Unique rows in tree 1’s sample</dt>
          <dd>
            {new Set(forest.trees[0].sample).size} / {ENS_DATA.X.length}
          </dd>
        </dl>
      </div>
      <Playground2D
        points={pts}
        setPoints={() => undefined}
        editable={false}
        domain={[-3, 5, -2.5, 2.5]}
        height={330}
        cell={4}
        field={(a, b) => {
          const p = forest.proba([a, b], nTrees);
          const c = p[1] > p[0] ? 1 : 0;
          return { cls: c, conf: Math.abs(p[1] - p[0]) };
        }}
        fieldKey={`${nTrees}-${depth}`}
      />
    </Figure>
  );
}

const ADA = (() => {
  const { X, y } = circles(6, 60, 0.12, 0.5);
  return { X: X.map((r) => [r[0] * 2, r[1] * 2]), y };
})();

export function AdaBoostFigure() {
  const [rounds, setRounds] = useState(1);
  const model = useMemo(() => adaboost(ADA.X, ADA.y, 40), []);
  const w = model.weights[rounds];
  const st = model.stumps[rounds - 1];
  const acc = mean(ADA.X.map((x, i) => ((model.score(x, rounds) >= 0 ? 1 : 0) === ADA.y[i] ? 1 : 0)));
  return (
    <Figure
      title="AdaBoost: each new learner focuses on the previous mistakes"
      hint="Step through the boosting rounds"
      caption={
        <>
          Every round fits a decision stump (a one-split tree), then <b>increases the weight</b> of the points it misclassified (shown as
          bigger dots), so the next stump concentrates on them. The final model is a weighted vote of all stumps, each weighted by
          α = ½ ln((1 − error)/error). Weak learners combine into a strong, curved boundary.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Slider label="Boosting rounds" value={rounds} min={1} max={40} onChange={setRounds} />
        <dl className="readout" style={{ minWidth: '15rem' }}>
          <dt>Latest stump</dt>
          <dd>
            x{st.feat + 1} {st.pol === 1 ? '≥' : '<'} {f(st.thr, 2)}
          </dd>
          <dt>Its weighted error / α</dt>
          <dd>
            {fx(st.err, 3)} / {fx(st.alpha, 3)}
          </dd>
          <dt>Ensemble training accuracy</dt>
          <dd>{fx(acc * 100, 1)}%</dd>
        </dl>
      </div>
      <div className="plot-wrap">
        <Plot
          xDomain={[-2.8, 2.8]}
          yDomain={[-2.6, 2.6]}
          height={330}
          equal
          layer={(ctx, s) => paintDiverging(ctx, s, (a, b) => -Math.tanh(model.score([a, b], rounds) * 0.9), 4, 0.35)}
          layerKey={rounds}
        >
          {(s) => (
            <>
              {st.feat === 0 ? (
                <line x1={s.x(st.thr)} x2={s.x(st.thr)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--ochre)" strokeWidth={2.5} strokeDasharray="6 4" />
              ) : (
                <line y1={s.y(st.thr)} y2={s.y(st.thr)} x1={s.m.l} x2={s.m.l + s.w} stroke="var(--ochre)" strokeWidth={2.5} strokeDasharray="6 4" />
              )}
              {ADA.X.map((x, i) => {
                const r = 2.5 + Math.sqrt(w[i] * ADA.X.length) * 3.2;
                return ADA.y[i] === 0 ? (
                  <circle key={i} cx={s.x(x[0])} cy={s.y(x[1])} r={r} fill="var(--ultra)" stroke="var(--surface)" />
                ) : (
                  <path key={i} d={`M${s.x(x[0])} ${s.y(x[1]) - r * 1.2} L${s.x(x[0]) + r * 1.1} ${s.y(x[1]) + r * 0.75} L${s.x(x[0]) - r * 1.1} ${s.y(x[1]) + r * 0.75}Z`} fill="var(--rose)" stroke="var(--surface)" />
                );
              })}
            </>
          )}
        </Plot>
      </div>
    </Figure>
  );
}

export function GradientBoostingFigure() {
  const [n, setN] = useState(1);
  const [lr, setLr] = useState(0.3);
  const data = useMemo(() => wave(17, 50), []);
  const gb = useMemo(() => gradientBoost(data.x, data.y, 60, 2, lr), [data, lr]);
  const xs = range(300).map((i) => -3 + (6 * i) / 299);
  const res = data.y.map((y, i) => y - gb.stages[n][i]);
  const mse = mean(res.map((r) => r * r));
  return (
    <Figure
      title="Gradient boosting: each tree fits the residuals of the ones before"
      hint="Add trees; change the learning rate"
      caption={
        <>
          Start from the mean, then repeatedly fit a shallow tree to the current residuals (the errors still left) and add a fraction of it,
          the <b>learning rate</b>, to the model. The red curve is the running prediction; the grey stems are what the next tree will try to
          fix. A small learning rate needs more trees but generalises better.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Slider label="Trees" value={n} min={0} max={60} onChange={setN} />
        <Slider label="Learning rate" value={lr} min={0.05} max={1} step={0.05} onChange={setLr} format={(v) => f(v, 2)} />
        <dl className="readout" style={{ minWidth: '10rem' }}>
          <dt>Training MSE</dt>
          <dd>{fx(mse, 4)}</dd>
        </dl>
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[-3, 3]} yDomain={[-2.4, 2.4]} height={270} xLabel="feature" yLabel="target">
          {(s) => (
            <>
              {data.x.map((x, i) => (
                <line key={`r${i}`} x1={s.x(x)} x2={s.x(x)} y1={s.y(data.y[i])} y2={s.y(gb.stages[n][i])} stroke="var(--ink-3)" strokeOpacity={0.5} />
              ))}
              <path d={line(xs.map((x) => [s.x(x), s.y(gb.predict(x, n))]))} fill="none" stroke="var(--rose)" strokeWidth={2.4} />
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
/* Support vector machine playground                                         */
/* ------------------------------------------------------------------------ */

const SVM_SETS: Record<string, LPoint[]> = {
  separable: fromXY(...((): [number[][], number[]] => {
    const { X, y } = blobs(12, [[-1.5, -1], [1.5, 1]], 30, 0.6);
    return [X, y];
  })()),
  overlapping: fromXY(...((): [number[][], number[]] => {
    const { X, y } = forge(30, 40, 1.6);
    return [X, y];
  })()),
  circles: fromXY(...((): [number[][], number[]] => {
    const { X, y } = circles(2, 60, 0.1, 0.45);
    return [X.map((r) => [r[0] * 2.4, r[1] * 2.4]), y];
  })()),
};

export function SVMFigure() {
  const [set, setSet] = useState<'separable' | 'overlapping' | 'circles'>('separable');
  const [pts, setPts] = useState<LPoint[]>(SVM_SETS.separable);
  const [kernel, setKernel] = useState<'linear' | 'rbf'>('linear');
  const [lc, setLc] = useState(0);
  const [lg, setLg] = useState(-0.3);
  const C = Math.pow(10, lc);
  const gamma = Math.pow(10, lg);
  const model = useMemo(() => {
    const { X, y } = toXY(pts);
    if (new Set(y).size < 2) return null;
    return svmTrain(X, y.map((v) => (v === 1 ? 1 : -1)), C, kernel === 'rbf' ? { type: 'rbf', gamma } : { type: 'linear' }, mulberry32(5), 10, 6000);
  }, [pts, C, gamma, kernel]);
  const acc = model ? mean(pts.map((p) => ((model.decision([p.x, p.y]) >= 0 ? 1 : 0) === p.c ? 1 : 0))) : 0;
  const margin = model?.w ? 2 / Math.hypot(model.w[0], model.w[1]) : null;
  return (
    <Figure
      title="Support vector machines: margins, support vectors and kernels"
      hint="Change the kernel, C and γ; add or drag points"
      caption={
        <>
          The solid line is the decision boundary f(x) = 0, the dashed lines the margin f(x) = ±1. Ringed points are the{' '}
          <b>support vectors</b>: the only points that determine the boundary (move any other point and nothing changes). Small C allows a wide
          margin with some violations; large C insists on classifying every point. The RBF kernel bends the boundary; γ sets how far each
          support vector’s influence reaches.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          label="Data"
          value={set}
          onChange={(v) => {
            setSet(v);
            setPts(SVM_SETS[v]);
            if (v === 'circles') setKernel('rbf');
          }}
          options={[
            { value: 'separable', label: 'Separable' },
            { value: 'overlapping', label: 'Overlapping' },
            { value: 'circles', label: 'Circles' },
          ]}
        />
        <Seg
          label="Kernel"
          value={kernel}
          onChange={setKernel}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'rbf', label: 'RBF (Gaussian)' },
          ]}
        />
        <Slider label="C" value={lc} min={-2} max={3} step={0.1} onChange={setLc} format={() => f(C, 3)} width="9rem" />
        {kernel === 'rbf' && <Slider label="γ (gamma)" value={lg} min={-2} max={1.5} step={0.05} onChange={setLg} format={() => f(gamma, 3)} width="9rem" />}
      </div>
      <div className="viz-grid">
        <Playground2D
          points={pts}
          setPoints={setPts}
          domain={[-3.5, 3.5, -3, 3]}
          height={350}
          cell={4}
          field={model ? (a, b) => {
            const d = model.decision([a, b]);
            return { cls: d >= 0 ? 1 : 0, conf: Math.min(1, Math.abs(d) / 1.5) };
          } : undefined}
          fieldKey={`${kernel}-${C}-${gamma}-${pts.map((p) => p.x + p.y + p.c).join()}`}
          ring={(i) => (model?.sv.includes(i) ? 'var(--ink)' : undefined)}
          overlay={(s) => {
            if (!model) return null;
            if (model.w) {
              const [w1, w2] = model.w;
              if (Math.abs(w2) < 1e-9) return null;
              const at = (x: number, off: number) => (off - model.b - w1 * x) / w2;
              return (
                <>
                  {[-1, 0, 1].map((o) => (
                    <line key={o} x1={s.x(-5)} y1={s.y(at(-5, o))} x2={s.x(5)} y2={s.y(at(5, o))} stroke="var(--ink)" strokeWidth={o === 0 ? 2.2 : 1.3} strokeDasharray={o === 0 ? undefined : '6 4'} />
                  ))}
                </>
              );
            }
            return null;
          }}
        />
        <div className="viz-side">
          <dl className="readout">
            <dt>Support vectors</dt>
            <dd>{model?.sv.length ?? 0}</dd>
            <dt>Training accuracy</dt>
            <dd>{fx(acc * 100, 1)}%</dd>
            {margin !== null && (
              <>
                <dt>Margin width 2/‖w‖</dt>
                <dd>{fx(margin, 3)}</dd>
              </>
            )}
          </dl>
          <div className="panel">
            <h4>Try this</h4>
            <p>Drag a point that is not ringed: the boundary does not move. Drag a ringed one: it does.</p>
            <p>On “Circles”, switch to Linear: no straight line can work. RBF solves it by implicitly mapping to a higher-dimensional space.</p>
            <p>With RBF, push γ up until each point gets its own island: that is overfitting.</p>
          </div>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Kernel trick illustration: lifting 1-D data                               */
/* ------------------------------------------------------------------------ */

export function KernelLiftFigure() {
  const [lift, setLift] = useState(false);
  const xs = [-3, -2.6, -2.2, -1.8, 1.8, 2.2, 2.6, 3, -1, -0.6, -0.2, 0.2, 0.6, 1];
  const ys = [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
  return (
    <Figure
      title="The kernel trick in one picture"
      hint="Toggle the extra feature"
      caption={
        <>
          In one dimension the inner class sits between the outer one, so no single threshold separates them. Adding the feature x² lifts the
          points onto a parabola, where a straight line (a hyperplane) separates them perfectly. Kernels compute inner products in such
          higher-dimensional spaces <b>without ever constructing the new features</b>.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Toggle label="Add feature x²" checked={lift} onChange={setLift} />
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[-3.5, 3.5]} yDomain={[-1, 10]} height={240} xLabel="x" yLabel={lift ? 'x²' : ''} yTicks={lift ? 5 : []}>
          {(s) => (
            <>
              {lift && <line x1={s.m.l} x2={s.m.l + s.w} y1={s.y(1.9)} y2={s.y(1.9)} stroke="var(--ink)" strokeWidth={2} strokeDasharray="6 4" />}
              {xs.map((x, i) => {
                const yy = lift ? x * x : 0;
                return ys[i] ? (
                  <path key={i} d={`M${s.x(x)} ${s.y(yy) - 7} L${s.x(x) + 6.5} ${s.y(yy) + 4.5} L${s.x(x) - 6.5} ${s.y(yy) + 4.5}Z`} fill="var(--rose)" style={{ transition: 'all .5s' }} />
                ) : (
                  <circle key={i} cx={s.x(x)} cy={s.y(yy)} r={5.5} fill="var(--ultra)" style={{ transition: 'all .5s' }} />
                );
              })}
            </>
          )}
        </Plot>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Uncertainty: decision_function vs predict_proba                           */
/* ------------------------------------------------------------------------ */

export function UncertaintyFigure() {
  const [view, setView] = useState<'proba' | 'decision'>('proba');
  const [thr, setThr] = useState(0.5);
  const data = useMemo(() => {
    const { X, y } = forge(44, 50, 1.8);
    return { X, y, pts: fromXY(X, y) };
  }, []);
  const model = useMemo(() => logisticFit(data.X, data.y, 1), [data]);
  const unsure = data.X.filter((x) => Math.abs(model.prob(x) - 0.5) < 0.2).length;
  return (
    <Figure
      title="How sure is the classifier?"
      hint="Switch between the two views; move the threshold"
      caption={
        <>
          <b>decision_function</b> returns a signed score (positive means class B) whose magnitude grows with distance from the boundary but
          has no fixed scale. <b>predict_proba</b> squashes it into a probability between 0 and 1. Points in the pale band near the boundary
          are the ones the model is unsure about. Moving the threshold away from 0.5 trades one kind of error for the other.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.6rem' }}>
        <Seg
          value={view}
          onChange={setView}
          options={[
            { value: 'proba', label: 'predict_proba' },
            { value: 'decision', label: 'decision_function' },
          ]}
        />
        {view === 'proba' && <Slider label="Threshold for class B" value={thr} min={0.05} max={0.95} step={0.01} onChange={setThr} format={(v) => f(v, 2)} />}
        <dl className="readout" style={{ minWidth: '12rem' }}>
          <dt>Points with 0.3 &lt; p &lt; 0.7</dt>
          <dd>{unsure}</dd>
        </dl>
      </div>
      <div className="plot-wrap">
        <Plot
          xDomain={[-3.5, 3.5]}
          yDomain={[-3, 3]}
          height={330}
          equal
          layer={(ctx, s) =>
            paintDiverging(
              ctx,
              s,
              (a, b) => {
                const z = model.w[0] + model.w[1] * a + model.w[2] * b;
                if (view === 'decision') return -Math.tanh(z / 4);
                const p = sigmoid(z);
                return p >= thr ? -(0.25 + 0.75 * (p - thr) / (1 - thr)) : 0.25 + 0.75 * (thr - p) / thr;
              },
              4,
              0.4,
            )
          }
          layerKey={`${view}-${thr}`}
        >
          {(s) => (
            <>
              {data.pts.map((p, i) => {
                const pr = model.prob([p.x, p.y]);
                return (
                  <g key={i}>
                    {p.c === 0 ? (
                      <circle cx={s.x(p.x)} cy={s.y(p.y)} r={5} fill="var(--ultra)" stroke="var(--surface)" />
                    ) : (
                      <path d={`M${s.x(p.x)} ${s.y(p.y) - 6} L${s.x(p.x) + 5.5} ${s.y(p.y) + 4} L${s.x(p.x) - 5.5} ${s.y(p.y) + 4}Z`} fill="var(--rose)" stroke="var(--surface)" />
                    )}
                    {Math.abs(pr - 0.5) < 0.2 && <circle cx={s.x(p.x)} cy={s.y(p.y)} r={10} fill="none" stroke="var(--ochre)" strokeWidth={2} />}
                  </g>
                );
              })}
            </>
          )}
        </Plot>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Activation functions (neural networks)                                    */
/* ------------------------------------------------------------------------ */

export function ActivationFigure() {
  const xs = range(201).map((i) => -4 + (8 * i) / 200);
  const fns = [
    { name: 'ReLU max(0, z)', f: (z: number) => Math.max(0, z), c: 'var(--ultra)' },
    { name: 'tanh(z)', f: Math.tanh, c: 'var(--rose)' },
    { name: 'sigmoid σ(z)', f: sigmoid, c: 'var(--ochre)' },
  ];
  return (
    <Figure
      title="Non-linear activation functions"
      caption={
        <>
          After computing a weighted sum, each hidden unit applies a non-linear function. Without it, stacking layers would still produce a
          linear model. ReLU is the default in modern networks; tanh and the sigmoid saturate for large |z|.
        </>
      }
    >
      <div className="plot-wrap">
        <Plot xDomain={[-4, 4]} yDomain={[-1.2, 2.2]} height={220} xLabel="z (weighted input)">
          {(s) => (
            <>
              {fns.map((fn) => (
                <path key={fn.name} d={line(xs.map((x) => [s.x(x), s.y(fn.f(x))]))} fill="none" stroke={fn.c} strokeWidth={2.4} />
              ))}
            </>
          )}
        </Plot>
      </div>
      <div className="legend" style={{ marginTop: '0.5rem' }}>
        {fns.map((fn) => (
          <span key={fn.name}>
            <i className="keyline" style={{ color: fn.c }} /> {fn.name}
          </span>
        ))}
      </div>
    </Figure>
  );
}

export function MLPDiagram() {
  const layers = [3, 5, 5, 2];
  const W = 560;
  const H = 230;
  const pos = layers.map((n, li) => range(n).map((i) => ({ x: 60 + li * ((W - 120) / (layers.length - 1)), y: H / 2 + (i - (n - 1) / 2) * 40 })));
  const names = ['inputs x', 'hidden layer 1', 'hidden layer 2', 'outputs'];
  return (
    <Figure title="A multilayer perceptron with two hidden layers">
      <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Neural network diagram">
        {pos.slice(0, -1).map((L, li) =>
          L.flatMap((a, i) => pos[li + 1].map((b, j) => <line key={`${li}-${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--rule-strong)" strokeWidth={1} />)),
        )}
        {pos.map((L, li) =>
          L.map((p, i) => (
            <circle key={`${li}-${i}`} cx={p.x} cy={p.y} r={13} fill={li === 0 ? 'var(--ultra-soft)' : li === layers.length - 1 ? 'var(--rose-soft)' : 'var(--surface)'} stroke={li === 0 ? 'var(--ultra)' : li === layers.length - 1 ? 'var(--rose)' : 'var(--ink-2)'} strokeWidth={1.8} />
          )),
        )}
        {names.map((n, li) => (
          <text key={n} x={pos[li][0].x} y={H + 12} textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fill: 'var(--ink-3)', fontWeight: 600 }}>
            {n}
          </text>
        ))}
      </svg>
    </Figure>
  );
}
