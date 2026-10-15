import { useMemo, useState } from 'react';
import { conceptPresets, type ConceptPresetId } from '../../content/data/concept';
import { ANY, candidateElimination, domainsOf, PHI, type ConceptData } from '../../lib/concept';
import { HypChips } from '../../viz/concept';
import { CatTableEditor, type CatTable } from '../inputs';
import { InputCard, Presets, Result, Work, WorkStep } from '../ui';
import { Table } from '../../components/prose';

const toCat = (d: ConceptData): CatTable => ({ attrs: d.attrs.slice(), target: d.target, rows: d.rows.map((r) => ({ x: r.x.slice(), y: r.y ? 'Yes' : 'No' })) });

function HypList({ hs }: { hs: string[][] }) {
  if (!hs.length) return <strong style={{ color: 'var(--rose)' }}>{'{ }'} (empty)</strong>;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      {hs.map((h, i) => (
        <HypChips key={i} h={h} size="sm" />
      ))}
    </span>
  );
}

export default function CEASolver() {
  const ids: ConceptPresetId[] = ['apple', 'enjoySport', 'tennisCEA', 'hiring', 'picnic'];
  const [preset, setPreset] = useState<ConceptPresetId | null>('apple');
  const [table, setTable] = useState<CatTable>(toCat(conceptPresets.apple.data));
  const data: ConceptData = useMemo(() => {
    const rows = table.rows.map((r) => ({ x: r.x.map((v) => v.trim()), y: /^(y|yes|true|1|\+)$/i.test(r.y.trim()) }));
    const pd0 = preset ? conceptPresets[preset].data : undefined;
    const sameAttrs = !!pd0 && pd0.attrs.length === table.attrs.length && pd0.attrs.every((a, i) => a === table.attrs[i]);
    const presetDomains = sameAttrs ? pd0!.domains : undefined;
    const base: ConceptData = { attrs: table.attrs, target: table.target, rows };
    const seen = domainsOf(base);
    const domains = seen.map((vals, i) => {
      const pd = presetDomains?.[i] ?? [];
      return [...pd, ...vals.filter((v) => !pd.includes(v))];
    });
    return { ...base, domains };
  }, [table, preset]);
  const res = useMemo(() => candidateElimination(data), [data]);
  const collapsed = res.S.length === 0 || res.G.length === 0;

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
            setTable(t);
          }}
        />
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>
          Attribute values used for specialisation: {data.attrs.map((a, i) => `${a} ∈ {${data.domains![i].join(', ')}}`).join('; ')}.
        </p>
      </InputCard>

      <Work>
        <WorkStep title="Initialise the boundaries">
          <p>
            S₀ = {'{'}
            <HypChips h={data.attrs.map(() => PHI)} size="sm" />
            {'}'} (most specific) and G₀ = {'{'}
            <HypChips h={data.attrs.map(() => ANY)} size="sm" />
            {'}'} (most general).
          </p>
        </WorkStep>
        {res.steps.map((s) => (
          <WorkStep key={s.index} title={`Example ${data.rows[s.index].label ?? s.index + 1}: ⟨${s.x.join(', ')}⟩ is ${s.y ? 'positive' : 'negative'}`}>
            <p style={{ fontSize: '0.95rem', color: 'var(--ink-2)' }}>
              {s.y
                ? 'Positive example: remove from G every hypothesis that does not cover it; minimally generalise S to cover it.'
                : 'Negative example: remove from S every hypothesis that covers it; minimally specialise each member of G that covers it, keeping only specialisations more general than S.'}
            </p>
            <ul className="event-list" style={{ fontFamily: 'var(--font-ui)' }}>
              {s.events.map((e, i) => (
                <li key={i} data-kind={e.kind}>
                  {e.text}
                </li>
              ))}
            </ul>
            <Table
              head={['Boundary', 'After this example']}
              rows={[
                ['S', <HypList hs={s.S} />],
                ['G', <HypList hs={s.G} />],
              ]}
            />
          </WorkStep>
        ))}
        <Result label={collapsed ? 'The version space is empty' : 'Final boundaries'}>
          {collapsed ? (
            <div style={{ fontSize: '1rem', fontWeight: 500 }}>
              No conjunctive hypothesis is consistent with all the examples. Either the data contains an error or the target concept needs a
              disjunction, so it is not in the hypothesis space H.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div>
                S = <HypList hs={res.S} />
              </div>
              <div>
                G = <HypList hs={res.G} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, opacity: 0.9 }}>
                {res.versionSpace.length === 1
                  ? 'S = G: the version space has converged to a single hypothesis.'
                  : `The version space holds ${res.versionSpace.length} hypotheses between S and G.`}
              </div>
            </div>
          )}
        </Result>
        {!collapsed && res.versionSpace.length > 1 && (
          <div style={{ marginTop: '1rem' }}>
            <Table head={['Hypotheses in the version space']} rows={res.versionSpace.map((h) => [<HypChips h={h} size="sm" />])} />
          </div>
        )}
      </Work>
    </>
  );
}
