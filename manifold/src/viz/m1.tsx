import { useMemo, useState } from 'react';
import { Seg, Slider } from '../components/controls';
import { Plot } from '../components/Plot';
import { Figure } from '../components/prose';
import { f, fx } from '../lib/fmt';
import { mulberry32 } from '../lib/rng';

/* ------------------------------------------------------------------------ */
/* Traditional programming vs machine learning                               */
/* ------------------------------------------------------------------------ */

export function ProgrammingVsML() {
  const Box = ({ x, y, w, label, tone }: { x: number; y: number; w: number; label: string; tone?: 'ink' | 'ultra' | 'rose' }) => (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={42}
        rx={10}
        fill={tone === 'ink' ? 'var(--ink)' : tone === 'ultra' ? 'var(--ultra-soft)' : tone === 'rose' ? 'var(--rose-soft)' : 'var(--surface)'}
        stroke={tone === 'ink' ? 'var(--ink)' : tone === 'ultra' ? 'var(--ultra)' : tone === 'rose' ? 'var(--rose)' : 'var(--rule-strong)'}
        strokeWidth={1.5}
      />
      <text
        x={x + w / 2}
        y={y + 26}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 14, fill: tone === 'ink' ? 'var(--paper)' : tone === 'ultra' ? 'var(--ultra)' : tone === 'rose' ? 'var(--rose)' : 'var(--ink)' }}
      >
        {label}
      </text>
    </g>
  );
  const Arrow = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => (
    <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="var(--ink-3)" strokeWidth={1.6} markerEnd="url(#arr)" fill="none" />
  );
  return (
    <Figure
      title="Who writes the rules?"
      caption={
        <>
          In traditional programming a person writes the rules and the computer applies them. In machine learning the computer is given data
          together with the answers we want, and <b>produces the rules itself</b>, which can then be applied to new data.
        </>
      }
    >
      <svg viewBox="0 0 720 230" style={{ width: '100%', height: 'auto' }} role="img" aria-label="Traditional programming versus machine learning">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-3)" />
          </marker>
        </defs>
        <text x={14} y={22} style={{ fontFamily: 'var(--font-ui)', fontWeight: 750, fontSize: 13, fill: 'var(--ink-2)' }}>
          Traditional programming
        </text>
        <Box x={14} y={34} w={120} label="Data" />
        <Box x={14} y={84} w={120} label="Rules" tone="rose" />
        <Arrow x1={136} y1={55} x2={204} y2={78} />
        <Arrow x1={136} y1={105} x2={204} y2={86} />
        <Box x={206} y={60} w={130} label="Computer" tone="ink" />
        <Arrow x1={338} y1={81} x2={392} y2={81} />
        <Box x={394} y={60} w={110} label="Answers" />

        <text x={14} y={152} style={{ fontFamily: 'var(--font-ui)', fontWeight: 750, fontSize: 13, fill: 'var(--ink-2)' }}>
          Machine learning
        </text>
        <Box x={14} y={164} w={120} label="Data" />
        <Box x={150} y={164} w={120} label="Answers" />
        <Arrow x1={210} y1={164} x2={290} y2={150} />
        <Arrow x1={74} y1={164} x2={290} y2={146} />
        <Box x={292} y={122} w={130} label="Learner" tone="ink" />
        <Arrow x1={424} y1={143} x2={478} y2={143} />
        <Box x={480} y={122} w={110} label="Rules" tone="ultra" />
        <Arrow x1={592} y1={143} x2={620} y2={143} />
        <text x={626} y={140} style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fill: 'var(--ink-3)' }}>
          applied to
        </text>
        <text x={626} y={155} style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fill: 'var(--ink-3)' }}>
          new data
        </text>
      </svg>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Stability: well-posed vs ill-posed                                        */
/* ------------------------------------------------------------------------ */

export function StabilityFigure() {
  const [exp, setExp] = useState(-6);
  const d = Math.pow(10, exp);
  const N = 50;
  const traj = (fn: (x: number) => number, x0: number) => {
    const out = [x0];
    for (let i = 1; i < N; i++) out.push(fn(out[i - 1]));
    return out;
  };
  const chaos = (x: number) => 3.9 * x * (1 - x);
  const stable = (x: number) => 0.55 * x + 0.3;
  const x0 = 0.2;
  const c1 = traj(chaos, x0);
  const c2 = traj(chaos, x0 + d);
  const s1 = traj(stable, x0);
  const s2 = traj(stable, x0 + d);
  const split = c1.findIndex((v, i) => Math.abs(v - c2[i]) > 0.1);

  const panel = (a: number[], b: number[], title: string, color: string) => (
    <div>
      <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
        {title}
      </div>
      <div className="plot-wrap">
        <Plot xDomain={[0, N - 1]} yDomain={[0, 1]} height={220} xLabel="time step" yTicks={[0, 0.5, 1]}>
          {(s) => (
            <>
              <path d={a.map((v, i) => `${i ? 'L' : 'M'}${s.x(i)} ${s.y(v)}`).join('')} fill="none" stroke={color} strokeWidth={2} />
              <path d={b.map((v, i) => `${i ? 'L' : 'M'}${s.x(i)} ${s.y(v)}`).join('')} fill="none" stroke="var(--ochre)" strokeWidth={2} strokeDasharray="4 3" />
            </>
          )}
        </Plot>
      </div>
    </div>
  );

  return (
    <Figure
      title="Stability: does a tiny change in the input stay tiny?"
      hint="Shrink or grow the perturbation"
      caption={
        <>
          Both panels start two runs from inputs that differ by δ. The left system is stable: the runs stay together, so the problem of
          predicting it is well-posed. The right one is chaotic (the logistic map, a toy model of markets and weather): any δ, however small,
          eventually produces a completely different answer, violating Hadamard’s third condition.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '1rem' }}>
        <Slider label="Perturbation δ" value={exp} min={-10} max={-1} step={1} onChange={setExp} format={(v) => `10^${v}`} />
        <div className="legend">
          <span>
            <i className="keyline" style={{ color: 'var(--ink-2)' }} /> start x₀ = 0.2
          </span>
          <span>
            <i className="keyline keyline--dash" style={{ color: 'var(--ochre)' }} /> start x₀ + δ
          </span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))', gap: '1rem' }}>
        {panel(s1, s2, 'Stable system: well-posed', 'var(--ultra)')}
        {panel(c1, c2, `Chaotic system: ill-posed${split >= 0 ? ` (runs split at step ${split})` : ''}`, 'var(--rose)')}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Mitchell's final design: four modules in a loop                           */
/* ------------------------------------------------------------------------ */

const MODULES = {
  checkers: [
    { id: 'eg', name: 'Experiment Generator', out: 'new problem', desc: 'Proposes the next practice game, here simply the standard starting board. A smarter generator would pick positions that teach the most.' },
    { id: 'ps', name: 'Performance System', out: 'solution trace', desc: 'Plays the game using the current learned evaluation function V̂, choosing the move whose successor board scores highest. Output: the game history.' },
    { id: 'cr', name: 'Critic', out: 'training examples', desc: 'Turns the game history into training examples ⟨b, V_train(b)⟩, estimating each intermediate board’s value as V̂(Successor(b)).' },
    { id: 'ge', name: 'Generalizer', out: 'hypothesis V̂', desc: 'Fits the weights w₀…w₆ to the training examples with the LMS rule, producing an improved hypothesis for the next game.' },
  ],
  spam: [
    { id: 'eg', name: 'Experiment Generator', out: 'new problem', desc: 'Chooses which incoming emails to process, or which uncertain emails to ask the user to label (active learning).' },
    { id: 'ps', name: 'Performance System', out: 'solution trace', desc: 'Classifies each email as spam or not-spam with the current model (e.g. Naive Bayes over word features) and files it.' },
    { id: 'cr', name: 'Critic', out: 'training examples', desc: 'Collects feedback: emails the user moves out of or into the spam folder become labelled training examples ⟨email, label⟩.' },
    { id: 'ge', name: 'Generalizer', out: 'hypothesis', desc: 'Retrains the classifier on the enlarged labelled set, updating word probabilities or weights, and hands the new model back.' },
  ],
};

export function LearningSystemFlow() {
  const [task, setTask] = useState<'checkers' | 'spam'>('checkers');
  const [active, setActive] = useState('ps');
  const mods = MODULES[task];
  const pos: Record<string, { x: number; y: number }> = {
    eg: { x: 250, y: 20 },
    ps: { x: 470, y: 120 },
    cr: { x: 250, y: 220 },
    ge: { x: 30, y: 120 },
  };
  const cur = mods.find((m) => m.id === active)!;
  const W = 190;
  const H = 52;
  const c = (id: string) => ({ x: pos[id].x + W / 2, y: pos[id].y + H / 2 });
  const edge = (a: string, b: string, label: string, lx: number, ly: number) => {
    const A = c(a);
    const B = c(b);
    return (
      <g key={a + b}>
        <path d={`M${A.x} ${A.y} Q ${(A.x + B.x) / 2 + (B.y - A.y) * 0.25} ${(A.y + B.y) / 2 - (B.x - A.x) * 0.25} ${B.x} ${B.y}`} className="edge" markerEnd="url(#arr2)" />
        <text x={lx} y={ly} className="edge-label" textAnchor="middle">
          {label}
        </text>
      </g>
    );
  };
  return (
    <Figure
      title="The final design: four modules in a loop"
      hint="Click a module"
      caption={
        <>
          Mitchell’s design for a learning program. Each pass round the loop plays a game, critiques it, generalises from the critique and
          proposes the next game. Switch to the spam filter to see the same architecture applied to question bank Q5.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '0.8rem' }}>
        <Seg
          value={task}
          onChange={setTask}
          options={[
            { value: 'checkers', label: 'Checkers player' },
            { value: 'spam', label: 'Spam filter' },
          ]}
        />
      </div>
      <div className="viz-grid">
        <svg viewBox="0 0 690 300" className="flow" role="img" aria-label="Learning system design loop">
          <defs>
            <marker id="arr2" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-3)" />
            </marker>
          </defs>
          {edge('eg', 'ps', mods[0].out, 520, 52)}
          {edge('ps', 'cr', mods[1].out, 530, 250)}
          {edge('cr', 'ge', mods[2].out, 110, 250)}
          {edge('ge', 'eg', mods[3].out, 120, 52)}
          {mods.map((m) => (
            <g
              key={m.id}
              className="node"
              data-active={active === m.id}
              onClick={() => setActive(m.id)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActive(m.id)}
            >
              <rect x={pos[m.id].x} y={pos[m.id].y} width={W} height={H} rx={12} />
              <text x={pos[m.id].x + W / 2} y={pos[m.id].y + 31} textAnchor="middle">
                {m.name}
              </text>
            </g>
          ))}
        </svg>
        <div className="panel">
          <h4>{cur.name}</h4>
          <p>{cur.desc}</p>
          <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem' }}>Outputs: {cur.out}</p>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* LMS weight-update rule on Mitchell's checkers features                     */
/* ------------------------------------------------------------------------ */

const FEATS = ['x₁ black pieces', 'x₂ red pieces', 'x₃ black kings', 'x₄ red kings', 'x₅ black threatened', 'x₆ red threatened'];
const TRUE_W = [0.5, 3, -3, 4, -4, -2, 2];

export function LMSFigure() {
  const [eta, setEta] = useState(0.08);
  const [steps, setSteps] = useState(0);
  const sim = useMemo(() => {
    const rng = mulberry32(11);
    let w = [0, 0, 0, 0, 0, 0, 0];
    const hist: { w: number[]; err: number; x: number[]; vt: number; vh: number }[] = [];
    for (let t = 0; t < 400; t++) {
      const x = [1, ...Array.from({ length: 6 }, (_, i) => Math.round(rng() * (i < 2 ? 12 : i < 4 ? 4 : 5)) / 12)];
      const vt = TRUE_W.reduce((s, wi, i) => s + wi * x[i], 0) + (rng() - 0.5) * 0.2;
      const vh = w.reduce((s, wi, i) => s + wi * x[i], 0);
      const err = vt - vh;
      hist.push({ w: w.slice(), err, x, vt, vh });
      w = w.map((wi, i) => wi + eta * err * x[i]);
    }
    return hist;
  }, [eta]);
  const cur = sim[Math.min(steps, sim.length - 1)];
  const nextW = cur.w.map((wi, i) => wi + eta * cur.err * cur.x[i]);
  const errs = sim.slice(0, steps + 1).map((h) => h.err * h.err);

  return (
    <Figure
      title="The LMS rule learning a board evaluation function"
      hint="Step, or run many games at once"
      caption={
        <>
          V̂(b) = w₀ + w₁x₁ + … + w₆x₆. For each training board the error V_train(b) − V̂(b) nudges every weight in proportion to its feature:
          <b> wᵢ ← wᵢ + η (V_train(b) − V̂(b)) xᵢ</b>. Features here are piece counts scaled to 0–1. Watch the squared error fall as the
          weights settle.
        </>
      }
    >
      <div className="controls" style={{ marginBottom: '1rem' }}>
        <Slider label="Learning rate η" value={eta} min={0.01} max={0.6} step={0.01} onChange={setEta} format={(v) => f(v, 2)} />
        <button className="btn btn--sm" onClick={() => setSteps((s) => Math.min(sim.length - 1, s + 1))}>
          Train on one board
        </button>
        <button className="btn btn--sm" onClick={() => setSteps((s) => Math.min(sim.length - 1, s + 50))}>
          Train on 50 boards
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => setSteps(0)}>
          Reset
        </button>
      </div>
      <div className="viz-grid">
        <div>
          <div className="ctl__label" style={{ marginBottom: '0.3rem' }}>
            Squared error per training board
          </div>
          <div className="plot-wrap">
            <Plot xDomain={[0, 400]} yDomain={[0, Math.max(4, ...errs.slice(0, 20))]} height={230} xLabel="boards seen">
              {(s) => (
                <path
                  d={errs.map((e, i) => `${i ? 'L' : 'M'}${s.x(i)} ${s.y(Math.min(e, s.yd[1]))}`).join('')}
                  fill="none"
                  stroke="var(--ultra)"
                  strokeWidth={1.4}
                />
              )}
            </Plot>
          </div>
        </div>
        <div className="viz-side">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Weight</th>
                  <th className="n">xᵢ</th>
                  <th className="n">now</th>
                  <th className="n">next</th>
                </tr>
              </thead>
              <tbody>
                {cur.w.map((wi, i) => (
                  <tr key={i}>
                    <td>{i === 0 ? 'w₀ bias' : `w${'₁₂₃₄₅₆'[i - 1]} ${FEATS[i - 1].slice(3)}`}</td>
                    <td className="n">{fx(cur.x[i], 2)}</td>
                    <td className="n">{fx(wi, 2)}</td>
                    <td className="n" style={{ color: nextW[i] > wi ? 'var(--viridian)' : nextW[i] < wi ? 'var(--rose)' : undefined }}>
                      {fx(nextW[i], 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="readout">
            <dt>Board</dt>
            <dd>#{steps + 1}</dd>
            <dt>V_train(b)</dt>
            <dd>{fx(cur.vt, 3)}</dd>
            <dt>V̂(b)</dt>
            <dd>{fx(cur.vh, 3)}</dd>
            <dt>error</dt>
            <dd style={{ color: Math.abs(cur.err) > 0.5 ? 'var(--rose)' : 'var(--viridian)' }}>{fx(cur.err, 3)}</dd>
          </dl>
        </div>
      </div>
    </Figure>
  );
}
