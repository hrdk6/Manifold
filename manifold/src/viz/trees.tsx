import { M } from '../components/Math';
import { fx } from '../lib/fmt';
import { type AttrScore, type CatData, type TreeNode } from '../lib/tree';

/** Draw an ID3 tree (categorical splits) as an SVG diagram. */
export function CatTreeDiagram({ root, data }: { root: TreeNode; data: CatData }) {
  type Item = { n: TreeNode; x: number; y: number; px?: number; py?: number; edge?: string };
  const items: Item[] = [];
  const leafCount = (n: TreeNode): number => (n.leaf !== undefined ? 1 : n.split!.children.reduce((s, c) => s + leafCount(c.node), 0));
  const total = leafCount(root);
  const colW = 120;
  const W = Math.max(380, total * colW);
  const levelH = 92;
  let cursor = 0;
  const place = (n: TreeNode, d: number, px?: number, py?: number, edge?: string): number => {
    const y = 30 + d * levelH;
    if (n.leaf !== undefined) {
      const x = cursor * colW + colW / 2 + (W - total * colW) / 2;
      cursor++;
      items.push({ n, x, y, px, py, edge });
      return x;
    }
    const idx = items.length;
    items.push({ n, x: 0, y, px, py, edge });
    const xs = n.split!.children.map((c) => place(c.node, d + 1, undefined, undefined, c.value));
    const x = (xs[0] + xs[xs.length - 1]) / 2;
    items[idx].x = x;
    // set parent coords for children
    for (const it of items) if (it.px === undefined && it.y === y + levelH && it.edge !== undefined && !it.n.id.startsWith('done')) {
      it.px = x;
      it.py = y;
    }
    return x;
  };
  place(root, 0);
  const H = Math.max(...items.map((i) => i.y)) + 40;
  const classes = [...new Set(data.rows.map((r) => r.y))];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tree-svg" style={{ maxWidth: W }} role="img" aria-label="Decision tree diagram">
      {items.map((it, i) =>
        it.px !== undefined ? (
          <g key={`e${i}`}>
            <line className="tedge" x1={it.px} y1={it.py! + 16} x2={it.x} y2={it.y - 16} />
            <rect x={(it.px + it.x) / 2 - 34} y={(it.py! + it.y) / 2 - 10} width={68} height={18} rx={9} fill="var(--surface)" />
            <text className="tedge-label" x={(it.px + it.x) / 2} y={(it.py! + it.y) / 2 + 3} textAnchor="middle">
              {it.edge}
            </text>
          </g>
        ) : null,
      )}
      {items.map((it, i) => {
        if (it.n.leaf !== undefined) {
          const ci = classes.indexOf(it.n.leaf);
          return (
            <g key={i} className="tnode tleaf">
              <rect
                x={it.x - 46}
                y={it.y - 16}
                width={92}
                height={32}
                rx={16}
                style={{ fill: ci === 0 ? 'var(--ultra)' : 'var(--rose)', stroke: 'none' }}
              />
              <text x={it.x} y={it.y + 4.5} textAnchor="middle" style={{ fill: 'var(--surface)', fontWeight: 750, fontSize: 13 }}>
                {it.n.leaf}
              </text>
            </g>
          );
        }
        return (
          <g key={i} className="tnode">
            <rect x={it.x - 60} y={it.y - 18} width={120} height={36} rx={8} />
            <text x={it.x} y={it.y + 1} textAnchor="middle" style={{ fontWeight: 750, fontSize: 13 }}>
              {it.n.split!.name}?
            </text>
            <text x={it.x} y={it.y + 13} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--ink-3)' }}>
              H = {fx(it.n.impurity, 3)}, n = {it.n.rows.length}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Table of candidate attributes at one node with their gains. */
export function GainTable({ scores, crit, parent, best }: { scores: AttrScore[]; crit: 'entropy' | 'gini'; parent: number; best?: number }) {
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Branches (class counts → {crit === 'entropy' ? 'entropy' : 'Gini'})</th>
            <th className="n">Weighted</th>
            <th className="n">{crit === 'entropy' ? 'Information gain' : 'Gini decrease'}</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => (
            <tr key={s.attr} data-hl={s.attr === best ? 'true' : undefined}>
              <td style={{ fontWeight: 700 }}>{s.name}</td>
              <td>
                {s.branches.map((b) => (
                  <div key={b.value} style={{ whiteSpace: 'nowrap' }}>
                    {b.value}: [{Object.values(b.counts).join(', ')}] → {fx(b.impurity, 3)}
                  </div>
                ))}
              </td>
              <td className="n">{fx(s.weighted, 4)}</td>
              <td className="n" style={{ fontWeight: s.attr === best ? 800 : undefined }}>
                {fx(s.gain, 4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '0.5rem 0.8rem', fontSize: '0.78rem', color: 'var(--ink-3)', borderTop: '1px solid var(--rule)' }}>
        Parent {crit === 'entropy' ? 'entropy' : 'Gini'} = {fx(parent, 4)}. Gain = parent − weighted child impurity. <M>{'\\text{Weighted} = \\sum_v \\tfrac{|S_v|}{|S|} H(S_v)'}</M>
      </div>
    </div>
  );
}
