import { useMemo, useState } from 'react';
import { M, MB } from '../../components/Math';
import { Plot } from '../../components/Plot';
import { Code, Table } from '../../components/prose';
import { fx, tf } from '../../lib/fmt';
import { logisticFit } from '../../lib/supervised';
import { NumberInput, NumbersField } from '../inputs';
import { ErrorLine, InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  slides: { label: 'Hours → pass (slides Ex. 1)', x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], y: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1] },
  q14: { label: 'Two students (Q14)', x: [2, 5], y: [0, 1] },
  noisy: { label: 'Overlapping classes', x: [0.5, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10], y: [0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1] },
};
type PId = keyof typeof PRESETS;

export default function LogisticSolver() {
  const [preset, setPreset] = useState<PId | null>('slides');
  const [x, setX] = useState(PRESETS.slides.x);
  const [y, setY] = useState(PRESETS.slides.y);
  const [C, setC] = useState(1);
  const [q, setQ] = useState(4.5);
  const n = Math.min(x.length, y.length);
  const xs = x.slice(0, n);
  const ys = y.slice(0, n).map((v) => (v > 0 ? 1 : 0));
  const ok = n >= 2 && new Set(ys).size === 2;
  const fit = useMemo(() => (ok ? logisticFit(xs.map((v) => [v]), ys, C > 0 ? C : Infinity) : null), [ok, xs.join(), ys.join(), C]); // eslint-disable-line react-hooks/exhaustive-deps
  const separable = ok && (Math.max(...xs.filter((_, i) => ys[i] === 0)) < Math.min(...xs.filter((_, i) => ys[i] === 1)) || Math.max(...xs.filter((_, i) => ys[i] === 1)) < Math.min(...xs.filter((_, i) => ys[i] === 0)));
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setX(PRESETS[id].x);
            setY(PRESETS[id].y);
          }}
        />
        <div className="controls" style={{ alignItems: 'stretch' }}>
          <NumbersField label="Feature x" value={x} onChange={(v) => { setPreset(null); setX(v); }} />
          <NumbersField label="Label y (0 or 1)" value={y} onChange={(v) => { setPreset(null); setY(v); }} />
          <NumberInput label="C (inverse regularisation)" value={C} step={0.5} min={0} onChange={setC} width="7rem" />
          <NumberInput label="Predict at x =" value={q} step={0.5} onChange={setQ} />
        </div>
        {!ok && <ErrorLine>Enter at least one example of each class (0 and 1).</ErrorLine>}
      </InputCard>
      {fit && (
        <Work>
          <WorkStep title="The model">
            <MB>{'P(y = 1 \\mid x) = \\sigma(z) = \\frac{1}{1 + e^{-z}}, \\qquad z = b + w x'}</MB>
            <p>
              Parameters are chosen to minimise the log-loss{C > 0 ? ' plus an L2 penalty on w (scikit-learn’s default, strength 1/C)' : ''}:
            </p>
            <MB>{`J(w, b) = -\\sum_{i} \\big[ y_i \\ln p_i + (1 - y_i) \\ln(1 - p_i) \\big]${C > 0 ? ` + \\frac{1}{2 \\cdot ${tf(C)}} w^2` : ''}`}</MB>
            {separable && (
              <p style={{ color: 'var(--ochre)', fontSize: '0.95rem' }}>
                The classes are perfectly separable, so without regularisation (C → ∞) the best w is infinite: the sigmoid becomes a step. With C ={' '}
                {C} the penalty keeps w finite. This is why answers to this question differ between textbooks: state the C you use.
              </p>
            )}
          </WorkStep>
          <WorkStep title="Fitted coefficients (Newton’s method until convergence)">
            <MB>{`b = ${tf(fit.w[0], 4)}, \\qquad w = ${tf(fit.w[1], 4)}`}</MB>
            <MB>{`z = ${tf(fit.w[0], 4)} ${fit.w[1] < 0 ? '-' : '+'} ${tf(Math.abs(fit.w[1]), 4)}\\,x`}</MB>
            <p>Mean log-loss on the data: {fx(fit.logloss, 4)}.</p>
          </WorkStep>
          <WorkStep title="Probabilities for each example">
            <Table
              head={['x', 'y', 'z = b + wx', 'p = σ(z)', 'Predicted (p ≥ 0.5)', '−log-likelihood']}
              numeric={[0, 1, 2, 3, 5]}
              rows={xs.map((v, i) => {
                const z = fit.w[0] + fit.w[1] * v;
                const p = fit.prob([v]);
                return [v, ys[i], fx(z, 3), fx(p, 4), p >= 0.5 ? 1 : 0, fx(-(ys[i] ? Math.log(p) : Math.log(1 - p)), 4)];
              })}
            />
          </WorkStep>
          <WorkStep title="Decision boundary and interpretation">
            <MB>{`z = 0 \\;\\Rightarrow\\; x^* = -\\frac{b}{w} = -\\frac{${tf(fit.w[0], 4)}}{${tf(fit.w[1], 4)}} = ${tf(-fit.w[0] / fit.w[1], 3)}`}</MB>
            <ul>
              <li>
                <strong>w = {fx(fit.w[1], 4)}</strong>: each one-unit increase in x adds {fx(fit.w[1], 3)} to the log-odds of class 1, i.e. multiplies the
                odds by <M>{`e^{${tf(fit.w[1], 3)}} = ${tf(Math.exp(fit.w[1]), 3)}`}</M>.
              </li>
              <li>
                <strong>b = {fx(fit.w[0], 4)}</strong>: the log-odds at x = 0, a probability of {fx(fit.prob([0]), 4)}.
              </li>
              <li>
                At x = {q}: z = {fx(fit.w[0] + fit.w[1] * q, 3)}, P(y = 1) = {fx(fit.prob([q]), 4)}.
              </li>
            </ul>
            <div className="plot-wrap" style={{ maxWidth: 560 }}>
              <Plot xDomain={[Math.min(...xs) - 1, Math.max(...xs) + 1]} yDomain={[-0.08, 1.08]} height={240} xLabel="x" yLabel="P(y = 1)" yTicks={[0, 0.5, 1]}>
                {(s) => {
                  const lo = Math.min(...xs) - 1;
                  const hi = Math.max(...xs) + 1;
                  const pts = Array.from({ length: 160 }, (_, i) => lo + ((hi - lo) * i) / 159);
                  return (
                    <>
                      <line x1={s.m.l} x2={s.m.l + s.w} y1={s.y(0.5)} y2={s.y(0.5)} stroke="var(--ochre)" strokeDasharray="4 3" />
                      <path d={pts.map((v, i) => `${i ? 'L' : 'M'}${s.x(v)} ${s.y(fit.prob([v]))}`).join('')} fill="none" stroke="var(--ultra)" strokeWidth={2.4} />
                      {xs.map((v, i) => (
                        <circle key={i} cx={s.x(v)} cy={s.y(ys[i])} r={5} fill={ys[i] ? 'var(--ultra)' : 'var(--rose)'} stroke="var(--surface)" strokeWidth={1.5} />
                      ))}
                    </>
                  );
                }}
              </Plot>
            </div>
          </WorkStep>
          <Result label="Fitted model">
            <M>{`P(y=1 \\mid x) = \\frac{1}{1 + e^{-(${tf(fit.w[0], 3)} ${fit.w[1] < 0 ? '-' : '+'} ${tf(Math.abs(fit.w[1]), 3)}x)}}`}</M>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
              Boundary at x = {fx(-fit.w[0] / fit.w[1], 3)}; odds ratio per unit of x = {fx(Math.exp(fit.w[1]), 3)}.
            </div>
          </Result>
          <div style={{ marginTop: '1.5rem' }}>
            <Code title="logistic.py">{`
import numpy as np
from sklearn.linear_model import LogisticRegression

X = np.array([${xs.join(', ')}]).reshape(-1, 1)
y = np.array([${ys.join(', ')}])
clf = LogisticRegression(C=${C > 0 ? C : '1e9'}).fit(X, y)
print(clf.intercept_, clf.coef_)          # b, w
print(np.exp(clf.coef_))                  # odds ratio
print(clf.predict_proba([[${q}]]))
`}</Code>
          </div>
        </Work>
      )}
    </>
  );
}
