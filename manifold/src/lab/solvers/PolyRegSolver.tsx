import { useState } from 'react';
import { PolyWork } from '../../viz/work';
import { NumbersField } from '../inputs';
import { ErrorLine, InputCard, Presets, Work } from '../ui';

const PRESETS = {
  see: { label: 'X = [1, 2, 3] (SEE ’25 8b)', x: [1, 2, 3], y: [1.5, 4.2, 9.7] },
  five: { label: 'Five points', x: [1, 2, 3, 4, 5], y: [2.2, 4.8, 10.1, 17.3, 26.4] },
  marks: { label: 'Hours → marks', x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], y: [35, 50, 60, 70, 80, 85, 90, 94, 97, 98] },
};
type PId = keyof typeof PRESETS;

export default function PolyRegSolver() {
  const [preset, setPreset] = useState<PId | null>('see');
  const [x, setX] = useState(PRESETS.see.x);
  const [y, setY] = useState(PRESETS.see.y);
  const n = Math.min(x.length, y.length);
  const ok = n >= 3 && new Set(x.slice(0, n)).size >= 3;
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
          <NumbersField label="X" value={x} onChange={(v) => { setPreset(null); setX(v); }} />
          <NumbersField label="y" value={y} onChange={(v) => { setPreset(null); setY(v); }} />
        </div>
        {!ok && <ErrorLine>A quadratic needs at least three points with three different x values.</ErrorLine>}
      </InputCard>
      {ok && (
        <Work>
          <PolyWork x={x.slice(0, n)} y={y.slice(0, n)} />
        </Work>
      )}
    </>
  );
}
