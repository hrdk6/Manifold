import { useMemo, useState, type ReactNode } from 'react';
import { conceptPresets, enjoySport, type ConceptPresetId } from '../content/data/concept';
import { ANY, PHI, candidateElimination, covers, findS, moreGeneralOrEqual, type ConceptData, type Hyp } from '../lib/concept';
import { Seg, Slider, StepperBar, useStepper } from '../components/controls';
import { Figure } from '../components/prose';

/* ------------------------------------------------------------------------ */
/* Building blocks                                                           */
/* ------------------------------------------------------------------------ */

export function HypChips({ h, changed = [], size = 'md' }: { h: Hyp; changed?: number[]; size?: 'sm' | 'md' }) {
  return (
    <span className={`hchips hchips--${size}`}>
      <span className="hchips__br">⟨</span>
      {h.map((c, i) => (
        <span key={i} className="hchip" data-kind={c === PHI ? 'phi' : c === ANY ? 'any' : 'val'} data-changed={changed.includes(i) || undefined}>
          {c}
        </span>
      ))}
      <span className="hchips__br">⟩</span>
    </span>
  );
}

export function ConceptTable({ data, active, upto }: { data: ConceptData; active?: number; upto?: number }) {
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>#</th>
            {data.attrs.map((a) => (
              <th key={a}>{a}</th>
            ))}
            <th>{data.target}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr
              key={i}
              data-hl={i === active ? 'true' : undefined}
              style={{ opacity: upto !== undefined && i > upto ? 0.38 : 1, transition: 'opacity .25s' }}
            >
              <td style={{ color: 'var(--ink-3)', fontWeight: 600 }}>{r.label ?? i + 1}</td>
              {r.x.map((v, j) => (
                <td key={j}>{v}</td>
              ))}
              <td>
                <span className={`chip ${r.y ? 'chip--ultra' : 'chip--see'}`}>{r.y ? 'Yes' : 'No'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataSeg<T extends ConceptPresetId>({ ids, value, onChange }: { ids: T[]; value: T; onChange: (v: T) => void }) {
  return <Seg value={value} onChange={onChange} options={ids.map((id) => ({ value: id, label: conceptPresets[id].label }))} />;
}

/* ------------------------------------------------------------------------ */
/* Find-S stepper                                                            */
/* ------------------------------------------------------------------------ */

export function FindSFigure({ initial = 'enjoySport' as ConceptPresetId, ids = ['enjoySport', 'hiring', 'picnic'] as ConceptPresetId[] }) {
  const [id, setId] = useState<ConceptPresetId>(initial);
  const data = conceptPresets[id].data;
  const res = useMemo(() => findS(data), [data]);
  const s = useStepper(res.steps.length + 1, 1500);
  const step = s.i === 0 ? null : res.steps[s.i - 1];
  const h = step ? step.after : data.attrs.map(() => PHI);

  return (
    <Figure
      title="Find-S, one example at a time"
      hint="Press play or step through the rows"
      caption={
        <>
          Find-S starts from the most specific hypothesis <b>⟨∅, …, ∅⟩</b> and generalises only as far as each positive example forces it to.
          Negative rows never change h. Switch to the picnic data to see Find-S end with a hypothesis that wrongly covers a negative example.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '1rem' }}>
        <DataSeg ids={ids} value={id} onChange={(v) => { setId(v); s.reset(); }} />
      </div>
      <ConceptTable data={data} active={step?.index} upto={step ? step.index : -1} />
      <div className="trace" style={{ marginTop: '1rem' }}>
        <div className="trace__title">{step ? `After example ${step.index + 1} (${step.y ? 'positive' : 'negative'})` : 'Initialise'}</div>
        <div style={{ margin: '0.5rem 0 0.6rem' }}>
          <span style={{ fontWeight: 700, marginRight: '0.5rem' }}>h =</span>
          <HypChips h={h} changed={step?.changed} />
        </div>
        <div style={{ color: 'var(--ink-2)' }}>{step ? step.note : 'h₀ = most specific hypothesis: no instance is classified positive yet.'}</div>
        {s.i === s.total - 1 && res.violations.length > 0 && (
          <div className="note note--warn" style={{ marginTop: '0.8rem', fontSize: '0.9rem' }}>
            <div className="note__title">The final h covers a negative example</div>
            <p>
              Row {res.violations.map((v) => v + 1).join(', ')} is labelled No, but the final hypothesis classifies it Yes. Find-S cannot notice
              this because it never looks at negative examples: the true concept is not a single conjunction of attribute values.
            </p>
          </div>
        )}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <StepperBar s={s} labels={(i) => (i === 0 ? 'Initial hypothesis' : `Example ${i} of ${res.steps.length}`)} />
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Candidate-Elimination stepper                                             */
/* ------------------------------------------------------------------------ */

function Boundary({ label, hs, tone }: { label: string; hs: Hyp[]; tone: 'g' | 's' }) {
  return (
    <div className={`boundary boundary--${tone}`}>
      <div className="boundary__label">{label}</div>
      <div className="boundary__set">
        {hs.length === 0 ? <span className="boundary__empty">∅ (empty set)</span> : hs.map((h, i) => <HypChips key={i} h={h} size="sm" />)}
      </div>
    </div>
  );
}

export function CEAFigure({ initial = 'apple' as ConceptPresetId, ids = ['apple', 'enjoySport', 'tennisCEA'] as ConceptPresetId[] }) {
  const [id, setId] = useState<ConceptPresetId>(initial);
  const data = conceptPresets[id].data;
  const res = useMemo(() => candidateElimination(data), [data]);
  const s = useStepper(res.steps.length + 1, 2200);
  const step = s.i === 0 ? null : res.steps[s.i - 1];
  const S = step ? step.S : [data.attrs.map(() => PHI)];
  const G = step ? step.G : [data.attrs.map(() => ANY)];
  const collapsed = S.length === 0 || G.length === 0;

  return (
    <Figure
      title="Candidate-Elimination: the version space closing in"
      hint="Step through to watch S rise and G fall"
      caption={
        <>
          <b>G</b> (top) holds the most general hypotheses still consistent with the data, <b>S</b> (bottom) the most specific. Every
          hypothesis between them is in the version space. Positive examples push S up; negative examples push G down.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '1rem' }}>
        <DataSeg ids={ids} value={id} onChange={(v) => { setId(v); s.reset(); }} />
      </div>
      <div className="viz-grid">
        <div>
          <ConceptTable data={data} active={step?.index} upto={step ? step.index : -1} />
          <div className="vs-diagram" data-collapsed={collapsed}>
            <Boundary label="G" hs={G} tone="g" />
            <div className="vs-diagram__space">
              {collapsed ? 'Version space is empty: no conjunctive hypothesis fits all the data' : 'version space'}
            </div>
            <Boundary label="S" hs={S} tone="s" />
          </div>
        </div>
        <div className="viz-side">
          <div className="trace" style={{ maxHeight: 360, overflow: 'auto' }}>
            <div className="trace__title">
              {step ? `Example ${step.index + 1}: ${step.y ? 'positive' : 'negative'}` : 'Initialise the boundaries'}
            </div>
            {!step && (
              <div style={{ color: 'var(--ink-2)' }}>
                S₀ = ⟨∅, …, ∅⟩, the most specific hypothesis. G₀ = ⟨?, …, ?⟩, the most general. The version space starts as the whole hypothesis space.
              </div>
            )}
            {step && (
              <ul className="event-list">
                {step.events.map((e, i) => (
                  <li key={i} data-kind={e.kind}>
                    {e.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {s.i === s.total - 1 && !collapsed && (
            <div className="trace">
              <div className="trace__title">Final version space ({res.versionSpace.length} hypotheses)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
                {res.versionSpace.map((h, i) => (
                  <HypChips key={i} h={h} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <StepperBar s={s} labels={(i) => (i === 0 ? 'Initial S and G' : `Example ${i} of ${res.steps.length}`)} />
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Hypothesis lattice (general-to-specific ordering)                         */
/* ------------------------------------------------------------------------ */

const LAT_ATTRS = [
  ['Sunny', 'Rainy'],
  ['Strong', 'Weak'],
];

export function LatticeFigure() {
  const levels: Hyp[][] = [
    [[ANY, ANY]],
    [
      ['Sunny', ANY],
      ['Rainy', ANY],
      [ANY, 'Strong'],
      [ANY, 'Weak'],
    ],
    [
      ['Sunny', 'Strong'],
      ['Sunny', 'Weak'],
      ['Rainy', 'Strong'],
      ['Rainy', 'Weak'],
    ],
    [[PHI, PHI]],
  ];
  const all = levels.flat();
  const instances = LAT_ATTRS[0].flatMap((a) => LAT_ATTRS[1].map((b) => [a, b]));
  const [sel, setSel] = useState<number>(1);
  const h = all[sel];
  const W = 560;
  const pos = (li: number, i: number, n: number) => ({ x: W / 2 + (i - (n - 1) / 2) * 128, y: 34 + li * 78 });
  const nodes = levels.flatMap((lv, li) => lv.map((hh, i) => ({ h: hh, ...pos(li, i, lv.length), idx: levels.slice(0, li).flat().length + i })));
  const edges: [number, number][] = [];
  nodes.forEach((a) =>
    nodes.forEach((b) => {
      if (a.y + 78 !== b.y) return;
      if (moreGeneralOrEqual(a.h, b.h)) edges.push([a.idx, b.idx]);
    }),
  );
  const rel = (n: Hyp) => (n === h ? 'self' : moreGeneralOrEqual(n, h) ? 'more' : moreGeneralOrEqual(h, n) ? 'less' : 'none');

  return (
    <Figure
      title="The more-general-than ordering"
      hint="Click any hypothesis"
      caption={
        <>
          Every hypothesis for a two-attribute problem (Sky, Wind). An edge joins h₁ above h₂ when h₁ is <b>more general</b>: it accepts every
          instance h₂ accepts. <span style={{ color: 'var(--ultra)' }}>Ultramarine</span> nodes are more general than your selection,{' '}
          <span style={{ color: 'var(--rose)' }}>rose</span> ones more specific. Hypotheses side by side are incomparable: it is only a
          partial order.
        </>
      }
    >
      <div className="viz-grid">
        <svg viewBox={`0 0 ${W} 290`} className="lattice" role="img" aria-label="Hypothesis lattice">
          {edges.map(([a, b], i) => {
            const A = nodes.find((n) => n.idx === a)!;
            const B = nodes.find((n) => n.idx === b)!;
            const up = (r: string) => r === 'more' || r === 'self';
            const down = (r: string) => r === 'less' || r === 'self';
            const hot = (up(rel(A.h)) && up(rel(B.h))) || (down(rel(A.h)) && down(rel(B.h)));
            return <line key={i} x1={A.x} y1={A.y + 13} x2={B.x} y2={B.y - 13} stroke={hot ? 'var(--ink-2)' : 'var(--rule-strong)'} strokeWidth={hot ? 1.6 : 1} />;
          })}
          {nodes.map((n) => {
            const r = rel(n.h);
            const fill = r === 'self' ? 'var(--ink)' : r === 'more' ? 'var(--ultra)' : r === 'less' ? 'var(--rose)' : 'var(--surface)';
            const txt = r === 'none' ? 'var(--ink)' : 'var(--paper)';
            return (
              <g key={n.idx} onClick={() => setSel(n.idx)} style={{ cursor: 'pointer' }} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(n.idx)}>
                <rect x={n.x - 58} y={n.y - 14} width={116} height={28} rx={14} fill={fill} stroke={r === 'none' ? 'var(--rule-strong)' : fill} />
                <text x={n.x} y={n.y + 4.5} textAnchor="middle" style={{ fontSize: 12, fontWeight: 650, fill: txt, fontFamily: 'var(--font-code)' }}>
                  ⟨{n.h.join(', ')}⟩
                </text>
              </g>
            );
          })}
        </svg>
        <div className="viz-side">
          <div>
            <div className="ctl__label" style={{ marginBottom: '0.4rem' }}>
              Instances accepted by <HypChips h={h} size="sm" />
            </div>
            <div className="inst-grid">
              {instances.map((x, i) => (
                <div key={i} className="inst" data-on={covers(h, x)}>
                  {x.join(', ')}
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--ink-2)', lineHeight: 1.5 }}>
            ⟨?, ?⟩ accepts all four instances, ⟨∅, ∅⟩ accepts none. Moving up the lattice can only add instances, never remove them.
          </p>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Hypothesis-space size calculator                                          */
/* ------------------------------------------------------------------------ */

export function HypothesisCounter() {
  const [k, setK] = useState([3, 2, 2, 2, 2, 2]);
  const names = enjoySport.attrs;
  const X = k.reduce((a, b) => a * b, 1);
  const syn = k.reduce((a, b) => a * (b + 2), 1);
  const sem = 1 + k.reduce((a, b) => a * (b + 1), 1);
  const big = (n: number) => n.toLocaleString('en-IN');
  return (
    <Figure
      title="How big is the hypothesis space?"
      hint="Change how many values each attribute can take"
      caption={
        <>
          With Mitchell’s EnjoySport attributes (Sky has 3 values, the rest 2) there are <b>96</b> instances, <b>5120</b> syntactically
          distinct hypotheses (each attribute may also be ? or ∅) but only <b>973</b> semantically distinct ones, because any hypothesis
          containing ∅ classifies everything negative.
        </>
      }
    >
      <div className="viz-grid">
        <div className="controls" style={{ alignItems: 'flex-start' }}>
          {names.map((n, i) => (
            <Slider
              key={n}
              label={n}
              value={k[i]}
              min={2}
              max={5}
              width="8.5rem"
              onChange={(v) => setK((old) => old.map((o, j) => (j === i ? v : o)))}
            />
          ))}
        </div>
        <dl className="readout" style={{ fontSize: '0.92rem' }}>
          <dt>Instances |X| = Π kᵢ</dt>
          <dd>{big(X)}</dd>
          <dt>Possible target concepts 2^|X|</dt>
          <dd>{X > 60 ? `≈ 10^${Math.round(X * Math.log10(2))}` : big(2 ** X)}</dd>
          <dt>Syntactic hypotheses Π (kᵢ + 2)</dt>
          <dd>{big(syn)}</dd>
          <dt>Semantic hypotheses 1 + Π (kᵢ + 1)</dt>
          <dd>{big(sem)}</dd>
        </dl>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Inductive bias: three learners on a tiny instance space                   */
/* ------------------------------------------------------------------------ */

const B_SKY = ['Sunny', 'Cloudy', 'Rainy'];
const B_WIND = ['Strong', 'Weak'];

export function BiasFigure() {
  const inst = B_SKY.flatMap((s) => B_WIND.map((w) => [s, w]));
  const [labels, setLabels] = useState<(0 | 1 | -1)[]>([1, 0, 0, 0, -1, 0]); // 1 +, -1 −, 0 unlabeled
  const cycle = (i: number) => setLabels((L) => L.map((v, j) => (j === i ? (v === 0 ? 1 : v === 1 ? -1 : 0) : v)) as (0 | 1 | -1)[]);
  const train = inst.map((x, i) => ({ x, y: labels[i] })).filter((d) => d.y !== 0);

  // all semantically distinct conjunctive hypotheses
  const hyps: Hyp[] = [[PHI, PHI]];
  for (const s of [ANY, ...B_SKY]) for (const w of [ANY, ...B_WIND]) hyps.push([s, w]);
  const vs = hyps.filter((h) => train.every((d) => covers(h, d.x) === (d.y === 1)));
  const fsH = (() => {
    let h: Hyp = [PHI, PHI];
    for (const d of train)
      if (d.y === 1) h = h.map((c, i) => (c === PHI ? d.x[i] : c !== ANY && c !== d.x[i] ? ANY : c));
    return h;
  })();

  type P = '+' | '−' | '?';
  const learners: { name: string; bias: string; pred: (i: number) => P; note?: string }[] = [
    {
      name: 'Rote learner',
      bias: 'No bias: stores examples, classifies only what it has seen.',
      pred: (i) => (labels[i] === 1 ? '+' : labels[i] === -1 ? '−' : '?'),
    },
    {
      name: 'Unbiased version space',
      bias: 'H = every subset of X. Any unseen instance gets exactly half the votes.',
      pred: (i) => (labels[i] === 1 ? '+' : labels[i] === -1 ? '−' : '?'),
    },
    {
      name: 'Candidate-Elimination',
      bias: 'Assumes the target is a conjunction (c ∈ H). Classifies when the version space is unanimous.',
      pred: (i) => {
        if (!vs.length) return '?';
        const v = vs.map((h) => covers(h, inst[i]));
        return v.every(Boolean) ? '+' : v.every((b) => !b) ? '−' : '?';
      },
      note: vs.length ? `${vs.length} consistent conjunctions` : 'No conjunction fits these labels',
    },
    {
      name: 'Find-S',
      bias: 'Also assumes everything is negative unless forced otherwise. Always answers.',
      pred: (i) => (covers(fsH, inst[i]) ? '+' : '−'),
    },
  ];

  return (
    <Figure
      title="Stronger bias, bolder generalisation"
      hint="Click the cells on the left to label instances"
      caption={
        <>
          Six possible days (Sky × Wind). Label a few, then compare what each learner predicts for the days you did not label. Without bias,
          a learner can only repeat its training data (<b>?</b> everywhere else). Each extra assumption lets the learner commit to more
          predictions, at the risk of being wrong if the assumption is false.
        </>
      }
    >
      <div className="bias-grid">
        <div>
          <div className="ctl__label" style={{ marginBottom: '0.4rem' }}>
            Training labels
          </div>
          <div className="bias-cells">
            {inst.map((x, i) => (
              <button key={i} className="bias-cell" data-v={labels[i]} onClick={() => cycle(i)} aria-label={`${x.join(', ')}: ${labels[i] === 1 ? 'positive' : labels[i] === -1 ? 'negative' : 'unlabelled'}`}>
                <small>{x.join(', ')}</small>
                <b>{labels[i] === 1 ? '+' : labels[i] === -1 ? '−' : '·'}</b>
              </button>
            ))}
          </div>
        </div>
        {learners.map((L) => (
          <div key={L.name}>
            <div className="ctl__label" style={{ marginBottom: '0.15rem' }}>
              {L.name}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--ink-3)', minHeight: '2.4em', lineHeight: 1.35, marginBottom: '0.35rem' }}>{L.bias}</div>
            <div className="bias-cells">
              {inst.map((x, i) => {
                const p = L.pred(i);
                return (
                  <div key={i} className="bias-cell bias-cell--out" data-p={p} data-train={labels[i] !== 0}>
                    <small>{x.join(', ')}</small>
                    <b>{p}</b>
                  </div>
                );
              })}
            </div>
            {L.note && <div style={{ fontSize: '0.74rem', color: 'var(--ink-3)', marginTop: '0.3rem' }}>{L.note}</div>}
          </div>
        ))}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Classifying with a partially learned concept (version-space voting)       */
/* ------------------------------------------------------------------------ */

export function VSVoteFigure() {
  const res = useMemo(() => candidateElimination(enjoySport), []);
  const vs = res.versionSpace;
  const doms = enjoySport.domains!;
  const presets: { name: string; x: string[] }[] = [
    { name: 'A', x: ['Sunny', 'Warm', 'Normal', 'Strong', 'Cool', 'Change'] },
    { name: 'B', x: ['Rainy', 'Cold', 'Normal', 'Weak', 'Warm', 'Same'] },
    { name: 'C', x: ['Sunny', 'Warm', 'Normal', 'Weak', 'Warm', 'Same'] },
    { name: 'D', x: ['Sunny', 'Cold', 'Normal', 'Strong', 'Warm', 'Same'] },
  ];
  const [x, setX] = useState<string[]>(presets[0].x);
  const votes = vs.map((h) => covers(h, x));
  const yes = votes.filter(Boolean).length;
  let verdict: ReactNode;
  if (yes === vs.length) verdict = <span style={{ color: 'var(--ultra)' }}>Unanimously positive: as confident as if the concept were fully learned.</span>;
  else if (yes === 0) verdict = <span style={{ color: 'var(--rose)' }}>Unanimously negative.</span>;
  else verdict = <span style={{ color: 'var(--ochre)' }}>Split vote: {yes} of {vs.length} say yes. A good example to ask a teacher about next.</span>;

  return (
    <Figure
      title="Using a version space before it has converged"
      hint="Pick an instance, or build your own"
      caption={
        <>
          After the four EnjoySport examples, six hypotheses remain. A new instance can still be classified with certainty if every remaining
          hypothesis agrees: if it satisfies every member of S it is positive; if it satisfies no member of G it is negative.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.9rem' }}>
        <Seg
          label="Mitchell’s test instances"
          value={presets.find((p) => p.x.join() === x.join())?.name ?? ''}
          onChange={(n) => setX(presets.find((p) => p.name === n)!.x)}
          options={presets.map((p) => ({ value: p.name, label: p.name }))}
        />
      </div>
      <div className="input-grid" style={{ marginBottom: '1rem' }}>
        <table>
          <thead>
            <tr>
              {enjoySport.attrs.map((a) => (
                <th key={a}>{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {enjoySport.attrs.map((a, i) => (
                <td key={a}>
                  <select value={x[i]} onChange={(e) => setX(x.map((v, j) => (j === i ? e.target.value : v)))} aria-label={a}>
                    {doms[i].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="vote-list">
        {vs.map((h, i) => (
          <div key={i} className="vote" data-yes={votes[i]}>
            <HypChips h={h} size="sm" />
            <span className="vote__v">{votes[i] ? 'Yes' : 'No'}</span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: '0.9rem', fontWeight: 650 }}>{verdict}</p>
    </Figure>
  );
}
