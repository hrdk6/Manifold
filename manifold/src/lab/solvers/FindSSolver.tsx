import { useMemo, useState } from 'react';
import { conceptPresets, type ConceptPresetId } from '../../content/data/concept';
import { findS, hypStr, PHI, type ConceptData } from '../../lib/concept';
import { HypChips } from '../../viz/concept';
import { CatTableEditor, type CatTable } from '../inputs';
import { InputCard, Presets, Result, Work, WorkStep } from '../ui';
import { Code } from '../../components/prose';

const toCat = (d: ConceptData): CatTable => ({ attrs: d.attrs.slice(), target: d.target, rows: d.rows.map((r) => ({ x: r.x.slice(), y: r.y ? 'Yes' : 'No' })) });

export default function FindSSolver() {
  const ids: ConceptPresetId[] = ['enjoySport', 'hiring', 'picnic', 'tennisEquipment', 'apple'];
  const [preset, setPreset] = useState<ConceptPresetId | null>('enjoySport');
  const [table, setTable] = useState<CatTable>(toCat(conceptPresets.enjoySport.data));
  const data: ConceptData = useMemo(
    () => ({ attrs: table.attrs, target: table.target, rows: table.rows.map((r) => ({ x: r.x.map((v) => v.trim()), y: /^(y|yes|true|1|\+)$/i.test(r.y.trim()) })) }),
    [table],
  );
  const res = useMemo(() => findS(data), [data]);
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={ids.map((id) => ({ id, label: conceptPresets[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setTable(toCat(conceptPresets[id].data));
          }}
        />
        <CatTableEditor
          value={table}
          labelOptions={['Yes', 'No']}
          onChange={(t) => {
            setPreset(null);
            setTable(t);
          }}
        />
      </InputCard>

      <Work>
        <WorkStep title="Initialise h to the most specific hypothesis">
          <p>
            h₀ = <HypChips h={data.attrs.map(() => PHI)} size="sm" /> &nbsp;(∅ = no value is acceptable; h₀ classifies every instance as negative).
          </p>
        </WorkStep>
        {res.steps.map((s) => (
          <WorkStep key={s.index} title={`Example ${s.index + 1}: ⟨${s.x.join(', ')}⟩ is ${s.y ? 'positive' : 'negative'}`}>
            <p>{s.note}</p>
            {s.y && s.changed.length > 0 && (
              <p style={{ fontSize: '0.95rem', color: 'var(--ink-2)' }}>
                Compare attribute by attribute:{' '}
                {s.changed
                  .map((i) => `${data.attrs[i]}: ${s.before[i]} → ${s.after[i]}`)
                  .join('; ')}
                .
              </p>
            )}
            <p>
              h{s.index + 1} = <HypChips h={s.after} changed={s.changed} size="sm" />
            </p>
          </WorkStep>
        ))}
        <Result label="Final (maximally specific) hypothesis">
          <HypChips h={res.final} />
          <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.5rem', opacity: 0.9 }}>
            {res.final.every((c) => c === '?')
              ? 'Every attribute was generalised to “?”: the hypothesis accepts every instance.'
              : `${data.target} = Yes when ${res.final
                  .map((c, i) => (c === '?' || c === PHI ? null : `${data.attrs[i]} = ${c}`))
                  .filter(Boolean)
                  .join(' and ')}.`}
          </div>
        </Result>
        {res.violations.length > 0 && (
          <div className="note note--warn" style={{ marginTop: '1rem' }}>
            <div className="note__title">The result is inconsistent with the data</div>
            <p>
              Example{res.violations.length > 1 ? 's' : ''} {res.violations.map((v) => v + 1).join(', ')} {res.violations.length > 1 ? 'are' : 'is'} labelled No but satisfied
              by {hypStr(res.final)}. Find-S ignores negatives, so it cannot notice: the target concept is not a conjunction of attribute values
              (or the data contains an error). Mention this as a limitation of Find-S in your answer.
            </p>
          </div>
        )}
        <div style={{ marginTop: '1.5rem' }}>
          <Code title="find_s.py">{`
data = [
${table.rows.map((r) => `    (${JSON.stringify(r.x)}, "${r.y}"),`).join('\n')}
]
h = ["0"] * ${table.attrs.length}          # "0" stands for phi
for x, label in data:
    if label != "Yes":
        continue
    for i, v in enumerate(x):
        if h[i] == "0":
            h[i] = v
        elif h[i] != v:
            h[i] = "?"
print(h)
`}</Code>
        </div>
      </Work>
    </>
  );
}
