import { useState } from 'react';
import { Seg, Toggle } from '../../components/controls';
import { Code, Table } from '../../components/prose';
import { CatTableEditor, type CatTable } from '../inputs';
import { InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  see: { label: 'Color / Size (SEE ’25 7a)', t: { attrs: ['Color', 'Size'], target: '', rows: [['Red', 'Large'], ['Blue', 'Medium'], ['Green', 'Small'], ['Red', 'Medium']].map((x) => ({ x, y: '' })) } },
  q16: { label: 'Low / Medium / High (Q16)', t: { attrs: ['Level'], target: '', rows: ['Low', 'Medium', 'High', 'Medium', 'Low'].map((v) => ({ x: [v], y: '' })) } },
  city: { label: 'City + plan', t: { attrs: ['City', 'Plan'], target: '', rows: [['Bengaluru', 'Basic'], ['Mysuru', 'Premium'], ['Bengaluru', 'Standard'], ['Hubballi', 'Basic']].map((x) => ({ x, y: '' })) } },
};
type PId = keyof typeof PRESETS;

const KNOWN_ORDERS = [
  ['Low', 'Medium', 'High'],
  ['Small', 'Medium', 'Large'],
  ['Basic', 'Standard', 'Premium'],
  ['Cold', 'Mild', 'Hot'],
];

export default function EncodingSolver() {
  const [preset, setPreset] = useState<PId | null>('see');
  const [t, setT] = useState<CatTable>(structuredClone(PRESETS.see.t));
  const [mode, setMode] = useState<'onehot' | 'label' | 'ordinal'>('onehot');
  const [dropFirst, setDropFirst] = useState(false);
  const cats = t.attrs.map((_, j) => [...new Set(t.rows.map((r) => r.x[j]))].sort());
  const order = (j: number) => {
    const vals = cats[j];
    const known = KNOWN_ORDERS.find((o) => vals.every((v) => o.includes(v)));
    return known ? known.filter((v) => vals.includes(v)) : vals;
  };
  let head: string[] = [];
  let rows: (string | number)[][] = [];
  if (mode === 'onehot') {
    const cols = t.attrs.flatMap((a, j) => (dropFirst ? cats[j].slice(1) : cats[j]).map((c) => ({ a, j, c })));
    head = ['Row', ...cols.map((c) => `${c.a}_${c.c}`)];
    rows = t.rows.map((r, i) => [i + 1, ...cols.map((c) => (r.x[c.j] === c.c ? 1 : 0))]);
  } else if (mode === 'label') {
    head = ['Row', ...t.attrs.map((a) => `${a} (label)`)];
    rows = t.rows.map((r, i) => [i + 1, ...r.x.map((v, j) => cats[j].indexOf(v))]);
  } else {
    head = ['Row', ...t.attrs.map((a) => `${a} (ordinal)`)];
    rows = t.rows.map((r, i) => [i + 1, ...r.x.map((v, j) => order(j).indexOf(v))]);
  }
  const nCols = t.attrs.reduce((s, _, j) => s + cats[j].length - (dropFirst ? 1 : 0), 0);
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setT(structuredClone(PRESETS[id].t));
          }}
        />
        <CatTableEditor value={t} onChange={(v) => { setPreset(null); setT(v); }} noLabel />
        <div className="controls">
          <Seg
            label="Encoding"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'onehot', label: 'One-hot' },
              { value: 'label', label: 'Label (alphabetical)' },
              { value: 'ordinal', label: 'Ordinal (meaningful order)' },
            ]}
          />
          {mode === 'onehot' && <Toggle label="drop_first" checked={dropFirst} onChange={setDropFirst} />}
        </div>
      </InputCard>
      <Work>
        <WorkStep title="Identify the categories of each feature">
          <Table
            head={['Feature', 'Categories (sorted)', 'Count', 'Type']}
            rows={t.attrs.map((a, j) => [a, cats[j].join(', '), cats[j].length, KNOWN_ORDERS.some((o) => cats[j].every((v) => o.includes(v))) ? 'Ordinal' : 'Nominal'])}
          />
        </WorkStep>
        {mode === 'onehot' && (
          <WorkStep title="Create one binary column per category">
            <p>
              {t.attrs.map((a, j) => `${a} → ${(dropFirst ? cats[j].slice(1) : cats[j]).map((c) => `${a}_${c}`).join(', ')}`).join('; ')}. Each row gets
              a 1 in the column of its category and 0 elsewhere{dropFirst ? '; the first category of each feature is the dropped baseline (all zeros).' : '.'}
            </p>
          </WorkStep>
        )}
        {mode === 'label' && (
          <WorkStep title="Map each category to an integer (scikit-learn sorts alphabetically)">
            <p>{t.attrs.map((a, j) => `${a}: ${cats[j].map((c, k) => `${c} → ${k}`).join(', ')}`).join('; ')}.</p>
            <p style={{ color: 'var(--ochre)', fontSize: '0.95rem' }}>For nominal features this invents an order; prefer one-hot for linear models.</p>
          </WorkStep>
        )}
        {mode === 'ordinal' && (
          <WorkStep title="Map categories to integers in their natural order">
            <p>{t.attrs.map((a, j) => `${a}: ${order(j).map((c, k) => `${c} → ${k}`).join(', ')}`).join('; ')}.</p>
          </WorkStep>
        )}
        <WorkStep title="Encoded table">
          <Table head={head} numeric={head.map((_, i) => i).slice(1)} rows={rows} />
        </WorkStep>
        <Result label="Transformation">
          {mode === 'onehot'
            ? `${t.attrs.length} categorical column${t.attrs.length > 1 ? 's' : ''} → ${nCols} binary columns; exactly one 1 per original feature in every row.`
            : `${t.attrs.length} column${t.attrs.length > 1 ? 's' : ''} → ${t.attrs.length} integer column${t.attrs.length > 1 ? 's' : ''}.`}
        </Result>
        <div style={{ marginTop: '1.5rem' }}>
          <Code title="encoding.py">{`
import pandas as pd
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder

df = pd.DataFrame({
${t.attrs.map((a, j) => `    "${a}": ${JSON.stringify(t.rows.map((r) => r.x[j]))},`).join('\n')}
})
${
  mode === 'onehot'
    ? `print(pd.get_dummies(df, columns=${JSON.stringify(t.attrs)}, dtype=int${dropFirst ? ', drop_first=True' : ''}))

enc = OneHotEncoder(sparse_output=False${dropFirst ? ', drop="first"' : ''})
print(enc.fit_transform(df), enc.get_feature_names_out())`
    : mode === 'label'
      ? `enc = OrdinalEncoder()            # alphabetical, like LabelEncoder
print(enc.fit_transform(df), enc.categories_)`
      : `enc = OrdinalEncoder(categories=${JSON.stringify(t.attrs.map((_, j) => order(j)))})
print(enc.fit_transform(df))`
}
`}</Code>
        </div>
      </Work>
    </>
  );
}
