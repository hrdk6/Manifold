import { useMemo, useState } from 'react';
import { MB } from '../../components/Math';
import { Seg } from '../../components/controls';
import { Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { euclid } from '../../lib/math';
import { PointsField } from '../inputs';
import { ErrorLine, InputCard, Presets, Result, Work, WorkStep } from '../ui';

type Link = 'single' | 'complete' | 'average';

const PRESETS = {
  six: { label: 'Six points', pts: [[1, 1], [1.5, 1.5], [5, 5], [3, 4], [4, 4], [3, 3.5]] },
  q22: { label: 'Q22 points', pts: [[1, 1], [2, 1], [1, 2], [10, 10], [10, 12], [12, 10]] },
  five: { label: 'Q21 points', pts: [[2, 3], [3, 4], [5, 6], [8, 8], [9, 10]] },
};
type PId = keyof typeof PRESETS;

export default function HierarchicalSolver() {
  const [preset, setPreset] = useState<PId | null>('six');
  const [pts, setPts] = useState<number[][]>(PRESETS.six.pts);
  const [link, setLink] = useState<Link>('single');
  const names = pts.map((_, i) => String.fromCharCode(65 + i));
  const steps = useMemo(() => {
    let clusters = pts.map((_, i) => ({ name: names[i], members: [i] }));
    const D = pts.map((a) => pts.map((b) => euclid(a, b)));
    const cd = (A: number[], B: number[]) => {
      const ds = A.flatMap((i) => B.map((j) => D[i][j]));
      if (link === 'single') return Math.min(...ds);
      if (link === 'complete') return Math.max(...ds);
      return ds.reduce((a, b) => a + b, 0) / ds.length;
    };
    const out: { matrix: number[][]; names: string[]; pair: [number, number]; dist: number; merged: string }[] = [];
    while (clusters.length > 1) {
      const M = clusters.map((a) => clusters.map((b) => (a === b ? 0 : cd(a.members, b.members))));
      let bi = 0;
      let bj = 1;
      for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) if (M[i][j] < M[bi][bj] - 1e-12) [bi, bj] = [i, j];
      const merged = { name: `${clusters[bi].name}${clusters[bj].name}`, members: [...clusters[bi].members, ...clusters[bj].members] };
      out.push({ matrix: M, names: clusters.map((c) => c.name), pair: [bi, bj], dist: M[bi][bj], merged: merged.name });
      clusters = [...clusters.filter((_, k) => k !== bi && k !== bj), merged];
    }
    return out;
  }, [pts, link]); // eslint-disable-line react-hooks/exhaustive-deps
  const rule = { single: '\\min', complete: '\\max', average: '\\text{mean}' }[link];
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setPts(PRESETS[id].pts);
          }}
        />
        <div className="controls" style={{ alignItems: 'stretch' }}>
          <PointsField label="Points (named A, B, C…)" value={pts} onChange={(v) => { setPreset(null); setPts(v.slice(0, 10)); }} />
          <Seg
            label="Linkage"
            value={link}
            onChange={setLink}
            options={[
              { value: 'single', label: 'Single (min)' },
              { value: 'complete', label: 'Complete (max)' },
              { value: 'average', label: 'Average' },
            ]}
          />
        </div>
        {pts.length < 2 && <ErrorLine>Enter at least two points.</ErrorLine>}
      </InputCard>
      {pts.length >= 2 && (
        <Work>
          <WorkStep title="Cluster distance rule">
            <MB>{`d(A, B) = ${rule}_{a \\in A,\\, b \\in B} \\; \\lVert a - b \\rVert`}</MB>
            <p>Points: {pts.map((p, i) => `${names[i]} (${p.join(', ')})`).join(', ')}.</p>
          </WorkStep>
          {steps.map((st, si) => (
            <WorkStep key={si} title={`Merge ${si + 1}: join ${st.names[st.pair[0]]} and ${st.names[st.pair[1]]} at distance ${fx(st.dist, 3)}`}>
              <Table
                head={['', ...st.names]}
                numeric={st.names.map((_, i) => i + 1)}
                rows={st.matrix.map((r, i) => [st.names[i], ...r.map((v, j) => (j <= i ? (j === i ? '0' : '') : fx(v, 3)))])}
                hl={(i) => i === st.pair[0] || i === st.pair[1]}
              />
              <p>
                The smallest entry is d({st.names[st.pair[0]]}, {st.names[st.pair[1]]}) = {fx(st.dist, 3)}, so they merge into cluster {st.merged}.
                {si < steps.length - 1 ? ' Distances from the new cluster are recomputed with the linkage rule.' : ''}
              </p>
            </WorkStep>
          ))}
          <Result label="Merge order (read the dendrogram bottom-up)">
            {steps.map((s) => `${s.merged} @ ${fx(s.dist, 2)}`).join(' → ')}
            <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
              Cutting just below the largest merge distance ({fx(steps[steps.length - 1].dist, 2)}) leaves two clusters.
            </div>
          </Result>
        </Work>
      )}
    </>
  );
}
