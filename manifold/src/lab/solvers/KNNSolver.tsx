import { useState } from 'react';
import { MB } from '../../components/Math';
import { Seg } from '../../components/controls';
import { Plot } from '../../components/Plot';
import { Table } from '../../components/prose';
import { fx, tf } from '../../lib/fmt';
import { distance, type Metric } from '../../lib/supervised';
import { NumberInput, NumbersField } from '../inputs';
import { InputCard, Presets, Result, Work, WorkStep } from '../ui';

interface Row {
  x: number;
  y: number;
  c: string;
}

const PRESETS = {
  q11: { label: 'Classify (5, 5) (Q11)', rows: [[2, 4, 'A'], [3, 3, 'A'], [4, 6, 'B'], [5, 7, 'B'], [6, 4, 'A'], [7, 5, 'B']] as [number, number, string][], q: [5, 5], ks: [3, 4, 5] },
  slides: { label: 'T-shirt size (practice)', rows: [[158, 58, 'M'], [158, 59, 'M'], [158, 63, 'M'], [160, 59, 'M'], [160, 60, 'M'], [163, 60, 'M'], [163, 61, 'M'], [160, 64, 'L'], [163, 64, 'L'], [165, 61, 'L'], [165, 62, 'L'], [165, 65, 'L']] as [number, number, string][], q: [161, 61], ks: [3, 5] },
};
type PId = keyof typeof PRESETS;

export default function KNNSolver() {
  const [preset, setPreset] = useState<PId | null>('q11');
  const [rows, setRows] = useState<Row[]>(PRESETS.q11.rows.map(([x, y, c]) => ({ x, y, c })));
  const [qx, setQx] = useState(5);
  const [qy, setQy] = useState(5);
  const [ks, setKs] = useState<number[]>([3, 4, 5]);
  const [metric, setMetric] = useState<Metric>('euclidean');
  const d = rows.map((r, i) => ({ i, r, d: distance([r.x, r.y], [qx, qy], metric) }));
  const sorted = d.slice().sort((a, b) => a.d - b.d || a.i - b.i);
  const classes = [...new Set(rows.map((r) => r.c))];
  const formula = (r: Row) =>
    metric === 'manhattan'
      ? `|${tf(r.x)} - ${tf(qx)}| + |${tf(r.y)} - ${tf(qy)}|`
      : metric === 'minkowski3'
        ? `\\sqrt[3]{|${tf(r.x - qx)}|^3 + |${tf(r.y - qy)}|^3}`
        : `\\sqrt{(${tf(r.x)} - ${tf(qx)})^2 + (${tf(r.y)} - ${tf(qy)})^2} = \\sqrt{${tf((r.x - qx) ** 2 + (r.y - qy) ** 2)}}`;
  const setRow = (i: number, key: keyof Row, v: string) => {
    setPreset(null);
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: key === 'c' ? v : Number(v) } : r)));
  };
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setRows(PRESETS[id].rows.map(([x, y, c]) => ({ x, y, c })));
            setQx(PRESETS[id].q[0]);
            setQy(PRESETS[id].q[1]);
            setKs(PRESETS[id].ks);
          }}
        />
        <div className="input-grid">
          <table>
            <thead>
              <tr>
                <th>Point</th>
                <th>x</th>
                <th>y</th>
                <th>Class</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 650, color: 'var(--ink-3)' }}>P{i + 1}</td>
                  <td>
                    <input className="num-in" type="number" value={r.x} onChange={(e) => setRow(i, 'x', e.target.value)} aria-label={`P${i + 1} x`} />
                  </td>
                  <td>
                    <input className="num-in" type="number" value={r.y} onChange={(e) => setRow(i, 'y', e.target.value)} aria-label={`P${i + 1} y`} />
                  </td>
                  <td>
                    <input className="num-in" value={r.c} onChange={(e) => setRow(i, 'c', e.target.value)} aria-label={`P${i + 1} class`} />
                  </td>
                  <td>
                    <button className="btn btn--ghost btn--sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <button className="btn btn--sm" onClick={() => setRows((rs) => [...rs, { x: 0, y: 0, c: classes[0] ?? 'A' }])}>
              Add point
            </button>
          </div>
        </div>
        <div className="controls">
          <NumberInput label="Query x" value={qx} onChange={setQx} />
          <NumberInput label="Query y" value={qy} onChange={setQy} />
          <NumbersField label="Values of k to try" value={ks} onChange={(v) => setKs(v.filter((k) => k >= 1 && Number.isInteger(k)))} />
          <Seg
            label="Distance"
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'euclidean', label: 'Euclidean' },
              { value: 'manhattan', label: 'Manhattan' },
              { value: 'minkowski3', label: 'Minkowski p = 3' },
            ]}
          />
        </div>
      </InputCard>
      {rows.length > 0 && (
        <Work>
          <WorkStep title={`Distance from the query (${qx}, ${qy}) to every point`}>
            <Table head={['Point', '(x, y)', 'Class', 'Calculation', 'Distance']} numeric={[4]} rows={d.map(({ i, r, d: dd }) => [`P${i + 1}`, `(${r.x}, ${r.y})`, r.c, <MB key={i}>{formula(r)}</MB>, fx(dd, 3)])} />
          </WorkStep>
          <WorkStep title="Rank the points by distance">
            <Table head={['Rank', 'Point', 'Class', 'Distance']} numeric={[0, 3]} rows={sorted.map((s, k) => [k + 1, `P${s.i + 1}`, s.r.c, fx(s.d, 3)])} />
          </WorkStep>
          {ks.map((k) => {
            const kk = Math.min(k, rows.length);
            const nn = sorted.slice(0, kk);
            const boundaryTie = kk < sorted.length && Math.abs(sorted[kk - 1].d - sorted[kk].d) < 1e-9;
            const votes = classes.map((c) => ({ c, v: nn.filter((n) => n.r.c === c).length })).sort((a, b) => b.v - a.v);
            const tie = votes.length > 1 && votes[0].v === votes[1].v;
            const tied = votes.filter((v) => v.v === votes[0].v).map((v) => v.c);
            const wv = classes.map((c) => ({ c, w: nn.filter((n) => n.r.c === c).reduce((s, n) => s + 1 / Math.max(n.d, 1e-9), 0) })).sort((a, b) => b.w - a.w);
            return (
              <WorkStep key={k} title={`k = ${k}: vote among the ${kk} nearest`}>
                <p>
                  Neighbours: {nn.map((n) => `P${n.i + 1} (${n.r.c}, d = ${fx(n.d, 3)})`).join(', ')}.
                </p>
                {boundaryTie && (
                  <p style={{ fontSize: '0.95rem', color: 'var(--ochre)' }}>
                    Note: P{sorted[kk - 1].i + 1} and P{sorted[kk].i + 1} are equally distant at the k-th position; the first in data order is used
                    {sorted[kk - 1].r.c === sorted[kk].r.c ? ', and both have the same class, so the vote is unaffected.' : ', and they have different classes, so mention the tie in your answer.'}
                  </p>
                )}
                <p>
                  Votes: {votes.map((v) => `${v.c} = ${v.v}`).join(', ')}.{' '}
                  {tie ? (
                    <strong style={{ color: 'var(--rose)' }}>
                      Tie between {tied.join(' and ')}. Break it with distance-weighted votes (1/d): {wv.map((w) => `${w.c} = ${fx(w.w, 3)}`).join(', ')} → {wv[0].c}.
                    </strong>
                  ) : (
                    <strong>Prediction: class {votes[0].c}.</strong>
                  )}
                </p>
              </WorkStep>
            );
          })}
          <WorkStep title="Picture">
            <div className="plot-wrap" style={{ maxWidth: 460 }}>
              <Plot
                xDomain={[Math.min(...rows.map((r) => r.x), qx) - 1, Math.max(...rows.map((r) => r.x), qx) + 1]}
                yDomain={[Math.min(...rows.map((r) => r.y), qy) - 1, Math.max(...rows.map((r) => r.y), qy) + 1]}
                height={280}
                equal
              >
                {(s) => (
                  <>
                    {ks.length > 0 && (
                      <circle cx={s.x(qx)} cy={s.y(qy)} r={(s.x(sorted[Math.min(ks[0], sorted.length) - 1].d) - s.x(0))} fill="var(--ochre-soft)" stroke="var(--ochre)" strokeDasharray="4 3" />
                    )}
                    {rows.map((r, i) => (
                      <g key={i}>
                        {classes.indexOf(r.c) % 2 ? (
                          <path d={`M${s.x(r.x)} ${s.y(r.y) - 7} L${s.x(r.x) + 6.5} ${s.y(r.y) + 4.5} L${s.x(r.x) - 6.5} ${s.y(r.y) + 4.5}Z`} fill="var(--rose)" />
                        ) : (
                          <circle cx={s.x(r.x)} cy={s.y(r.y)} r={6} fill="var(--ultra)" />
                        )}
                        <text x={s.x(r.x) + 9} y={s.y(r.y) - 6} style={{ fontWeight: 700, fill: 'var(--ink-2)' }}>
                          P{i + 1}
                        </text>
                      </g>
                    ))}
                    <rect x={s.x(qx) - 6} y={s.y(qy) - 6} width={12} height={12} transform={`rotate(45 ${s.x(qx)} ${s.y(qy)})`} fill="var(--ink)" />
                  </>
                )}
              </Plot>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-3)' }}>The shaded circle encloses the {ks[0]} nearest neighbours.</p>
          </WorkStep>
          <Result label="Conclusion">
            {ks
              .map((k) => {
                const nn = sorted.slice(0, Math.min(k, rows.length));
                const votes = classes.map((c) => ({ c, v: nn.filter((n) => n.r.c === c).length })).sort((a, b) => b.v - a.v);
                return `k = ${k}: ${votes.length > 1 && votes[0].v === votes[1].v ? 'tie' : votes[0].c}`;
              })
              .join(';  ')}
            <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
              Odd k avoids ties in two-class problems; choose k by cross-validation in practice.
            </div>
          </Result>
        </Work>
      )}
    </>
  );
}
