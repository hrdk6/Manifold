import { useState } from 'react';
import { M, MB } from '../../components/Math';
import { Plot } from '../../components/Plot';
import { Code, Table } from '../../components/prose';
import { fx, tf } from '../../lib/fmt';
import { ols1 } from '../../lib/supervised';
import { NumberInput, NumbersField } from '../inputs';
import { ErrorLine, InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  marks: { label: 'Hours → marks (SEE ’25 3a)', x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], y: [35, 50, 60, 70, 80, 85, 90, 94, 97, 98], xn: 'Hours studied', yn: 'Marks' },
  q19: { label: 'X = 1…5 (M4 Q19)', x: [1, 2, 3, 4, 5], y: [2.1, 4.3, 6.5, 8.7, 10.9], xn: 'X', yn: 'y' },
  chem: { label: 'Time → mass (notes)', x: [5, 7, 12, 16, 20], y: [40, 120, 180, 210, 240], xn: 'Time (s)', yn: 'Mass (g)' },
};
type PId = keyof typeof PRESETS;

export default function LinRegSolver() {
  const [preset, setPreset] = useState<PId | null>('marks');
  const [x, setX] = useState(PRESETS.marks.x);
  const [y, setY] = useState(PRESETS.marks.y);
  const [q, setQ] = useState(7.5);
  const n = Math.min(x.length, y.length);
  const xs = x.slice(0, n);
  const ys = y.slice(0, n);
  const ok = n >= 2 && new Set(xs).size > 1;
  const r = ok ? ols1(xs, ys) : null;
  const names = preset ? PRESETS[preset] : { xn: 'x', yn: 'y' };
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
          <NumbersField label="x values (independent)" value={x} onChange={(v) => { setPreset(null); setX(v); }} />
          <NumbersField label="y values (dependent)" value={y} onChange={(v) => { setPreset(null); setY(v); }} />
          <NumberInput label="Predict at x =" value={q} step={0.5} onChange={setQ} />
        </div>
        {x.length !== y.length && <ErrorLine>x has {x.length} values and y has {y.length}; using the first {n} pairs.</ErrorLine>}
        {!ok && <ErrorLine>Enter at least two pairs with different x values.</ErrorLine>}
      </InputCard>
      {r && (
        <Work>
          <WorkStep title="Model and formulas">
            <MB>{'\\hat{y} = a + b x, \\qquad b = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2}, \\qquad a = \\bar{y} - b\\bar{x}'}</MB>
          </WorkStep>
          <WorkStep title="Compute the means">
            <MB>{`\\bar{x} = \\frac{${tf(r.sumX)}}{${n}} = ${tf(r.xb)} \\qquad \\bar{y} = \\frac{${tf(r.sumY)}}{${n}} = ${tf(r.yb)}`}</MB>
          </WorkStep>
          <WorkStep title="Deviation table">
            <Table
              head={['x', 'y', 'x − x̄', 'y − ȳ', '(x − x̄)(y − ȳ)', '(x − x̄)²']}
              numeric={[0, 1, 2, 3, 4, 5]}
              rows={xs.map((v, i) => [v, ys[i], fx(r.dx[i], 3), fx(r.dy[i], 3), fx(r.dx[i] * r.dy[i], 4), fx(r.dx[i] ** 2, 4)])}
              foot={[`Σ ${tf(r.sumX)}`, `Σ ${tf(r.sumY)}`, '0', '0', `Sxy = ${fx(r.sxy, 4)}`, `Sxx = ${fx(r.sxx, 4)}`]}
            />
          </WorkStep>
          <WorkStep title="Slope and intercept">
            <MB>{`b = \\frac{S_{xy}}{S_{xx}} = \\frac{${tf(r.sxy)}}{${tf(r.sxx)}} = ${tf(r.b)}`}</MB>
            <MB>{`a = ${tf(r.yb)} - (${tf(r.b)})(${tf(r.xb)}) = ${tf(r.a)}`}</MB>
            <p style={{ fontSize: '0.95rem', color: 'var(--ink-2)' }}>
              Check with the computational formula: <M>{`b = \\frac{\\sum xy - \\frac{\\sum x \\sum y}{n}}{\\sum x^2 - \\frac{(\\sum x)^2}{n}} = \\frac{${tf(r.sumXY)} - \\frac{${tf(r.sumX)} \\times ${tf(r.sumY)}}{${n}}}{${tf(r.sumX2)} - \\frac{${tf(r.sumX)}^2}{${n}}} = ${tf(r.b)}`}</M>
            </p>
          </WorkStep>
          <WorkStep title="Predictions, residuals and goodness of fit">
            <Table
              head={['x', 'y', 'ŷ', 'y − ŷ', '(y − ŷ)²', '(y − ȳ)²']}
              numeric={[0, 1, 2, 3, 4, 5]}
              rows={xs.map((v, i) => [v, ys[i], fx(r.pred[i], 3), fx(r.res[i], 3), fx(r.res[i] ** 2, 4), fx(r.dy[i] ** 2, 4)])}
              foot={['', '', '', '', `SSE = ${fx(r.sse, 4)}`, `SST = ${fx(r.sst, 4)}`]}
            />
            <MB>{`R^2 = 1 - \\frac{SSE}{SST} = 1 - \\frac{${tf(r.sse)}}{${tf(r.sst)}} = ${tf(r.r2)} \\qquad \\text{MSE} = ${tf(r.mse)} \\qquad \\text{RMSE} = ${tf(r.rmse)}`}</MB>
            <div className="plot-wrap" style={{ maxWidth: 560 }}>
              <Plot
                xDomain={[Math.min(...xs) - 1, Math.max(...xs) + 1]}
                yDomain={[Math.min(...ys, r.a + r.b * (Math.min(...xs) - 1)) * 0.9 - 1, Math.max(...ys, r.a + r.b * (Math.max(...xs) + 1)) * 1.08]}
                height={260}
                xLabel={names.xn}
                yLabel={names.yn}
              >
                {(s) => (
                  <>
                    <line x1={s.x(Math.min(...xs) - 1)} y1={s.y(r.a + r.b * (Math.min(...xs) - 1))} x2={s.x(Math.max(...xs) + 1)} y2={s.y(r.a + r.b * (Math.max(...xs) + 1))} stroke="var(--rose)" strokeWidth={2.2} />
                    {xs.map((v, i) => (
                      <g key={i}>
                        <line x1={s.x(v)} x2={s.x(v)} y1={s.y(ys[i])} y2={s.y(r.pred[i])} stroke="var(--ink-3)" strokeDasharray="3 3" />
                        <circle cx={s.x(v)} cy={s.y(ys[i])} r={5} fill="var(--ultra)" stroke="var(--surface)" strokeWidth={1.5} />
                      </g>
                    ))}
                    <circle cx={s.x(q)} cy={s.y(r.a + r.b * q)} r={6} fill="none" stroke="var(--ochre)" strokeWidth={2.5} />
                  </>
                )}
              </Plot>
            </div>
          </WorkStep>
          <Result label="Regression line">
            <M>{`\\hat{y} = ${tf(r.a, 4)} ${r.b < 0 ? '-' : '+'} ${tf(Math.abs(r.b), 4)}\\,x`}</M>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
              R² = {fx(r.r2, 4)}. At x = {q}: ŷ = {fx(r.a + r.b * q, 3)}. Each unit increase in x changes ŷ by {fx(r.b, 4)}.
            </div>
          </Result>
          <div style={{ marginTop: '1.5rem' }}>
            <Code title="linear_regression.py">{`
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error

X = np.array([${xs.join(', ')}]).reshape(-1, 1)
y = np.array([${ys.join(', ')}])
model = LinearRegression().fit(X, y)
print("slope:", model.coef_[0], "intercept:", model.intercept_)   # ${fx(r.b, 4)}, ${fx(r.a, 4)}
pred = model.predict(X)
print("R2:", r2_score(y, pred), "MSE:", mean_squared_error(y, pred))
print(model.predict([[${q}]]))
`}</Code>
          </div>
        </Work>
      )}
    </>
  );
}
