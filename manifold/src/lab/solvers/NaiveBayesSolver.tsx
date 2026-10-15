import { useMemo, useState } from 'react';
import { M, MB } from '../../components/Math';
import { Toggle } from '../../components/controls';
import { Table } from '../../components/prose';
import { playTennis, fluCold, laptop } from '../../content/data/tables';
import { fx } from '../../lib/fmt';
import { naiveBayes } from '../../lib/supervised';
import { CatTableEditor, type CatTable } from '../inputs';
import { InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  tennis: { label: 'PlayTennis (Sunny, Cool, High, Strong)', data: playTennis, q: ['Sunny', 'Cool', 'High', 'Strong'] },
  flu: { label: 'Flu or cold', data: fluCold, q: ['High', 'Mild', 'Absent'] },
  laptop: { label: 'Laptop purchase', data: laptop, q: ['Low', 'Popular', '4GB'] },
};
type PId = keyof typeof PRESETS;

export default function NaiveBayesSolver() {
  const [preset, setPreset] = useState<PId | null>('tennis');
  const [table, setTable] = useState<CatTable>(structuredClone(PRESETS.tennis.data));
  const [query, setQuery] = useState<string[]>(PRESETS.tennis.q);
  const [laplace, setLaplace] = useState(false);
  const domains = table.attrs.map((_, i) => [...new Set(table.rows.map((r) => r.x[i]))]);
  const q = table.attrs.map((_, i) => query[i] ?? domains[i][0]);
  const nb = useMemo(() => naiveBayes(table.rows, table.attrs, q, laplace ? 1 : 0), [table, q.join(), laplace]); // eslint-disable-line react-hooks/exhaustive-deps
  const N = table.rows.length;
  const best = nb.per.reduce((a, b) => (b.score > a.score ? b : a));
  const frac = (num: number, den: number) => `\\tfrac{${num}}{${den}}`;
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setTable(structuredClone(PRESETS[id].data));
            setQuery(PRESETS[id].q);
          }}
        />
        <CatTableEditor value={table} onChange={(t) => { setPreset(null); setTable(t); }} />
        <div className="controls">
          {table.attrs.map((a, i) => (
            <label key={i} className="ctl">
              <span className="ctl__label">New {a}</span>
              <select className="field" value={q[i]} onChange={(e) => setQuery(q.map((v, j) => (j === i ? e.target.value : v)))}>
                {domains[i].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          ))}
          <Toggle label="Laplace smoothing (α = 1)" checked={laplace} onChange={setLaplace} />
        </div>
      </InputCard>
      <Work>
        <WorkStep title="Rule: choose the class with the largest P(C) × Π P(xᵢ | C)">
          <MB>{'\\hat{y} = \\argmax_{C} \\; P(C) \\prod_i P(x_i \\mid C)'}</MB>
          <p>
            Query: ⟨{q.join(', ')}⟩.{' '}
            {laplace ? 'Laplace smoothing adds 1 to every count and k (number of values) to every denominator.' : ''}
          </p>
        </WorkStep>
        <WorkStep title="Prior probabilities">
          <Table head={['Class', 'Count', 'P(C)']} numeric={[1, 2]} rows={nb.per.map((p) => [p.cls, p.nc, <M>{`${frac(p.nc, N)} = ${fx(p.prior, 4)}`}</M>])} />
        </WorkStep>
        <WorkStep title="Likelihood of each observed value within each class">
          <Table
            head={['Attribute = value', ...nb.per.map((p) => `P(· | ${p.cls})`)]}
            rows={table.attrs.map((a, i) => [
              `${a} = ${q[i]}`,
              ...nb.per.map((p) => {
                const t = p.terms[i];
                return <M>{`${laplace ? `\\tfrac{${t.cnt}+1}{${t.n}+${t.k}}` : frac(t.cnt, t.n)} = ${fx(t.p, 4)}`}</M>;
              }),
            ])}
          />
        </WorkStep>
        <WorkStep title="Multiply prior and likelihoods">
          {nb.per.map((p) => (
            <MB key={p.cls}>{`P(\\text{${p.cls}}) \\prod P(x_i \\mid \\text{${p.cls}}) = ${fx(p.prior, 4)} \\times ${p.terms.map((t) => fx(t.p, 4)).join(' \\times ')} = ${p.score < 1e-4 ? p.score.toExponential(4) : fx(p.score, 6)}`}</MB>
          ))}
          {nb.per.some((p) => p.score === 0) && (
            <p style={{ color: 'var(--rose)', fontSize: '0.95rem' }}>
              A zero count wipes out a product. Turn on Laplace smoothing to see the standard fix.
            </p>
          )}
        </WorkStep>
        <WorkStep title="Normalise to posterior probabilities">
          <Table head={['Class', 'Score', 'Posterior P(C | x)']} numeric={[1, 2]} rows={nb.per.map((p, i) => [p.cls, p.score < 1e-4 ? p.score.toExponential(4) : fx(p.score, 6), fx(nb.posterior[i], 4)])} />
        </WorkStep>
        <Result label="Prediction">
          {table.target} = {best.cls}
          <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
            Posterior probability {fx(nb.posterior[nb.per.indexOf(best)], 4)}.
          </div>
        </Result>
      </Work>
    </>
  );
}
