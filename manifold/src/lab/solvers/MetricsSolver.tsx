import { useState } from 'react';
import { MB } from '../../components/Math';
import { Seg, Toggle } from '../../components/controls';
import { Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { MetricsWork } from '../../viz/work';
import { NumberInput } from '../inputs';
import { InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  q7: { label: '50 / 10 / 5 / 35 (M2 Q7)', tp: 50, fn: 10, fp: 5, tn: 35 },
  q8: { label: '30 / 20 / 10 / 40 (M2 Q8)', tp: 30, fn: 20, fp: 10, tn: 40 },
  fraud: { label: 'Fraud 16 / 4 / 30 / 150 (SEE ’25 4a)', tp: 16, fn: 4, fp: 30, tn: 150 },
  q19: { label: 'FN 5× costlier (M5 Q19)', tp: 30, fn: 10, fp: 15, tn: 45 },
};
type PId = keyof typeof PRESETS;

function CMInput({ tp, fn, fp, tn, set }: { tp: number; fn: number; fp: number; tn: number; set: (k: 'tp' | 'fn' | 'fp' | 'tn', v: number) => void }) {
  const cell = (k: 'tp' | 'fn' | 'fp' | 'tn', v: number, good: boolean) => (
    <div className="cm__cell" style={{ background: good ? 'var(--viridian-soft)' : 'var(--rose-soft)', color: good ? 'var(--viridian)' : 'var(--rose)' }}>
      <input type="number" min={0} value={v} onChange={(e) => set(k, Math.max(0, Number(e.target.value)))} aria-label={k.toUpperCase()} />
      <small>{k.toUpperCase()}</small>
    </div>
  );
  return (
    <div className="cm" style={{ ['--k' as string]: 2, maxWidth: 380 }}>
      <span />
      <span className="cm__h">Predicted positive</span>
      <span className="cm__h">Predicted negative</span>
      <span className="cm__h" style={{ justifyContent: 'flex-end' }}>
        Actual positive
      </span>
      {cell('tp', tp, true)}
      {cell('fn', fn, false)}
      <span className="cm__h" style={{ justifyContent: 'flex-end' }}>
        Actual negative
      </span>
      {cell('fp', fp, false)}
      {cell('tn', tn, true)}
    </div>
  );
}

export default function MetricsSolver() {
  const [mode, setMode] = useState<'cm' | 'pr'>('cm');
  const [preset, setPreset] = useState<PId | null>('q7');
  const [c, setC] = useState({ tp: 50, fn: 10, fp: 5, tn: 35 });
  const [useCost, setUseCost] = useState(false);
  const [costFN, setCostFN] = useState(5);
  const [costFP, setCostFP] = useState(1);
  const [useBeta, setUseBeta] = useState(false);
  const [beta, setBeta] = useState(2);
  const [models, setModels] = useState([
    { p: 0.6, r: 0.8 },
    { p: 0.75, r: 0.5 },
  ]);
  return (
    <>
      <InputCard>
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { value: 'cm', label: 'From a confusion matrix' },
            { value: 'pr', label: 'Compare models by F1 (M2 Q9)' },
          ]}
        />
        {mode === 'cm' ? (
          <>
            <Presets
              value={preset}
              options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
              onPick={(id) => {
                setPreset(id);
                const { tp, fn, fp, tn } = PRESETS[id];
                setC({ tp, fn, fp, tn });
                if (id === 'q19') {
                  setUseCost(true);
                  setCostFN(5);
                  setCostFP(1);
                }
                if (id === 'fraud') setUseBeta(true);
              }}
            />
            <CMInput {...c} set={(k, v) => { setPreset(null); setC((o) => ({ ...o, [k]: v })); }} />
            <div className="controls">
              <Toggle label="F-beta score" checked={useBeta} onChange={setUseBeta} />
              {useBeta && <NumberInput label="β" value={beta} step={0.5} min={0.1} onChange={setBeta} />}
              <Toggle label="Cost-weighted metric" checked={useCost} onChange={setUseCost} />
              {useCost && (
                <>
                  <NumberInput label="Cost of FN" value={costFN} min={0} onChange={setCostFN} />
                  <NumberInput label="Cost of FP" value={costFP} min={0} onChange={setCostFP} />
                </>
              )}
            </div>
          </>
        ) : (
          <div className="controls">
            {models.map((m, i) => (
              <div key={i} className="controls" style={{ gap: '0.6rem' }}>
                <NumberInput label={`Model ${String.fromCharCode(65 + i)} precision`} value={m.p} step={0.05} min={0} max={1} onChange={(v) => setModels((ms) => ms.map((x, j) => (j === i ? { ...x, p: v } : x)))} />
                <NumberInput label="recall" value={m.r} step={0.05} min={0} max={1} onChange={(v) => setModels((ms) => ms.map((x, j) => (j === i ? { ...x, r: v } : x)))} />
              </div>
            ))}
          </div>
        )}
      </InputCard>
      {mode === 'cm' ? (
        c.tp + c.fp + c.fn + c.tn > 0 && (
          <Work>
            <MetricsWork {...c} beta={useBeta ? beta : undefined} costFN={useCost ? costFN : undefined} costFP={useCost ? costFP : undefined} />
          </Work>
        )
      ) : (
        <Work>
          <WorkStep title="F1 is the harmonic mean of precision and recall">
            <MB>{'F_1 = \\frac{2PR}{P + R}'}</MB>
            {models.map((m, i) => (
              <MB key={i}>{`F_1^{${String.fromCharCode(65 + i)}} = \\frac{2 \\times ${m.p} \\times ${m.r}}{${m.p} + ${m.r}} = \\frac{${fx(2 * m.p * m.r, 4)}}{${fx(m.p + m.r, 4)}} = ${fx((2 * m.p * m.r) / (m.p + m.r), 4)}`}</MB>
            ))}
          </WorkStep>
          <WorkStep title="Compare">
            <Table
              head={['Model', 'Precision', 'Recall', 'F1', 'Arithmetic mean (for contrast)']}
              numeric={[1, 2, 3, 4]}
              rows={models.map((m, i) => [String.fromCharCode(65 + i), m.p, m.r, fx((2 * m.p * m.r) / (m.p + m.r), 4), fx((m.p + m.r) / 2, 4)])}
            />
            <p>
              The harmonic mean punishes imbalance between P and R more than the arithmetic mean does, so the more balanced model wins on F1.
            </p>
          </WorkStep>
          <Result label="Higher F1">
            {(() => {
              const f1s = models.map((m) => (2 * m.p * m.r) / (m.p + m.r));
              const b = f1s.indexOf(Math.max(...f1s));
              return `Model ${String.fromCharCode(65 + b)} (F1 = ${fx(f1s[b], 4)}): the better balance of precision and recall.`;
            })()}
          </Result>
        </Work>
      )}
    </>
  );
}
