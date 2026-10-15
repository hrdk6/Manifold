import { useState } from 'react';
import { EigenWork } from '../../viz/work';
import { NumberInput } from '../inputs';
import { InputCard, Presets, Result, Work } from '../ui';
import { M } from '../../components/Math';
import { eig2 } from '../../lib/math';
import { tf } from '../../lib/fmt';

const PRESETS = {
  see: { label: '[[4, 2], [2, 3]] (SEE ’25 6a)', a: 4, b: 2, d: 3 },
  classic: { label: '[[14, −11], [−11, 23]] (notes)', a: 14, b: -11, d: 23 },
  sym: { label: '[[2, 1], [1, 2]]', a: 2, b: 1, d: 2 },
  see5a: { label: 'From SEE 5a data', a: 3.7, b: 3.6, d: 4.3 },
};
type PId = keyof typeof PRESETS;

export default function EigenSolver() {
  const [preset, setPreset] = useState<PId | null>('see');
  const [a, setA] = useState(4);
  const [b, setB] = useState(2);
  const [d, setD] = useState(3);
  const e = eig2(a, b, d);
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setA(PRESETS[id].a);
            setB(PRESETS[id].b);
            setD(PRESETS[id].d);
          }}
        />
        <div className="controls">
          <NumberInput label="Var(x₁) = c₁₁" value={a} step={0.1} onChange={(v) => { setPreset(null); setA(v); }} />
          <NumberInput label="Cov = c₁₂ = c₂₁" value={b} step={0.1} onChange={(v) => { setPreset(null); setB(v); }} />
          <NumberInput label="Var(x₂) = c₂₂" value={d} step={0.1} onChange={(v) => { setPreset(null); setD(v); }} />
        </div>
      </InputCard>
      <Work>
        <EigenWork a={a} b={b} d={d} />
        <Result label="Eigenvalues and principal directions">
          <M>{`\\lambda_1 = ${tf(e.l1)},\\; v_1 = (${tf(e.v1[0])}, ${tf(e.v1[1])}) \\qquad \\lambda_2 = ${tf(e.l2)},\\; v_2 = (${tf(e.v2[0])}, ${tf(e.v2[1])})`}</M>
        </Result>
      </Work>
    </>
  );
}
