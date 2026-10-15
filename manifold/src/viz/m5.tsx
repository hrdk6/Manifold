import { useMemo, useState } from 'react';
import { Seg, Slider, Toggle } from '../components/controls';
import { Plot } from '../components/Plot';
import { Figure } from '../components/prose';
import { digits, moons } from '../lib/datasets';
import { f, fx } from '../lib/fmt';
import { mean, range, sum } from '../lib/math';
import { binaryMetrics, confusionAt, lossFns, multiclassReport, rocCurve, aucRank } from '../lib/metrics';
import { gaussian, mulberry32, shuffle } from '../lib/rng';
import { knnPredict, svmTrain } from '../lib/supervised';
import { fromXY, Playground2D } from './playground';

const line = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

/* ------------------------------------------------------------------------ */
/* Cross-validation splitters                                                */
/* ------------------------------------------------------------------------ */

type CVKind = 'kfold' | 'shuffled' | 'stratified' | 'loo' | 'shufflesplit' | 'group';

export function cvSplits(n: number, k: number, kind: CVKind, labels: number[], groups: number[], seed = 0): { test: number[]; train: number[] }[] {
  const idx = range(n);
  const rng = mulberry32(seed + 1);
  const foldsFrom = (order: number[], kk: number) => {
    const sizes = range(kk).map((i) => Math.floor(n / kk) + (i < n % kk ? 1 : 0));
    let p = 0;
    return sizes.map((s) => {
      const test = order.slice(p, p + s);
      p += s;
      return { test, train: idx.filter((i) => !test.includes(i)) };
    });
  };
  if (kind === 'kfold') return foldsFrom(idx, k);
  if (kind === 'shuffled') return foldsFrom(shuffle(idx, rng), k);
  if (kind === 'loo') return idx.map((i) => ({ test: [i], train: idx.filter((j) => j !== i) }));
  if (kind === 'shufflesplit') {
    const nTest = Math.max(1, Math.round(n * 0.2));
    const nTrain = Math.round(n * 0.5);
    return range(k).map(() => {
      const o = shuffle(idx, rng);
      return { test: o.slice(0, nTest), train: o.slice(nTest, nTest + nTrain) };
    });
  }
  if (kind === 'group') {
    const gs = [...new Set(groups)];
    const kk = Math.min(k, gs.length);
    const assign = gs.map((_, i) => i % kk);
    return range(kk).map((fi) => {
      const test = idx.filter((i) => assign[gs.indexOf(groups[i])] === fi);
      return { test, train: idx.filter((i) => !test.includes(i)) };
    });
  }
  // stratified: deal each class's samples round-robin into folds
  const folds: number[][] = range(k).map(() => []);
  const classes = [...new Set(labels)];
  let c = 0;
  for (const cl of classes) {
    for (const i of idx.filter((j) => labels[j] === cl)) {
      folds[c % k].push(i);
      c++;
    }
  }
  return folds.map((test) => ({ test: test.sort((a, b) => a - b), train: idx.filter((i) => !test.includes(i)) }));
}

export function CVFigure() {
  const [n, setN] = useState(15);
  const [k, setK] = useState(5);
  const [kind, setKind] = useState<CVKind>('kfold');
  const [sorted, setSorted] = useState(true);
  const labels = range(n).map((i) => (sorted ? Math.floor((i * 3) / n) : (i * 7) % 3));
  const groups = range(n).map((i) => Math.floor(i / 3));
  const splits = cvSplits(n, kind === 'loo' ? n : k, kind, labels, groups);
  const colors = ['var(--ultra)', 'var(--rose)', 'var(--ochre)'];
  const help: Record<CVKind, string> = {
    kfold: 'KFold without shuffling takes consecutive blocks. If the data is sorted by class (like iris), a test fold can contain only classes the model never saw.',
    shuffled: 'KFold(shuffle=True) randomises the order first, so each fold is a random sample.',
    stratified: 'StratifiedKFold keeps each fold’s class proportions equal to the whole dataset’s. The default for classification in scikit-learn.',
    loo: 'Leave-one-out: n folds, each testing a single sample. Maximum training data per split, n model fits, high-variance estimate.',
    shufflesplit: 'ShuffleSplit draws an independent random train/test split each time (here 50% train, 20% test); sizes and repetitions are set independently, and some samples go unused.',
    group: 'GroupKFold never splits a group (e.g. one patient’s samples, shown as bracketed triples) across train and test, so the score reflects new groups.',
  };
  return (
    <Figure
      title="How each cross-validation strategy splits the data"
      hint="Pick a strategy; change n and k"
      caption={
        <>
          Each row is one split; <b style={{ color: 'var(--rose)' }}>rose</b> cells are the test fold, blue the training data, grey unused. The
          coloured stripe under each sample is its class. Every sample is tested exactly once in k-fold variants, so all of the data is used for
          both training and evaluation.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.7rem' }}>
        <Seg
          value={kind}
          onChange={setKind}
          options={[
            { value: 'kfold', label: 'KFold' },
            { value: 'shuffled', label: 'KFold + shuffle' },
            { value: 'stratified', label: 'Stratified' },
            { value: 'loo', label: 'Leave-one-out' },
            { value: 'shufflesplit', label: 'ShuffleSplit' },
            { value: 'group', label: 'GroupKFold' },
          ]}
        />
        <Slider label="Samples n" value={n} min={6} max={30} onChange={setN} width="8rem" />
        {kind !== 'loo' && <Slider label="Folds k" value={k} min={2} max={10} onChange={setK} width="8rem" />}
        <Toggle label="Data sorted by class" checked={sorted} onChange={setSorted} />
      </div>
      <div className="cv-grid" style={{ maxHeight: 420, overflowY: 'auto' }}>
        {splits.map((sp, fi) => {
          const testCls = sp.test.map((i) => labels[i]);
          const dist = [0, 1, 2].map((c) => testCls.filter((v) => v === c).length);
          return (
            <div key={fi} className="cv-row">
              <span className="cv-row__label">{kind === 'shufflesplit' ? `Split ${fi + 1}` : `Fold ${fi + 1}`}</span>
              <div className="cv-cells" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {range(n).map((i) => (
                  <div
                    key={i}
                    className="cv-cell"
                    data-test={sp.test.includes(i)}
                    data-unused={!sp.test.includes(i) && !sp.train.includes(i)}
                    style={{ boxShadow: `inset 0 -4px 0 ${colors[labels[i]]}`, borderLeft: kind === 'group' && i % 3 === 0 && i ? '2px solid var(--ink)' : undefined }}
                    title={`S${i + 1}, class ${labels[i]}`}
                  >
                    {n <= 16 ? `S${i + 1}` : ''}
                  </div>
                ))}
              </div>
              <span className="cv-row__score" title="classes in the test fold">
                {dist.map((d, c) => (
                  <span key={c} style={{ color: colors[c], marginLeft: 4 }}>
                    {d}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <p style={{ marginTop: '0.7rem', fontSize: '0.88rem', color: 'var(--ink-2)', lineHeight: 1.55 }}>{help[kind]}</p>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Live grid search over C and gamma for an RBF SVM                          */
/* ------------------------------------------------------------------------ */

const GS_DATA = (() => {
  const { X, y } = moons(5, 90, 0.22);
  return { X: X.map((r) => [r[0] * 2 - 1, r[1] * 2 - 0.5]), y };
})();
const GRID = [0.001, 0.01, 0.1, 1, 10, 100];

export function GridSearchFigure() {
  const [scores, setScores] = useState<(number | null)[][]>(() => GRID.map(() => GRID.map(() => null)));
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [running, setRunning] = useState(false);
  const folds = useMemo(() => cvSplits(GS_DATA.X.length, 5, 'stratified', GS_DATA.y, []), []);
  const run = () => {
    if (running) return;
    setRunning(true);
    setSel(null);
    setScores(GRID.map(() => GRID.map(() => null)));
    const cells: [number, number][] = [];
    GRID.forEach((_, ci) => GRID.forEach((__, gi) => cells.push([ci, gi])));
    let idx = 0;
    const step = () => {
      const t0 = performance.now();
      while (idx < cells.length && performance.now() - t0 < 30) {
        const [ci, gi] = cells[idx++];
        const accs = folds.map((fo) => {
          const Xtr = fo.train.map((i) => GS_DATA.X[i]);
          const ytr = fo.train.map((i) => (GS_DATA.y[i] ? 1 : -1));
          const m = svmTrain(Xtr, ytr, GRID[ci], { type: 'rbf', gamma: GRID[gi] }, mulberry32(ci * 7 + gi), 4, 2500);
          return mean(fo.test.map((i) => ((m.decision(GS_DATA.X[i]) >= 0 ? 1 : 0) === GS_DATA.y[i] ? 1 : 0)));
        });
        const sc = mean(accs);
        setScores((old) => old.map((r, a) => r.map((v, b) => (a === ci && b === gi ? sc : v))));
      }
      if (idx < cells.length) setTimeout(step, 0);
      else setRunning(false);
    };
    setTimeout(step, 30);
  };
  const flat = scores.flatMap((r, ci) => r.map((v, gi) => ({ v, ci, gi }))).filter((c) => c.v !== null) as { v: number; ci: number; gi: number }[];
  const best = flat.length ? flat.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  const done = flat.length;
  const shown = sel ?? (best && done === 36 ? [best.ci, best.gi] : null);
  const model = useMemo(() => {
    if (!shown) return null;
    return svmTrain(GS_DATA.X, GS_DATA.y.map((v) => (v ? 1 : -1)), GRID[shown[0]], { type: 'rbf', gamma: GRID[shown[1]] }, mulberry32(3), 6, 4000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown?.[0], shown?.[1]]);
  const heat = (v: number | null) => {
    if (v === null) return 'var(--surface-2)';
    const t = Math.max(0, Math.min(1, (v - 0.5) / 0.5));
    return `color-mix(in srgb, var(--ultra) ${Math.round(t * 85)}%, var(--surface))`;
  };
  return (
    <Figure
      title="Grid search with cross-validation, live"
      hint="Run the search, then click any cell"
      caption={
        <>
          An RBF-kernel SVM on 90 noisy “moons” points. For each of the 6 × 6 = 36 combinations of C and γ, 5-fold cross-validation trains 5
          models: <b>180 fits</b> in total. Very small C underfits whatever γ is (the model predicts one class: 50%); very large γ overfits
          whatever C is. Accuracy is high only in a band of moderate γ with a large enough C, which is why C and γ must be tuned together.
          Click a cell to see that model’s decision boundary.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.7rem' }}>
        <button className="btn btn--primary btn--sm" onClick={run} disabled={running}>
          {running ? `Fitting… ${done} / 36` : done ? 'Run the grid search again' : 'Run grid search (180 fits)'}
        </button>
        {best && done === 36 && (
          <span className="chip chip--ultra">
            Best: C = {GRID[best.ci]}, γ = {GRID[best.gi]}, CV accuracy {fx(best.v * 100, 1)}%
          </span>
        )}
      </div>
      <div className="viz-grid">
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: `3.4rem repeat(${GRID.length}, minmax(0, 1fr))`, gap: 3, fontSize: '0.72rem' }}>
            {[...GRID].reverse().map((g, rgi) => {
              const gi = GRID.length - 1 - rgi;
              return [
                <div key={`l${gi}`} style={{ alignSelf: 'center', textAlign: 'right', paddingRight: 6, color: 'var(--ink-3)', fontWeight: 650 }}>
                  γ {g}
                </div>,
                ...GRID.map((_, ci) => {
                  const v = scores[ci][gi];
                  const isBest = best && best.ci === ci && best.gi === gi && done === 36;
                  const isSel = shown && shown[0] === ci && shown[1] === gi;
                  return (
                    <button
                      key={`${ci}-${gi}`}
                      onClick={() => v !== null && setSel([ci, gi])}
                      style={{
                        height: '2.6rem',
                        borderRadius: 6,
                        border: isSel ? '2px solid var(--ink)' : isBest ? '2px solid var(--rose)' : '1px solid var(--rule)',
                        background: heat(v),
                        color: v !== null && v > 0.8 ? 'var(--surface)' : 'var(--ink)',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        cursor: v !== null ? 'pointer' : 'default',
                        transition: 'background .3s',
                      }}
                      aria-label={`C ${GRID[ci]}, gamma ${GRID[gi]}: ${v === null ? 'not computed' : fx(v * 100, 1) + '%'}`}
                    >
                      {v === null ? '' : fx(v * 100, 0)}
                    </button>
                  );
                }),
              ];
            })}
            <div />
            {GRID.map((c) => (
              <div key={c} style={{ textAlign: 'center', color: 'var(--ink-3)', fontWeight: 650, paddingTop: 4 }}>
                C {c}
              </div>
            ))}
          </div>
        </div>
        <div>
          {shown && model ? (
            <>
              <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
                C = {GRID[shown[0]]}, γ = {GRID[shown[1]]}: {model.sv.length} support vectors
              </div>
              <Playground2D
                points={fromXY(GS_DATA.X, GS_DATA.y)}
                setPoints={() => undefined}
                editable={false}
                domain={[-3, 5, -2.5, 2.5]}
                height={260}
                cell={5}
                field={(a, b) => {
                  const d = model.decision([a, b]);
                  return { cls: d >= 0 ? 1 : 0, conf: Math.min(1, Math.abs(d)) };
                }}
                fieldKey={`${shown[0]}-${shown[1]}`}
              />
            </>
          ) : (
            <div className="empty">Run the search, then click a cell to see its decision boundary.</div>
          )}
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Grid vs random search (Bergstra & Bengio)                                 */
/* ------------------------------------------------------------------------ */

export function GridVsRandomFigure() {
  const rng = mulberry32(12);
  const grid = range(3).flatMap((i) => range(3).map((j) => [0.17 + i * 0.33, 0.17 + j * 0.33]));
  const rand = range(9).map(() => [0.05 + rng() * 0.9, 0.05 + rng() * 0.9]);
  const imp = (x: number) => Math.exp(-((x - 0.62) ** 2) / 0.012);
  const panel = (pts: number[][], title: string) => (
    <div>
      <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
        {title}
      </div>
      <svg viewBox="0 0 220 250" style={{ width: '100%', height: 'auto' }} role="img" aria-label={title}>
        <rect x={20} y={10} width={180} height={180} fill="var(--paper)" stroke="var(--rule-strong)" />
        <path d={line(range(101).map((i) => [20 + (i / 100) * 180, 245 - imp(i / 100) * 45]))} fill="none" stroke="var(--rose)" strokeWidth={2} />
        {pts.map((p, i) => (
          <g key={i}>
            <line x1={20 + p[0] * 180} x2={20 + p[0] * 180} y1={190 - p[1] * 180} y2={245 - imp(p[0]) * 45} stroke="var(--ultra)" strokeOpacity={0.25} />
            <circle cx={20 + p[0] * 180} cy={190 - p[1] * 180} r={5} fill="var(--ultra)" />
            <circle cx={20 + p[0] * 180} cy={245 - imp(p[0]) * 45} r={3.5} fill="var(--ultra)" />
          </g>
        ))}
        <text x={110} y={205} textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fill: 'var(--ink-3)' }}>
          important parameter →
        </text>
        <text x={12} y={100} transform="rotate(-90 12 100)" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fill: 'var(--ink-3)' }}>
          unimportant parameter
        </text>
      </svg>
    </div>
  );
  return (
    <Figure
      title="Why random search often beats grid search"
      caption={
        <>
          Nine trials each. When one hyperparameter matters much more than the other (the rose curve shows performance along it), a 3 × 3 grid
          tests only <b>3 distinct values</b> of the important one. Random search tests 9 different values of it for the same cost, so it is more
          likely to land near the peak. This advantage grows with the number of hyperparameters.
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '1rem', maxWidth: 560 }}>
        {panel(grid, 'Grid search')}
        {panel(rand, 'Random search')}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Threshold, confusion matrix, ROC and PR curves                            */
/* ------------------------------------------------------------------------ */

export function ConfusionGrid({ tp, fp, fn, tn }: { tp: number; fp: number; fn: number; tn: number }) {
  const cell = (v: number, label: string, good: boolean) => (
    <div className="cm__cell" style={{ background: good ? 'var(--viridian-soft)' : 'var(--rose-soft)', color: good ? 'var(--viridian)' : 'var(--rose)' }}>
      <span style={{ fontSize: '1.25rem' }}>{v}</span>
      <small>{label}</small>
    </div>
  );
  return (
    <div className="cm" style={{ ['--k' as string]: 2 }}>
      <span />
      <span className="cm__h">Predicted positive</span>
      <span className="cm__h">Predicted negative</span>
      <span className="cm__h" style={{ justifyContent: 'flex-end' }}>
        Actual positive
      </span>
      {cell(tp, 'TP', true)}
      {cell(fn, 'FN', false)}
      <span className="cm__h" style={{ justifyContent: 'flex-end' }}>
        Actual negative
      </span>
      {cell(fp, 'FP', false)}
      {cell(tn, 'TN', true)}
    </div>
  );
}

export function ThresholdFigure() {
  const [thr, setThr] = useState(0.5);
  const [sep, setSep] = useState(1.6);
  const [posRate, setPosRate] = useState(0.3);
  const data = useMemo(() => {
    const rng = mulberry32(17);
    const n = 400;
    const nPos = Math.round(n * posRate);
    const y: number[] = [];
    const s: number[] = [];
    for (let i = 0; i < n; i++) {
      const pos = i < nPos;
      const z = gaussian(rng, pos ? sep / 2 : -sep / 2, 1);
      y.push(pos ? 1 : 0);
      s.push(1 / (1 + Math.exp(-z * 1.4)));
    }
    return { y, s };
  }, [sep, posRate]);
  const c = confusionAt(data.y, data.s, thr);
  const m = binaryMetrics(c);
  const roc = useMemo(() => rocCurve(data.y, data.s), [data]);
  const bins = 30;
  const hist = (cls: number) =>
    range(bins).map((b) => data.s.filter((v, i) => data.y[i] === cls && v >= b / bins && v < (b + 1) / bins).length);
  const hp = hist(1);
  const hn = hist(0);
  const hmax = Math.max(...hp, ...hn);
  return (
    <Figure
      title="One threshold, many metrics"
      hint="Move the threshold; change class overlap and imbalance"
      caption={
        <>
          The classifier outputs a score between 0 and 1 for every example (blue: actually positive, rose: actually negative). Everything to the
          right of the threshold is predicted positive. Raising the threshold makes the model stricter: fewer false positives (higher
          precision) but more missed positives (lower recall). The dot on each curve is the current threshold; the ROC curve shows every
          threshold at once.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.7rem' }}>
        <Slider label="Threshold" value={thr} min={0.01} max={0.99} step={0.01} onChange={setThr} format={(v) => f(v, 2)} width="12rem" />
        <Slider label="Class separation" value={sep} min={0.2} max={4} step={0.1} onChange={setSep} format={(v) => f(v, 1)} />
        <Slider label="Share of positives" value={posRate} min={0.02} max={0.5} step={0.01} onChange={setPosRate} format={(v) => `${f(v * 100, 0)}%`} />
      </div>
      <div className="plot-wrap" style={{ marginBottom: '0.9rem' }}>
        <Plot xDomain={[0, 1]} yDomain={[-hmax * 1.05, hmax * 1.05]} height={200} xLabel="classifier score" yTicks={[]}>
          {(s) => (
            <>
              <rect x={s.x(thr)} y={s.m.t} width={s.x(1) - s.x(thr)} height={s.h} fill="var(--ink)" opacity={0.05} />
              {hp.map((v, b) => (
                <rect key={`p${b}`} x={s.x(b / bins) + 0.5} y={s.y(v)} width={s.x(1 / bins) - s.x(0) - 1} height={s.y(0) - s.y(v)} fill="var(--ultra)" opacity={b / bins >= thr ? 0.95 : 0.4} />
              ))}
              {hn.map((v, b) => (
                <rect key={`n${b}`} x={s.x(b / bins) + 0.5} y={s.y(0)} width={s.x(1 / bins) - s.x(0) - 1} height={s.y(-v) - s.y(0)} fill="var(--rose)" opacity={b / bins >= thr ? 0.95 : 0.4} />
              ))}
              <line x1={s.x(thr)} x2={s.x(thr)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--ink)" strokeWidth={2} />
              <text x={s.x(thr) + 6} y={s.m.t + 12} style={{ fill: 'var(--ink)', fontWeight: 700 }}>
                predict positive →
              </text>
              <text x={s.m.l + 6} y={s.m.t + 12} style={{ fill: 'var(--ultra)', fontWeight: 700 }}>
                actual positives
              </text>
              <text x={s.m.l + 6} y={s.m.t + s.h - 6} style={{ fill: 'var(--rose)', fontWeight: 700 }}>
                actual negatives
              </text>
            </>
          )}
        </Plot>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '1rem', alignItems: 'start' }}>
        <div>
          <ConfusionGrid {...c} />
          <dl className="readout" style={{ marginTop: '0.7rem' }}>
            <dt>Accuracy</dt>
            <dd>{fx(m.accuracy, 3)}</dd>
            <dt>Precision</dt>
            <dd>{fx(m.precision, 3)}</dd>
            <dt>Recall (TPR)</dt>
            <dd>{fx(m.recall, 3)}</dd>
            <dt>F1</dt>
            <dd>{fx(m.f1, 3)}</dd>
            <dt>FPR</dt>
            <dd>{fx(m.fpr, 3)}</dd>
          </dl>
        </div>
        <div>
          <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
            ROC curve, AUC = {fx(roc.auc, 3)}
          </div>
          <div className="plot-wrap">
            <Plot xDomain={[0, 1]} yDomain={[0, 1]} height={210} xLabel="FPR" yLabel="TPR" xTicks={[0, 0.5, 1]} yTicks={[0, 0.5, 1]}>
              {(s) => (
                <>
                  <path d={line([[s.x(0), s.y(0)], [s.x(1), s.y(1)]])} stroke="var(--ink-3)" strokeDasharray="4 4" />
                  <path d={line(roc.pts.map((p) => [s.x(p.fpr), s.y(p.tpr)])) + `L${s.x(1)} ${s.y(0)} L${s.x(0)} ${s.y(0)}Z`} fill="var(--ultra)" opacity={0.1} />
                  <path d={line(roc.pts.map((p) => [s.x(p.fpr), s.y(p.tpr)]))} fill="none" stroke="var(--ultra)" strokeWidth={2.2} />
                  <circle cx={s.x(m.fpr)} cy={s.y(m.recall)} r={6} fill="var(--rose)" stroke="var(--surface)" strokeWidth={2} />
                </>
              )}
            </Plot>
          </div>
        </div>
        <div>
          <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
            Precision–recall curve
          </div>
          <div className="plot-wrap">
            <Plot xDomain={[0, 1]} yDomain={[0, 1.02]} height={210} xLabel="recall" yLabel="precision" xTicks={[0, 0.5, 1]} yTicks={[0, 0.5, 1]}>
              {(s) => (
                <>
                  <line x1={s.x(0)} x2={s.x(1)} y1={s.y(posRate)} y2={s.y(posRate)} stroke="var(--ink-3)" strokeDasharray="4 4" />
                  <path d={line(roc.pts.slice(1).map((p) => [s.x(p.recall), s.y(p.precision)]))} fill="none" stroke="var(--viridian)" strokeWidth={2.2} />
                  {Number.isFinite(m.precision) && <circle cx={s.x(m.recall)} cy={s.y(m.precision)} r={6} fill="var(--rose)" stroke="var(--surface)" strokeWidth={2} />}
                </>
              )}
            </Plot>
          </div>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Accuracy paradox on imbalanced data                                       */
/* ------------------------------------------------------------------------ */

export function ImbalanceFigure() {
  const [rate, setRate] = useState(0.01);
  const n = 10000;
  const pos = Math.round(n * rate);
  const dummy = { tp: 0, fn: pos, fp: 0, tn: n - pos };
  const dm = binaryMetrics(dummy);
  const good = { tp: Math.round(pos * 0.8), fn: pos - Math.round(pos * 0.8), fp: Math.round((n - pos) * 0.05), tn: n - pos - Math.round((n - pos) * 0.05) };
  const gm = binaryMetrics(good);
  return (
    <Figure
      title="The accuracy paradox"
      hint="Make the positive class rarer"
      caption={
        <>
          10,000 ad impressions, of which only a few are clicks. A useless model that always predicts “no click” scores very high accuracy, yet
          finds no clicks at all (recall 0, F1 0). A genuinely useful model that catches 80% of clicks with a 5% false-alarm rate can have{' '}
          <em>lower</em> accuracy. On imbalanced data, report precision, recall, F1 or AUC instead.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.7rem' }}>
        <Slider label="Positive (click) rate" value={rate} min={0.005} max={0.5} step={0.005} onChange={setRate} format={(v) => `${f(v * 100, 1)}%`} width="14rem" />
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Model</th>
              <th className="n">TP</th>
              <th className="n">FN</th>
              <th className="n">FP</th>
              <th className="n">TN</th>
              <th className="n">Accuracy</th>
              <th className="n">Precision</th>
              <th className="n">Recall</th>
              <th className="n">F1</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Always “no click”', dummy, dm],
              ['Useful model', good, gm],
            ].map(([name, cm, mm]) => {
              const c2 = cm as typeof dummy;
              const m2 = mm as typeof dm;
              return (
                <tr key={name as string}>
                  <td style={{ fontWeight: 650 }}>{name as string}</td>
                  <td className="n">{c2.tp}</td>
                  <td className="n">{c2.fn}</td>
                  <td className="n">{c2.fp}</td>
                  <td className="n">{c2.tn}</td>
                  <td className="n" style={{ fontWeight: 800 }}>
                    {fx(m2.accuracy * 100, 1)}%
                  </td>
                  <td className="n">{Number.isFinite(m2.precision) ? fx(m2.precision, 3) : 'undefined'}</td>
                  <td className="n">{fx(m2.recall, 3)}</td>
                  <td className="n">{Number.isFinite(m2.f1) ? fx(m2.f1, 3) : '0'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Multiclass confusion matrix on digits                                     */
/* ------------------------------------------------------------------------ */

export function DigitsConfusionFigure() {
  const [k, setK] = useState(5);
  const data = useMemo(() => {
    const tr = digits(101, 25);
    const te = digits(202, 15);
    return { tr, te };
  }, []);
  const cm = useMemo(() => {
    const M = range(10).map(() => range(10).map(() => 0));
    data.te.X.forEach((x, i) => {
      const p = knnPredict(data.tr.X, data.tr.y, x, k).label;
      M[data.te.y[i]][p]++;
    });
    return M;
  }, [data, k]);
  const rep = multiclassReport(cm, range(10).map(String));
  const max = Math.max(...cm.flat());
  return (
    <Figure
      title="A 10-class confusion matrix"
      hint="Change k of the k-NN classifier"
      caption={
        <>
          Rows are the true digit, columns the prediction; the diagonal holds correct predictions. Off-diagonal cells show <em>which</em> digits
          get confused, information that a single accuracy number hides. The table on the right is scikit-learn’s classification_report.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.7rem' }}>
        <Slider label="k-NN neighbours" value={k} min={1} max={15} onChange={setK} />
        <dl className="readout" style={{ minWidth: '13rem' }}>
          <dt>Accuracy</dt>
          <dd>{fx(rep.accuracy * 100, 1)}%</dd>
          <dt>Macro F1 / weighted F1</dt>
          <dd>
            {fx(rep.macro.f1, 3)} / {fx(rep.weighted.f1, 3)}
          </dd>
        </dl>
      </div>
      <div className="viz-grid">
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `1.6rem repeat(10, minmax(1.9rem, 1fr))`, gap: 2, fontSize: '0.72rem', minWidth: '22rem' }}>
            <span />
            {range(10).map((j) => (
              <span key={j} style={{ textAlign: 'center', color: 'var(--ink-3)', fontWeight: 700 }}>
                {j}
              </span>
            ))}
            {cm.map((row, i) => [
              <span key={`r${i}`} style={{ color: 'var(--ink-3)', fontWeight: 700, alignSelf: 'center' }}>
                {i}
              </span>,
              ...row.map((v, j) => (
                <span
                  key={`${i}-${j}`}
                  style={{
                    height: '1.9rem',
                    borderRadius: 4,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    background: v === 0 ? 'var(--surface-2)' : i === j ? `color-mix(in srgb, var(--ultra) ${20 + (v / max) * 75}%, var(--surface))` : `color-mix(in srgb, var(--rose) ${25 + (v / max) * 70}%, var(--surface))`,
                    color: v / max > 0.5 ? 'var(--surface)' : 'var(--ink)',
                  }}
                >
                  {v || ''}
                </span>
              )),
            ])}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)', marginTop: 6 }}>rows: true label, columns: predicted label</div>
        </div>
        <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Class</th>
                <th className="n">Precision</th>
                <th className="n">Recall</th>
                <th className="n">F1</th>
                <th className="n">Support</th>
              </tr>
            </thead>
            <tbody>
              {rep.per.map((p) => (
                <tr key={p.label}>
                  <td>{p.label}</td>
                  <td className="n">{fx(p.precision, 2)}</td>
                  <td className="n">{fx(p.recall, 2)}</td>
                  <td className="n">{fx(p.f1, 2)}</td>
                  <td className="n">{p.support}</td>
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
/* Regression metrics with a draggable outlier                               */
/* ------------------------------------------------------------------------ */

export function RegressionMetricsFigure() {
  const base = useMemo(() => {
    const rng = mulberry32(6);
    return range(14).map((i) => {
      const x = 1 + i * 0.7;
      return { x, y: 2 + 1.5 * x + gaussian(rng, 0, 0.9) };
    });
  }, []);
  const [outY, setOutY] = useState(0);
  const pts = base.map((p, i) => (i === 10 ? { ...p, y: p.y + outY } : p));
  const pred = (x: number) => 2 + 1.5 * x;
  const res = pts.map((p) => p.y - pred(p.x));
  const yb = mean(pts.map((p) => p.y));
  const mae = mean(res.map(Math.abs));
  const mse = mean(res.map((r) => r * r));
  const r2v = 1 - sum(res.map((r) => r * r)) / sum(pts.map((p) => (p.y - yb) ** 2));
  return (
    <Figure
      title="MAE, MSE, RMSE and R² react differently to a big error"
      hint="Push one point away from the line"
      caption={
        <>
          The line is a fixed model. Moving one point creates a single large residual. MAE grows in proportion to it; MSE grows with its square,
          so it reacts most; RMSE (the square root of MSE) is back in the target’s units but still dominated by the outlier. R² drops because the
          unexplained share of the variance rises.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.7rem' }}>
        <Slider label="Error added to one point" value={outY} min={-10} max={10} step={0.2} onChange={setOutY} format={(v) => f(v, 1)} width="14rem" />
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[0, 11]} yDomain={[-4, 26]} height={260} xLabel="x" yLabel="y">
            {(s) => (
              <>
                <line x1={s.x(0)} y1={s.y(pred(0))} x2={s.x(11)} y2={s.y(pred(11))} stroke="var(--ink)" strokeWidth={2} />
                {pts.map((p, i) => (
                  <g key={i}>
                    <line x1={s.x(p.x)} x2={s.x(p.x)} y1={s.y(p.y)} y2={s.y(pred(p.x))} stroke="var(--rose)" strokeWidth={1.4} />
                    <circle cx={s.x(p.x)} cy={s.y(p.y)} r={i === 10 ? 6.5 : 4.5} fill={i === 10 ? 'var(--rose)' : 'var(--ultra)'} stroke="var(--surface)" />
                  </g>
                ))}
              </>
            )}
          </Plot>
        </div>
        <dl className="readout" style={{ alignContent: 'start', fontSize: '0.92rem' }}>
          <dt>MAE = mean |y − ŷ|</dt>
          <dd>{fx(mae, 3)}</dd>
          <dt>MSE = mean (y − ŷ)²</dt>
          <dd>{fx(mse, 3)}</dd>
          <dt>RMSE = √MSE</dt>
          <dd>{fx(Math.sqrt(mse), 3)}</dd>
          <dt>R²</dt>
          <dd>{fx(r2v, 4)}</dd>
        </dl>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Classification losses vs margin                                           */
/* ------------------------------------------------------------------------ */

export function LossFigure() {
  const ms = range(241).map((i) => -3 + (6 * i) / 240);
  const fns = [
    { name: '0–1 loss (what accuracy counts)', f: lossFns.zeroOne, c: 'var(--ink-3)' },
    { name: 'Hinge loss (SVM)', f: lossFns.hinge, c: 'var(--rose)' },
    { name: 'Log-loss (logistic regression), base 2', f: lossFns.log, c: 'var(--ultra)' },
    { name: 'Squared hinge', f: lossFns.squaredHinge, c: 'var(--ochre)' },
  ];
  return (
    <Figure
      title="Classification losses as a function of the margin"
      caption={
        <>
          The margin m = y·f(x) is positive when the prediction is on the correct side, and larger when it is more confident. Accuracy uses the
          0–1 step, which has no useful gradient, so models optimise smooth surrogates. <b>Hinge loss</b> is exactly zero once m ≥ 1: well-classified
          points stop mattering (hence support vectors). <b>Log-loss</b> never reaches zero, so every point keeps pushing, and it heavily penalises
          confident mistakes.
        </>
      }
    >
      <div className="plot-wrap">
        <Plot xDomain={[-3, 3]} yDomain={[0, 4]} height={250} xLabel="margin  y · f(x)" yLabel="loss">
          {(s) => (
            <>
              <line x1={s.x(0)} x2={s.x(0)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--rule-strong)" />
              {fns.map((fn) => (
                <path key={fn.name} d={line(ms.map((m) => [s.x(m), s.y(Math.min(4, fn.f(m)))]))} fill="none" stroke={fn.c} strokeWidth={fn.c === 'var(--ink-3)' ? 2 : 2.4} strokeDasharray={fn.c === 'var(--ink-3)' ? '5 4' : undefined} />
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

/* ------------------------------------------------------------------------ */
/* Cost-sensitive threshold choice                                           */
/* ------------------------------------------------------------------------ */

export function CostFigure() {
  const [cFN, setCFN] = useState(5);
  const [cFP, setCFP] = useState(1);
  const data = useMemo(() => {
    const rng = mulberry32(23);
    const y: number[] = [];
    const s: number[] = [];
    for (let i = 0; i < 500; i++) {
      const pos = i < 60;
      const z = gaussian(rng, pos ? 0.9 : -0.9, 1);
      y.push(pos ? 1 : 0);
      s.push(1 / (1 + Math.exp(-z * 1.5)));
    }
    return { y, s };
  }, []);
  const thrs = range(99, 1).map((t) => t / 100);
  const costs = thrs.map((t) => {
    const c = confusionAt(data.y, data.s, t);
    return { t, cost: cFN * c.fn + cFP * c.fp, c };
  });
  const best = costs.reduce((a, b) => (b.cost < a.cost ? b : a));
  const at50 = costs.find((c) => Math.abs(c.t - 0.5) < 1e-9)!;
  const maxC = Math.max(...costs.map((c) => c.cost));
  const auc = aucRank(data.y, data.s);
  return (
    <Figure
      title="A custom cost metric moves the best threshold"
      hint="Set what each kind of error costs"
      caption={
        <>
          Fraud screening of 500 transactions (60 fraudulent). The curve is the total cost <b>C_FN × FN + C_FP × FP</b> at every threshold. When
          a missed fraud costs five times a false alarm, the cheapest threshold is far below 0.5: the model should flag more transactions. Accuracy
          and AUC ({fx(auc, 3)}) cannot express this; a custom scorer can, and grid search can optimise it directly.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.7rem' }}>
        <Slider label="Cost of a false negative" value={cFN} min={1} max={20} onChange={setCFN} />
        <Slider label="Cost of a false positive" value={cFP} min={1} max={20} onChange={setCFP} />
      </div>
      <div className="viz-grid">
        <div className="plot-wrap">
          <Plot xDomain={[0, 1]} yDomain={[0, maxC * 1.05]} height={240} xLabel="threshold" yLabel="total cost">
            {(s) => (
              <>
                <path d={line(costs.map((c) => [s.x(c.t), s.y(c.cost)]))} fill="none" stroke="var(--ultra)" strokeWidth={2.4} />
                <line x1={s.x(0.5)} x2={s.x(0.5)} y1={s.m.t} y2={s.m.t + s.h} stroke="var(--ink-3)" strokeDasharray="4 4" />
                <circle cx={s.x(best.t)} cy={s.y(best.cost)} r={6.5} fill="var(--rose)" stroke="var(--surface)" strokeWidth={2} />
                <text x={s.x(best.t) + 8} y={s.y(best.cost) - 8} style={{ fill: 'var(--rose)', fontWeight: 800 }}>
                  best t = {f(best.t, 2)}
                </text>
              </>
            )}
          </Plot>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Threshold</th>
                <th className="n">FN</th>
                <th className="n">FP</th>
                <th className="n">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>0.50 (default)</td>
                <td className="n">{at50.c.fn}</td>
                <td className="n">{at50.c.fp}</td>
                <td className="n">{at50.cost}</td>
              </tr>
              <tr data-hl="true">
                <td>{f(best.t, 2)} (cheapest)</td>
                <td className="n">{best.c.fn}</td>
                <td className="n">{best.c.fp}</td>
                <td className="n">{best.cost}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Figure>
  );
}
