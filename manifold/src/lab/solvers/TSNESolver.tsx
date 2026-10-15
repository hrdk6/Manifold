import { useState } from 'react';
import { TSNEWork } from '../../viz/work';
import { NumberInput, NumbersField, PointsField } from '../inputs';
import { ErrorLine, InputCard, Presets, Work } from '../ui';

const PRESETS = {
  notes: { label: 'A, B, C from your notes', pts: [[0, 0], [1, 1], [5, 5]], y1: [0, 1, 4], sigma: 1 },
  four: { label: 'Four points', pts: [[0, 0], [0.5, 0], [4, 4], [4.5, 4]], y1: [0, 0.5, 3, 3.5], sigma: 1 },
};
type PId = keyof typeof PRESETS;

export default function TSNESolver() {
  const [preset, setPreset] = useState<PId | null>('notes');
  const [pts, setPts] = useState<number[][]>(PRESETS.notes.pts);
  const [y1, setY1] = useState<number[]>(PRESETS.notes.y1);
  const [sigma, setSigma] = useState(1);
  const n = pts.length;
  const names = pts.map((_, i) => String.fromCharCode(65 + i));
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setPts(PRESETS[id].pts);
            setY1(PRESETS[id].y1);
            setSigma(PRESETS[id].sigma);
          }}
        />
        <div className="controls" style={{ alignItems: 'stretch' }}>
          <PointsField label="High-dimensional points (2-D here)" value={pts} onChange={(v) => { setPreset(null); setPts(v.slice(0, 6)); }} rows={4} />
          <NumbersField label="Proposed 1-D positions y" value={y1} onChange={(v) => { setPreset(null); setY1(v); }} />
          <NumberInput label="σ" value={sigma} step={0.5} min={0.1} onChange={setSigma} />
        </div>
        {(n < 2 || y1.length < n) && <ErrorLine>Enter at least two points and one 1-D position per point.</ErrorLine>}
      </InputCard>
      {n >= 2 && y1.length >= n && (
        <Work>
          <TSNEWork pts={pts} names={names} sigma={sigma} y1={y1.slice(0, n)} />
        </Work>
      )}
    </>
  );
}
