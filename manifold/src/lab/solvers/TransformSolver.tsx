import { useState } from 'react';
import { Code, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { mean, skewness, variance } from '../../lib/math';
import { NumbersField } from '../inputs';
import { ErrorLine, InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  sales: { label: 'Sales (SEE ’25 8a)', v: [100, 200, 400, 800] },
  income: { label: 'Income (Q22)', v: [1, 4, 16, 64, 256] },
  counts: { label: 'Counts with zeros', v: [0, 1, 1, 2, 3, 5, 8, 13, 40, 120] },
};
type PId = keyof typeof PRESETS;

export default function TransformSolver() {
  const [preset, setPreset] = useState<PId | null>('sales');
  const [v, setV] = useState(PRESETS.sales.v);
  const hasZero = v.some((x) => x <= 0);
  const T = [
    { name: 'x', f: (x: number) => x },
    { name: '√x', f: Math.sqrt },
    { name: hasZero ? 'ln(x + 1)' : 'ln x', f: (x: number) => (hasZero ? Math.log(x + 1) : Math.log(x)) },
    { name: hasZero ? 'log₁₀(x + 1)' : 'log₁₀ x', f: (x: number) => (hasZero ? Math.log10(x + 1) : Math.log10(x)) },
  ];
  const ok = v.length >= 3 && v.every((x) => x >= 0);
  const stats = T.map((t) => {
    const y = v.map(t.f);
    const m = mean(y);
    const va = variance(y);
    return { name: t.name, y, m, va, sd: Math.sqrt(va), cv: Math.sqrt(va) / m, sk: skewness(y), range: Math.max(...y) - Math.min(...y), ratio: Math.min(...y) > 0 ? Math.max(...y) / Math.min(...y) : NaN };
  });
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setV(PRESETS[id].v);
          }}
        />
        <NumbersField label="Values" value={v} onChange={(x) => { setPreset(null); setV(x); }} />
        {!ok && <ErrorLine>Enter at least three non-negative values.</ErrorLine>}
        {ok && hasZero && <p style={{ fontSize: '0.82rem', color: 'var(--ochre)' }}>The data contains 0, where log is undefined, so log(x + 1) is used.</p>}
      </InputCard>
      {ok && (
        <Work>
          <WorkStep title="Apply each transformation">
            <Table head={T.map((t) => t.name)} numeric={T.map((_, i) => i)} rows={v.map((_, i) => stats.map((s) => fx(s.y[i], 4)))} />
          </WorkStep>
          <WorkStep title="Steps between consecutive sorted values">
            <Table
              head={['From → to', ...T.map((t) => `Δ ${t.name}`)]}
              numeric={T.map((_, i) => i + 1)}
              rows={v
                .map((_, i) => i)
                .slice(1)
                .map((i) => [`${v[i - 1]} → ${v[i]}`, ...stats.map((s) => fx(s.y[i] - s.y[i - 1], 4))])}
            />
            <p style={{ fontSize: '0.95rem', color: 'var(--ink-2)' }}>
              If the raw values grow by a constant factor, the log steps are constant: multiplicative growth becomes additive.
            </p>
          </WorkStep>
          <WorkStep title="Compare spread and shape">
            <Table
              head={['Statistic', ...T.map((t) => t.name)]}
              numeric={T.map((_, i) => i + 1)}
              rows={[
                ['Mean', ...stats.map((s) => fx(s.m, 4))],
                ['Variance (n − 1)', ...stats.map((s) => fx(s.va, 4))],
                ['Std deviation', ...stats.map((s) => fx(s.sd, 4))],
                ['Coefficient of variation', ...stats.map((s) => fx(s.cv, 4))],
                ['Range', ...stats.map((s) => fx(s.range, 4))],
                ['Max / min', ...stats.map((s) => (Number.isFinite(s.ratio) ? fx(s.ratio, 3) : '—'))],
                ['Skewness', ...stats.map((s) => fx(s.sk, 4))],
              ]}
            />
          </WorkStep>
          <Result label="Effect on skew">
            Skewness {fx(stats[0].sk, 3)} (raw) → {fx(stats[1].sk, 3)} (√) → {fx(stats[2].sk, 3)} (log).
            <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
              The log compresses large values most strongly, making right-skewed data more symmetric and stabilising its variance; √ is a milder
              version that also works at zero.
            </div>
          </Result>
          <div style={{ marginTop: '1.5rem' }}>
            <Code title="transform.py">{`
import numpy as np
x = np.array([${v.join(', ')}], dtype=float)
print(np.sqrt(x))
print(np.${hasZero ? 'log1p' : 'log'}(x))
print(np.${hasZero ? 'log10(x + 1)' : 'log10(x)'})
print(x.var(ddof=1), np.sqrt(x).var(ddof=1), np.${hasZero ? 'log1p' : 'log'}(x).var(ddof=1))
`}</Code>
          </div>
        </Work>
      )}
    </>
  );
}
