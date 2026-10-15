import { useState } from 'react';
import { MB } from '../../components/Math';
import { Table } from '../../components/prose';
import { fx, tf } from '../../lib/fmt';
import { regressionMetrics } from '../../lib/metrics';
import { NumbersField } from '../inputs';
import { ErrorLine, InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  small: { label: 'Five predictions', y: [3, 5, 7, 9, 11], p: [2.5, 5.5, 6.5, 9.5, 12] },
  house: { label: 'House prices (₹ lakh)', y: [45, 60, 52, 80, 95, 70], p: [48, 57, 55, 78, 90, 76] },
  outlier: { label: 'One large error', y: [10, 12, 14, 16, 18], p: [10.5, 11.5, 14.5, 15.5, 28] },
};
type PId = keyof typeof PRESETS;

export default function RegMetricsSolver() {
  const [preset, setPreset] = useState<PId | null>('small');
  const [y, setY] = useState(PRESETS.small.y);
  const [p, setP] = useState(PRESETS.small.p);
  const n = Math.min(y.length, p.length);
  const ok = n >= 2;
  const r = ok ? regressionMetrics(y.slice(0, n), p.slice(0, n)) : null;
  const absSum = r ? r.res.reduce((s, e) => s + Math.abs(e), 0) : 0;
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setY(PRESETS[id].y);
            setP(PRESETS[id].p);
          }}
        />
        <div className="controls" style={{ alignItems: 'stretch' }}>
          <NumbersField label="Actual y" value={y} onChange={(v) => { setPreset(null); setY(v); }} />
          <NumbersField label="Predicted ŷ" value={p} onChange={(v) => { setPreset(null); setP(v); }} />
        </div>
        {!ok && <ErrorLine>Enter at least two actual / predicted pairs.</ErrorLine>}
      </InputCard>
      {r && (
        <Work>
          <WorkStep title="Residual table">
            <Table
              head={['y', 'ŷ', 'e = y − ŷ', '|e|', 'e²', 'y − ȳ', '(y − ȳ)²']}
              numeric={[0, 1, 2, 3, 4, 5, 6]}
              rows={y.slice(0, n).map((v, i) => [v, p[i], fx(r.res[i], 3), fx(Math.abs(r.res[i]), 3), fx(r.res[i] ** 2, 3), fx(v - r.yb, 3), fx((v - r.yb) ** 2, 3)])}
              foot={['ȳ = ' + fx(r.yb, 3), '', '', fx(absSum, 3), fx(r.sse, 3), '', fx(r.sst, 3)]}
            />
          </WorkStep>
          <WorkStep title="The metrics">
            <MB>{`\\text{MAE} = \\frac{${tf(absSum)}}{${n}} = ${tf(r.mae)} \\qquad \\text{MSE} = \\frac{${tf(r.sse)}}{${n}} = ${tf(r.mse)} \\qquad \\text{RMSE} = \\sqrt{${tf(r.mse)}} = ${tf(r.rmse)}`}</MB>
            <MB>{`R^2 = 1 - \\frac{SSE}{SST} = 1 - \\frac{${tf(r.sse)}}{${tf(r.sst)}} = ${tf(r.r2)}`}</MB>
            {Number.isFinite(r.mape) && <MB>{`\\text{MAPE} = ${tf(r.mape * 100, 3)}\\%`}</MB>}
          </WorkStep>
          <Result label="Interpretation">
            Typical error ≈ {fx(r.mae, 3)} (MAE) to {fx(r.rmse, 3)} (RMSE) in the units of y; R² = {fx(r.r2, 4)}.
            <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
              {r.rmse > 1.5 * r.mae ? 'RMSE is much larger than MAE: a few large errors dominate.' : 'RMSE is close to MAE: errors are of similar size.'}
            </div>
          </Result>
        </Work>
      )}
    </>
  );
}
