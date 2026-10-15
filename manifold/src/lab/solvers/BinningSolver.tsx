import { useState } from 'react';
import { MB } from '../../components/Math';
import { Code, Table } from '../../components/prose';
import { f, fx, tf } from '../../lib/fmt';
import { binEdges, binIndex } from '../../viz/m4';
import { NumberInput, NumbersField } from '../inputs';
import { ErrorLine, InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  q17: { label: 'Age, 3 equal-width bins (Q17)', v: [18, 25, 35, 45, 55, 65], k: 3, labels: 'Young, Middle-aged, Senior' },
  slides: { label: 'Ages 18–75 (slides)', v: [18, 22, 35, 45, 52, 60, 75], k: 3, labels: 'Young, Middle-aged, Senior' },
  q18: { label: 'Skewed income (Q18)', v: [12, 15, 18, 20, 22, 25, 30, 40, 120, 500], k: 5, labels: '' },
};
type PId = keyof typeof PRESETS;

export default function BinningSolver() {
  const [preset, setPreset] = useState<PId | null>('q17');
  const [vals, setVals] = useState(PRESETS.q17.v);
  const [k, setK] = useState(3);
  const [labelsText, setLabelsText] = useState(PRESETS.q17.labels);
  const labels = labelsText.split(',').map((s) => s.trim()).filter(Boolean);
  const name = (b: number) => labels[b] ?? `Bin ${b + 1}`;
  const ok = vals.length >= 2 && k >= 1 && k <= vals.length;
  const sorted = vals.slice().sort((a, b) => a - b);
  const ew = ok ? binEdges(vals, k, 'width') : [];
  const ef = ok ? binEdges(vals, k, 'freq') : [];
  const w = ok ? (sorted[sorted.length - 1] - sorted[0]) / k : 0;
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setVals(PRESETS[id].v);
            setK(PRESETS[id].k);
            setLabelsText(PRESETS[id].labels);
          }}
        />
        <div className="controls" style={{ alignItems: 'stretch' }}>
          <NumbersField label="Values" value={vals} onChange={(v) => { setPreset(null); setVals(v); }} />
          <NumberInput label="Number of bins k" value={k} min={1} onChange={setK} />
          <label className="ctl" style={{ flex: '1 1 14rem' }}>
            <span className="ctl__label">Bin labels (optional, comma separated)</span>
            <input className="field" value={labelsText} onChange={(e) => setLabelsText(e.target.value)} />
          </label>
        </div>
        {!ok && <ErrorLine>Enter at least two values and 1 ≤ k ≤ number of values.</ErrorLine>}
      </InputCard>
      {ok && (
        <Work>
          <WorkStep title="Equal-width binning: compute the width">
            <MB>{`w = \\frac{\\max - \\min}{k} = \\frac{${tf(sorted[sorted.length - 1])} - ${tf(sorted[0])}}{${k}} = ${tf(w, 4)}`}</MB>
            <p>Edges: {ew.map((e) => f(e, 3)).join(', ')}. Bins are (lower, upper], with the minimum included in the first bin (the pandas.cut convention).</p>
          </WorkStep>
          <WorkStep title="Equal-width: assign every value">
            <Table
              head={['Bin', 'Range', 'Values', 'Count']}
              numeric={[3]}
              rows={Array.from({ length: k }, (_, b) => [name(b), `${f(ew[b], 3)} – ${f(ew[b + 1], 3)}`, vals.filter((v) => binIndex(v, ew) === b).join(', ') || '—', vals.filter((v) => binIndex(v, ew) === b).length])}
            />
            <p>Transformed: [{vals.map((v) => name(binIndex(v, ew))).join(', ')}]</p>
          </WorkStep>
          <WorkStep title="Equal-frequency (quantile) binning">
            <p>
              Sort the values ({sorted.join(', ')}) and cut them into {k} groups of about {fx(vals.length / k, 2)} values each. The edges are the{' '}
              {k}-quantiles, found by linear interpolation at positions (n − 1)·i/k: {ef.map((e) => f(e, 3)).join(', ')}.
            </p>
            <Table
              head={['Bin', 'Range', 'Values', 'Count']}
              numeric={[3]}
              rows={Array.from({ length: k }, (_, b) => [name(b), `${f(ef[b], 3)} – ${f(ef[b + 1], 3)}`, vals.filter((v) => binIndex(v, ef) === b).join(', ') || '—', vals.filter((v) => binIndex(v, ef) === b).length])}
            />
          </WorkStep>
          <Result label="Comparison">
            Equal width counts: {Array.from({ length: k }, (_, b) => vals.filter((v) => binIndex(v, ew) === b).length).join(' / ')}; equal frequency counts:{' '}
            {Array.from({ length: k }, (_, b) => vals.filter((v) => binIndex(v, ef) === b).length).join(' / ')}.
            <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
              Equal width keeps intervals interpretable but follows the skew; equal frequency balances the bins and is robust to outliers.
            </div>
          </Result>
          <div style={{ marginTop: '1.5rem' }}>
            <Code title="binning.py">{`
import pandas as pd
x = pd.Series([${vals.join(', ')}])
print(pd.cut(x, bins=${k}${labels.length === k ? `, labels=${JSON.stringify(labels)}` : ''}))    # equal width
print(pd.qcut(x, q=${k}${labels.length === k ? `, labels=${JSON.stringify(labels)}` : ''}))      # equal frequency
`}</Code>
          </div>
        </Work>
      )}
    </>
  );
}
