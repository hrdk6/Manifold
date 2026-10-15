import { useState } from 'react';
import { PCAWork } from '../../viz/work';
import { NumbersField } from '../inputs';
import { ErrorLine, InputCard, Presets, Work } from '../ui';

const PRESETS = {
  see: { label: 'SEE ’25 5a / IA-1 Q8', x1: [2, 0, 1, 3, 5], x2: [4, 0, 1, 3, 5] },
  classic: { label: 'Handwritten notes example', x1: [4, 8, 13, 7], x2: [11, 4, 5, 14] },
  line: { label: 'Strongly correlated', x1: [1, 2, 3, 4, 5, 6], x2: [2.1, 3.9, 6.2, 7.8, 10.1, 12] },
};
type PId = keyof typeof PRESETS;

export default function PCASolver() {
  const [preset, setPreset] = useState<PId | null>('see');
  const [x1, setX1] = useState(PRESETS.see.x1);
  const [x2, setX2] = useState(PRESETS.see.x2);
  const n = Math.min(x1.length, x2.length);
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setX1(PRESETS[id].x1);
            setX2(PRESETS[id].x2);
          }}
        />
        <div className="controls" style={{ alignItems: 'stretch' }}>
          <NumbersField label="Feature X1" value={x1} onChange={(v) => { setPreset(null); setX1(v); }} />
          <NumbersField label="Feature X2" value={x2} onChange={(v) => { setPreset(null); setX2(v); }} />
        </div>
        {x1.length !== x2.length && <ErrorLine>X1 and X2 must have the same number of values; using the first {n}.</ErrorLine>}
        {n < 2 && <ErrorLine>Enter at least two points.</ErrorLine>}
      </InputCard>
      {n >= 2 && (
        <Work>
          <PCAWork x1={x1.slice(0, n)} x2={x2.slice(0, n)} />
        </Work>
      )}
    </>
  );
}
