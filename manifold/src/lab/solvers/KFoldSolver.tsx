import { useState } from 'react';
import { Seg, Toggle } from '../../components/controls';
import { Code, Table } from '../../components/prose';
import { range } from '../../lib/math';
import { cvSplits } from '../../viz/m5';
import { NumberInput } from '../inputs';
import { InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  see: { label: '[S1 … S10], k = 5 (SEE ’25 10b)', n: 10, k: 5 },
  ten: { label: '[S1 … S10], k = 10 (LOOCV)', n: 10, k: 10 },
  twelve: { label: '12 samples, k = 3', n: 12, k: 3 },
};
type PId = keyof typeof PRESETS;

export default function KFoldSolver() {
  const [preset, setPreset] = useState<PId | null>('see');
  const [n, setN] = useState(10);
  const [k, setK] = useState(5);
  const [mode, setMode] = useState<'kfold' | 'shuffled' | 'stratified'>('kfold');
  const [scores, setScores] = useState(true);
  const nn = Math.max(2, Math.min(40, n));
  const kk = Math.max(2, Math.min(nn, k));
  const labels = range(nn).map((i) => (i < Math.ceil(nn / 2) ? 0 : 1));
  const splits = cvSplits(nn, kk, mode, labels, [], 7);
  const name = (i: number) => `S${i + 1}`;
  const fake = splits.map((_, i) => [0.9, 0.85, 1.0, 0.95, 0.9, 0.88, 0.92, 0.97, 0.86, 0.93][i % 10]);
  const sizes = splits.map((s) => s.test.length);
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setN(PRESETS[id].n);
            setK(PRESETS[id].k);
            setMode('kfold');
          }}
        />
        <div className="controls">
          <NumberInput label="Samples n" value={n} min={2} max={40} onChange={(v) => { setPreset(null); setN(v); }} />
          <NumberInput label="Folds k" value={k} min={2} max={40} onChange={(v) => { setPreset(null); setK(v); }} />
          <Seg
            label="Splitter"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'kfold', label: 'KFold (in order)' },
              { value: 'shuffled', label: 'KFold + shuffle' },
              { value: 'stratified', label: 'Stratified (first half class 0)' },
            ]}
          />
          <Toggle label="Show example fold scores" checked={scores} onChange={setScores} />
        </div>
      </InputCard>
      <Work>
        <WorkStep title="Fold sizes">
          <p>
            n = {nn} samples into k = {kk} folds: each fold holds ⌊n/k⌋ = {Math.floor(nn / kk)}
            {nn % kk ? `, and the first ${nn % kk} folds get one extra` : ''} → sizes {sizes.join(', ')}. Every iteration trains on n − |fold| samples (
            {Math.round(((nn - sizes[0]) / nn) * 100)}% of the data) and tests on the rest.
          </p>
        </WorkStep>
        <WorkStep title="The splits">
          <Table
            head={['Iteration', 'Test fold', 'Training set', 'Train / test', ...(scores ? ['Example score'] : [])]}
            rows={splits.map((s, i) => [
              i + 1,
              s.test.map(name).join(', '),
              s.train.map(name).join(', '),
              `${s.train.length} / ${s.test.length}`,
              ...(scores ? [fake[i].toFixed(2)] : []),
            ])}
          />
          <div className="cv-grid" style={{ marginTop: '0.8rem' }}>
            {splits.map((sp, fi) => (
              <div key={fi} className="cv-row">
                <span className="cv-row__label">Fold {fi + 1}</span>
                <div className="cv-cells" style={{ gridTemplateColumns: `repeat(${nn}, minmax(0, 1fr))` }}>
                  {range(nn).map((i) => (
                    <div key={i} className="cv-cell" data-test={sp.test.includes(i)}>
                      {nn <= 16 ? name(i) : ''}
                    </div>
                  ))}
                </div>
                <span />
              </div>
            ))}
          </div>
        </WorkStep>
        {scores && (
          <WorkStep title="Combine the scores">
            <p>
              Cross-validation score = mean of the {kk} fold scores = ({fake.map((v) => v.toFixed(2)).join(' + ')}) / {kk} ={' '}
              <strong>{(fake.reduce((a, b) => a + b, 0) / kk).toFixed(3)}</strong>. The spread ({Math.min(...fake).toFixed(2)} to {Math.max(...fake).toFixed(2)}) shows
              how sensitive the model is to the particular split. (The fold scores here are illustrative.)
            </p>
          </WorkStep>
        )}
        <Result label="Key facts">
          {kk} models trained; each sample is in exactly one test fold and in {kk - 1} training sets.
        </Result>
        <div style={{ marginTop: '1.5rem' }}>
          <Code title="kfold.py">{`
import numpy as np
from sklearn.model_selection import ${mode === 'stratified' ? 'StratifiedKFold' : 'KFold'}

samples = np.array([${range(nn).map((i) => `"${name(i)}"`).join(', ')}])
${mode === 'stratified' ? `y = np.array([${labels.join(', ')}])\ncv = StratifiedKFold(n_splits=${kk})\nsplits = cv.split(samples, y)` : `cv = KFold(n_splits=${kk}${mode === 'shuffled' ? ', shuffle=True, random_state=0' : ''})\nsplits = cv.split(samples)`}
for i, (train, test) in enumerate(splits, 1):
    print(i, "train:", samples[train], "test:", samples[test])
`}</Code>
        </div>
      </Work>
    </>
  );
}
