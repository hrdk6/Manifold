import { useMemo, useState } from 'react';
import { MB } from '../../components/Math';
import { Seg } from '../../components/controls';
import { Plot } from '../../components/Plot';
import { Table } from '../../components/prose';
import { kmeansTrace } from '../../lib/cluster';
import { fx, tf } from '../../lib/fmt';
import { clusterColor } from '../../viz/m3';
import { NumberInput, PointsField } from '../inputs';
import { ErrorLine, InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  q21: { label: '5 points, k = 2 (Q21)', pts: [[2, 3], [3, 4], [5, 6], [8, 8], [9, 10]], k: 2, init: 'firstlast' as const },
  q22: { label: '6 points, k = 2 (Q22)', pts: [[1, 1], [2, 1], [1, 2], [10, 10], [10, 12], [12, 10]], k: 2, init: 'firstlast' as const },
  notes: { label: '4 points (notes)', pts: [[2, 2], [3, 3], [6, 6], [8, 8]], k: 2, init: 'firstlast' as const },
};
type PId = keyof typeof PRESETS;
type Init = 'first' | 'firstlast' | 'custom';

export default function KMeansSolver() {
  const [preset, setPreset] = useState<PId | null>('q21');
  const [pts, setPts] = useState<number[][]>(PRESETS.q21.pts);
  const [k, setK] = useState(2);
  const [init, setInit] = useState<Init>('firstlast');
  const [custom, setCustom] = useState<number[][]>([[2, 3], [9, 10]]);
  const kk = Math.max(1, Math.min(k, pts.length));
  const C0 = init === 'first' ? pts.slice(0, kk) : init === 'firstlast' ? (kk === 2 ? [pts[0], pts[pts.length - 1]] : pts.slice(0, kk)) : custom.slice(0, kk);
  const valid = pts.length >= kk && C0.length === kk;
  const trace = useMemo(() => (valid ? kmeansTrace(pts, C0.map((c) => c.slice()), 20) : []), [pts, JSON.stringify(C0), valid]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = trace[trace.length - 1];
  const label = (p: number[]) => `(${p.map((v) => fx(v, 3)).join(', ')})`;
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setPts(PRESETS[id].pts);
            setK(PRESETS[id].k);
            setInit(PRESETS[id].init);
          }}
        />
        <div className="controls" style={{ alignItems: 'stretch' }}>
          <PointsField label="Data points" value={pts} onChange={(v) => { setPreset(null); setPts(v); }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <NumberInput label="k (clusters)" value={k} min={1} max={6} onChange={setK} />
            <Seg
              label="Initial centroids"
              value={init}
              onChange={setInit}
              options={[
                { value: 'firstlast', label: 'First & last points' },
                { value: 'first', label: 'First k points' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            {init === 'custom' && <PointsField label="Initial centroids" value={custom} onChange={setCustom} rows={3} />}
          </div>
        </div>
        {!valid && <ErrorLine>Provide at least k points (and k initial centroids when custom).</ErrorLine>}
      </InputCard>
      {valid && last && (
        <Work>
          <WorkStep title="Initialise">
            <p>
              k = {kk}. Initial centroids: {C0.map((c, i) => `C${i + 1} = ${label(c)}`).join(', ')}.
            </p>
            <MB>{'d(p, C) = \\sqrt{(p_x - C_x)^2 + (p_y - C_y)^2}'}</MB>
          </WorkStep>
          {trace.map((it, n) => (
            <WorkStep key={n} title={`Iteration ${n + 1}`}>
              <Table
                head={['Point', ...it.centroids.map((c, j) => `d to C${j + 1} ${label(c)}`), 'Nearest']}
                numeric={it.centroids.map((_, j) => j + 1)}
                rows={pts.map((p, i) => [label(p), ...it.dists[i].map((d) => fx(d, 3)), `C${it.assign[i] + 1}`])}
              />
              <p>Recompute each centroid as the mean of its points:</p>
              {it.newCentroids.map((c, j) => {
                const members = pts.filter((_, i) => it.assign[i] === j);
                if (!members.length) return <p key={j}>C{j + 1} has no points and stays where it is.</p>;
                return (
                  <MB key={j}>{`C_${j + 1} = \\left( \\frac{${members.map((m) => tf(m[0])).join(' + ')}}{${members.length}},\\; \\frac{${members.map((m) => tf(m[1])).join(' + ')}}{${members.length}} \\right) = (${tf(c[0], 3)},\\; ${tf(c[1], 3)})`}</MB>
                );
              })}
              <p style={{ fontSize: '0.95rem', color: 'var(--ink-2)' }}>
                Inertia (SSE to the centroids used for assignment) = {fx(it.inertia, 3)}.{' '}
                {n === trace.length - 1 ? 'The centroids no longer change, so the algorithm has converged.' : n > 0 && !it.changed ? 'Assignments unchanged.' : ''}
              </p>
            </WorkStep>
          ))}
          <WorkStep title="Plot of the final clusters">
            <div className="plot-wrap" style={{ maxWidth: 460 }}>
              <Plot
                xDomain={[Math.min(...pts.map((p) => p[0])) - 1, Math.max(...pts.map((p) => p[0])) + 1]}
                yDomain={[Math.min(...pts.map((p) => p[1])) - 1, Math.max(...pts.map((p) => p[1])) + 1]}
                height={280}
                equal
              >
                {(s) => (
                  <>
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={s.x(p[0])} cy={s.y(p[1])} r={6} fill={clusterColor(last.assign[i])} />
                        <text x={s.x(p[0]) + 8} y={s.y(p[1]) - 7} style={{ fontWeight: 650, fill: 'var(--ink-2)' }}>
                          ({p.join(', ')})
                        </text>
                      </g>
                    ))}
                    {last.newCentroids.map((c, j) => (
                      <g key={j}>
                        <path d={`M${s.x(c[0]) - 8} ${s.y(c[1])} h16 M${s.x(c[0])} ${s.y(c[1]) - 8} v16`} stroke={clusterColor(j)} strokeWidth={3} strokeLinecap="round" />
                      </g>
                    ))}
                  </>
                )}
              </Plot>
            </div>
          </WorkStep>
          <Result label="Final clusters">
            {last.newCentroids.map((c, j) => (
              <div key={j} style={{ fontSize: '1.05rem' }}>
                Cluster {j + 1}: {pts.filter((_, i) => last.assign[i] === j).map((p) => `(${p.join(', ')})`).join(', ') || '(empty)'}, centroid {label(c)}
              </div>
            ))}
          </Result>
        </Work>
      )}
    </>
  );
}
