import { useMemo, useState } from 'react';
import { Plot } from '../../components/Plot';
import { Table } from '../../components/prose';
import { dbscan } from '../../lib/cluster';
import { fx } from '../../lib/fmt';
import { euclid } from '../../lib/math';
import { clusterColor } from '../../viz/m3';
import { NumberInput, PointsField } from '../inputs';
import { ErrorLine, InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  notes: { label: 'Notes example (ε = 2, MinPts = 3)', pts: [[1, 1], [1, 2], [2, 2], [2, 1], [8, 8], [8, 9], [9, 8], [25, 25], [26, 25], [27, 27]], eps: 2, minPts: 3 },
  chain: { label: 'A chain and outliers', pts: [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [3, 5], [9, 9], [9, 10], [10, 9], [10, 10]], eps: 1.5, minPts: 3 },
};
type PId = keyof typeof PRESETS;

export default function DBSCANSolver() {
  const [preset, setPreset] = useState<PId | null>('notes');
  const [pts, setPts] = useState<number[][]>(PRESETS.notes.pts);
  const [eps, setEps] = useState(2);
  const [minPts, setMinPts] = useState(3);
  const names = pts.map((_, i) => (i < 26 ? String.fromCharCode(65 + i) : `P${i + 1}`));
  const r = useMemo(() => dbscan(pts, eps, minPts), [pts, eps, minPts]);
  const D = pts.map((a) => pts.map((b) => euclid(a, b)));
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setPts(PRESETS[id].pts);
            setEps(PRESETS[id].eps);
            setMinPts(PRESETS[id].minPts);
          }}
        />
        <div className="controls" style={{ alignItems: 'stretch' }}>
          <PointsField label="Points (named A, B, C…)" value={pts} onChange={(v) => { setPreset(null); setPts(v); }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <NumberInput label="ε (eps)" value={eps} step={0.1} min={0} onChange={setEps} />
            <NumberInput label="MinPts" value={minPts} min={1} onChange={setMinPts} />
          </div>
        </div>
        {pts.length < 2 && <ErrorLine>Enter at least two points.</ErrorLine>}
      </InputCard>
      {pts.length >= 2 && (
        <Work>
          {pts.length <= 14 && (
            <WorkStep title="Euclidean distance matrix (distances ≤ ε highlighted)">
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th />
                      {names.map((nm) => (
                        <th key={nm} className="n">
                          {nm}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {D.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{names[i]}</td>
                        {row.map((v, j) => (
                          <td key={j} className="n" style={i !== j && v <= eps + 1e-9 ? { background: 'var(--ultra-soft)', fontWeight: 700, color: 'var(--ultra)' } : { color: i === j ? 'var(--ink-3)' : undefined }}>
                            {fx(v, 2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WorkStep>
          )}
          <WorkStep title={`ε-neighbourhoods and point types (core: ≥ ${minPts} points within ε, including itself)`}>
            <Table
              head={['Point', 'Coordinates', 'Within ε', 'Count', 'Type']}
              numeric={[3]}
              rows={pts.map((p, i) => [names[i], `(${p.join(', ')})`, r.neighbors[i].map((j) => names[j]).join(', '), r.neighbors[i].length, r.kind[i]])}
              hl={(i) => r.kind[i] === 'core'}
            />
          </WorkStep>
          <WorkStep title="Grow clusters from core points">
            <ol>
              {r.order
                .filter((o) => o.cluster >= 0)
                .map((o, k) => (
                  <li key={k}>
                    {o.via === null
                      ? `Start cluster C${o.cluster + 1} at core point ${names[o.point]}.`
                      : `${names[o.point]} is within ε of core point ${names[o.via]}: add to C${o.cluster + 1} as a ${o.kind} point${o.kind === 'core' ? ' and expand from it' : ''}.`}
                  </li>
                ))}
            </ol>
            {r.kind.some((k) => k === 'noise') && (
              <p>
                Never reached from any core point, so labelled noise: {r.kind.map((k, i) => (k === 'noise' ? names[i] : null)).filter(Boolean).join(', ')}.
              </p>
            )}
          </WorkStep>
          <WorkStep title="Picture">
            <div className="plot-wrap" style={{ maxWidth: 480 }}>
              <Plot
                xDomain={[Math.min(...pts.map((p) => p[0])) - eps, Math.max(...pts.map((p) => p[0])) + eps]}
                yDomain={[Math.min(...pts.map((p) => p[1])) - eps, Math.max(...pts.map((p) => p[1])) + eps]}
                height={300}
                equal
              >
                {(s) => (
                  <>
                    {pts.map((p, i) =>
                      r.kind[i] === 'core' ? <circle key={`e${i}`} cx={s.x(p[0])} cy={s.y(p[1])} r={s.x(eps) - s.x(0)} fill={clusterColor(r.label[i])} opacity={0.07} stroke={clusterColor(r.label[i])} strokeOpacity={0.3} /> : null,
                    )}
                    {pts.map((p, i) => (
                      <g key={i}>
                        {r.kind[i] === 'noise' ? (
                          <circle cx={s.x(p[0])} cy={s.y(p[1])} r={5} fill="none" stroke="var(--ink-3)" strokeWidth={2} />
                        ) : (
                          <circle cx={s.x(p[0])} cy={s.y(p[1])} r={r.kind[i] === 'core' ? 6 : 4} fill={clusterColor(r.label[i])} />
                        )}
                        <text x={s.x(p[0]) + 7} y={s.y(p[1]) - 7} style={{ fontWeight: 700, fill: 'var(--ink-2)' }}>
                          {names[i]}
                        </text>
                      </g>
                    ))}
                  </>
                )}
              </Plot>
            </div>
          </WorkStep>
          <Result label={`${r.nClusters} cluster${r.nClusters === 1 ? '' : 's'} found`}>
            {Array.from({ length: r.nClusters }, (_, c) => (
              <div key={c} style={{ fontSize: '1.02rem' }}>
                C{c + 1}: {names.filter((_, i) => r.label[i] === c).join(', ')}
              </div>
            ))}
            <div style={{ fontSize: '1.02rem' }}>Noise: {names.filter((_, i) => r.label[i] < 0).join(', ') || 'none'}</div>
          </Result>
        </Work>
      )}
    </>
  );
}
