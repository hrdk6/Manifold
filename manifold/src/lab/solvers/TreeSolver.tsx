import { useMemo, useState } from 'react';
import { M, MB } from '../../components/Math';
import { Seg } from '../../components/controls';
import { catPresets, type CatPresetId } from '../../content/data/tables';
import { fx } from '../../lib/fmt';
import { buildTree, treeRules, type TreeNode } from '../../lib/tree';
import { CatTreeDiagram, GainTable } from '../../viz/trees';
import { CatTableEditor, type CatTable } from '../inputs';
import { InputCard, Presets, Result, Work, WorkStep } from '../ui';

export default function TreeSolver() {
  const [preset, setPreset] = useState<CatPresetId | null>('laptop');
  const [table, setTable] = useState<CatTable>(structuredClone(catPresets.laptop.data));
  const [crit, setCrit] = useState<'entropy' | 'gini'>('entropy');
  const tree = useMemo(() => buildTree(table, crit), [table, crit]);
  const nodes: { n: TreeNode; path: string[] }[] = [];
  const walk = (n: TreeNode, path: string[]) => {
    nodes.push({ n, path });
    n.split?.children.forEach((c) => walk(c.node, [...path, `${n.split!.name} = ${c.value}`]));
  };
  walk(tree, []);
  const classes = [...new Set(table.rows.map((r) => r.y))];
  const impTex = (counts: Record<string, number>) => {
    const n = Object.values(counts).reduce((a, b) => a + b, 0);
    const parts = Object.values(counts).filter((c) => c > 0);
    if (crit === 'entropy') return parts.map((c) => `\\tfrac{${c}}{${n}}\\log_2\\tfrac{${c}}{${n}}`).join(' + ');
    return parts.map((c) => `(\\tfrac{${c}}{${n}})^2`).join(' + ');
  };
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(catPresets) as CatPresetId[]).map((id) => ({ id, label: catPresets[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setTable(structuredClone(catPresets[id].data));
          }}
        />
        <CatTableEditor value={table} onChange={(t) => { setPreset(null); setTable(t); }} />
        <Seg
          label="Splitting criterion"
          value={crit}
          onChange={setCrit}
          options={[
            { value: 'entropy', label: 'Entropy / information gain (ID3)' },
            { value: 'gini', label: 'Gini impurity (CART)' },
          ]}
        />
      </InputCard>
      <Work>
        <WorkStep title="Formulas">
          {crit === 'entropy' ? (
            <MB>{'H(S) = -\\sum_i p_i \\log_2 p_i \\qquad \\text{Gain}(S, A) = H(S) - \\sum_{v} \\frac{|S_v|}{|S|} H(S_v)'}</MB>
          ) : (
            <MB>{'\\text{Gini}(S) = 1 - \\sum_i p_i^2 \\qquad \\Delta = \\text{Gini}(S) - \\sum_{v} \\frac{|S_v|}{|S|} \\text{Gini}(S_v)'}</MB>
          )}
          <p>Classes: {classes.join(', ')}. The attribute with the largest gain becomes the test at each node.</p>
        </WorkStep>
        {nodes
          .filter(({ n }) => n.leaf === undefined)
          .map(({ n, path }) => (
            <WorkStep key={n.id} title={path.length ? `Node: ${path.join(' AND ')}` : 'Root node (all examples)'}>
              <p>
                {n.rows.length} examples, class counts {Object.entries(n.counts).map(([c, v]) => `${c} = ${v}`).join(', ')}.
              </p>
              <MB>{`${crit === 'entropy' ? 'H' : '\\text{Gini}'}(S) = ${crit === 'entropy' ? '-(' : '1 - ('}${impTex(n.counts)}) = ${fx(n.impurity, 4)}`}</MB>
              <GainTable scores={n.scores} crit={crit} parent={n.impurity} best={n.split!.attr} />
              <p>
                <strong>Split on {n.split!.name}</strong> (gain {fx(n.scores.find((s) => s.attr === n.split!.attr)!.gain, 4)}).{' '}
                {n.split!.children.map((c) => (c.node.leaf !== undefined ? `${n.split!.name} = ${c.value} → leaf “${c.node.leaf}” (${c.node.reason})` : `${n.split!.name} = ${c.value} → split further`)).join('; ')}.
              </p>
            </WorkStep>
          ))}
        <WorkStep title="The finished tree">
          <CatTreeDiagram root={tree} data={table} />
          <ul style={{ marginTop: '0.8rem' }}>
            {treeRules(tree).map((r) => (
              <li key={r} style={{ fontFamily: 'var(--font-code)', fontSize: '0.85rem' }}>
                {r}
              </li>
            ))}
          </ul>
        </WorkStep>
        <Result label="Root attribute">
          {tree.split ? tree.split.name : `No split needed: every example is ${tree.leaf}`}
          {tree.split && (
            <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.9 }}>
              <M>{`\\text{Gain} = ${fx(tree.scores.find((s) => s.attr === tree.split!.attr)!.gain, 4)}`}</M>; the tree has {nodes.filter((x) => x.n.leaf !== undefined).length} leaves.
            </div>
          )}
        </Result>
      </Work>
    </>
  );
}
