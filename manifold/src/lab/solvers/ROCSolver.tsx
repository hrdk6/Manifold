import { useState } from 'react';
import { MB } from '../../components/Math';
import { Plot } from '../../components/Plot';
import { Code, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { aucRank, rocCurve } from '../../lib/metrics';
import { NumbersField } from '../inputs';
import { ErrorLine, InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  spam: { label: 'Spam emails (notes)', y: [1, 0, 1, 0, 1, 0], s: [0.9, 0.2, 0.8, 0.1, 0.7, 0.3] },
  mixed: { label: 'Imperfect ranking', y: [1, 1, 0, 1, 0, 1, 0, 0, 1, 0], s: [0.95, 0.85, 0.8, 0.7, 0.55, 0.5, 0.4, 0.3, 0.2, 0.1] },
  ties: { label: 'With tied scores', y: [1, 0, 1, 1, 0, 0, 1, 0], s: [0.9, 0.9, 0.7, 0.6, 0.6, 0.4, 0.3, 0.2] },
};
type PId = keyof typeof PRESETS;

export default function ROCSolver() {
  const [preset, setPreset] = useState<PId | null>('spam');
  const [y, setY] = useState(PRESETS.spam.y);
  const [s, setS] = useState(PRESETS.spam.s);
  const n = Math.min(y.length, s.length);
  const yy = y.slice(0, n).map((v) => (v > 0 ? 1 : 0));
  const ss = s.slice(0, n);
  const ok = n >= 2 && yy.includes(1) && yy.includes(0);
  const r = ok ? rocCurve(yy, ss) : null;
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setY(PRESETS[id].y);
            setS(PRESETS[id].s);
          }}
        />
        <div className="controls" style={{ alignItems: 'stretch' }}>
          <NumbersField label="True labels (1 = positive)" value={y} onChange={(v) => { setPreset(null); setY(v); }} />
          <NumbersField label="Predicted scores / probabilities" value={s} onChange={(v) => { setPreset(null); setS(v); }} />
        </div>
        {!ok && <ErrorLine>Enter matching lists with at least one positive and one negative.</ErrorLine>}
      </InputCard>
      {r && (
        <Work>
          <WorkStep title="Sort the examples by score (highest first)">
            <Table
              head={['Rank', 'Example', 'Score', 'True label']}
              numeric={[0, 2, 3]}
              rows={ss
                .map((v, i) => ({ v, i }))
                .sort((a, b) => b.v - a.v)
                .map((o, k) => [k + 1, `#${o.i + 1}`, o.v, yy[o.i]])}
            />
            <p>
              P = {r.P} positives, N = {r.N} negatives. TPR = TP / P, FPR = FP / N.
            </p>
          </WorkStep>
          <WorkStep title="TPR and FPR at each threshold (score ≥ threshold ⇒ positive)">
            <Table
              head={['Threshold', 'TP', 'FP', 'TPR', 'FPR', 'Precision']}
              numeric={[0, 1, 2, 3, 4, 5]}
              rows={r.pts.map((p) => [Number.isFinite(p.thr) ? p.thr : '∞ (start)', p.tp, p.fp, fx(p.tpr, 3), fx(p.fpr, 3), Number.isFinite(p.thr) ? fx(p.precision, 3) : '—'])}
            />
          </WorkStep>
          <WorkStep title="Area under the curve by the trapezoidal rule">
            <MB>{'\\text{AUC} = \\sum_i (\\text{FPR}_i - \\text{FPR}_{i-1}) \\cdot \\frac{\\text{TPR}_i + \\text{TPR}_{i-1}}{2}'}</MB>
            <Table
              head={['Segment', 'ΔFPR', 'Mean TPR', 'Area']}
              numeric={[1, 2, 3]}
              rows={r.segs.map((g) => [`(${fx(g.x0, 2)}, ${fx(g.y0, 2)}) → (${fx(g.x1, 2)}, ${fx(g.y1, 2)})`, fx(g.x1 - g.x0, 3), fx((g.y0 + g.y1) / 2, 3), fx(g.area, 4)]).filter((_, i) => i < 40)}
              foot={['Total', '', '', fx(r.auc, 4)]}
            />
            <p>
              Check: the fraction of (positive, negative) pairs ranked correctly (ties count ½) = {fx(aucRank(yy, ss), 4)}. The two always agree.
            </p>
            <div className="plot-wrap" style={{ maxWidth: 340 }}>
              <Plot xDomain={[0, 1]} yDomain={[0, 1]} height={300} equal xLabel="FPR" yLabel="TPR" xTicks={[0, 0.5, 1]} yTicks={[0, 0.5, 1]}>
                {(sc) => (
                  <>
                    <line x1={sc.x(0)} y1={sc.y(0)} x2={sc.x(1)} y2={sc.y(1)} stroke="var(--ink-3)" strokeDasharray="4 4" />
                    <path d={r.pts.map((p, i) => `${i ? 'L' : 'M'}${sc.x(p.fpr)} ${sc.y(p.tpr)}`).join('') + `L${sc.x(1)} ${sc.y(0)} L${sc.x(0)} ${sc.y(0)}Z`} fill="var(--ultra)" opacity={0.12} />
                    <path d={r.pts.map((p, i) => `${i ? 'L' : 'M'}${sc.x(p.fpr)} ${sc.y(p.tpr)}`).join('')} fill="none" stroke="var(--ultra)" strokeWidth={2.4} />
                    {r.pts.map((p, i) => (
                      <circle key={i} cx={sc.x(p.fpr)} cy={sc.y(p.tpr)} r={4} fill="var(--rose)" />
                    ))}
                  </>
                )}
              </Plot>
            </div>
          </WorkStep>
          <Result label="AUC">
            {fx(r.auc, 4)}
            <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
              {r.auc >= 0.9 ? 'Excellent' : r.auc >= 0.8 ? 'Good' : r.auc >= 0.7 ? 'Fair' : r.auc >= 0.6 ? 'Poor' : 'About random'} discrimination: a random positive
              outranks a random negative with probability {fx(r.auc, 3)}.
            </div>
          </Result>
          <div style={{ marginTop: '1.5rem' }}>
            <Code title="roc.py">{`
from sklearn.metrics import roc_curve, roc_auc_score
y_true = [${yy.join(', ')}]
y_score = [${ss.join(', ')}]
fpr, tpr, thresholds = roc_curve(y_true, y_score)
print(fpr, tpr, thresholds)
print("AUC =", roc_auc_score(y_true, y_score))
`}</Code>
          </div>
        </Work>
      )}
    </>
  );
}
