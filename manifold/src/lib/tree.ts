import { entropy, gini, sum } from './math';

export interface CatData {
  attrs: string[];
  target: string;
  rows: { x: string[]; y: string }[];
}

export type Criterion = 'entropy' | 'gini';

export interface AttrScore {
  attr: number;
  name: string;
  branches: { value: string; counts: Record<string, number>; n: number; impurity: number }[];
  weighted: number;
  gain: number;
}

export interface TreeNode {
  id: string;
  depth: number;
  rows: number[];
  counts: Record<string, number>;
  impurity: number;
  /** scores for every candidate attribute at this node */
  scores: AttrScore[];
  split?: { attr: number; name: string; children: { value: string; node: TreeNode }[] };
  leaf?: string;
  reason?: string;
}

export function classesOf(data: CatData) {
  const cls: string[] = [];
  for (const r of data.rows) if (!cls.includes(r.y)) cls.push(r.y);
  return cls;
}

function countBy(data: CatData, rows: number[], classes: string[]) {
  const c: Record<string, number> = {};
  for (const k of classes) c[k] = 0;
  for (const i of rows) c[data.rows[i].y]++;
  return c;
}

const imp = (crit: Criterion, counts: Record<string, number>) =>
  crit === 'entropy' ? entropy(Object.values(counts)) : gini(Object.values(counts));

export function scoreAttrs(data: CatData, rows: number[], avail: number[], crit: Criterion, classes: string[]): AttrScore[] {
  const parent = imp(crit, countBy(data, rows, classes));
  return avail.map((a) => {
    const values: string[] = [];
    for (const i of rows) if (!values.includes(data.rows[i].x[a])) values.push(data.rows[i].x[a]);
    const branches = values.map((v) => {
      const sub = rows.filter((i) => data.rows[i].x[a] === v);
      const counts = countBy(data, sub, classes);
      return { value: v, counts, n: sub.length, impurity: imp(crit, counts) };
    });
    const weighted = sum(branches.map((b) => (b.n / rows.length) * b.impurity));
    return { attr: a, name: data.attrs[a], branches, weighted, gain: parent - weighted };
  });
}

export function buildTree(data: CatData, crit: Criterion = 'entropy', maxDepth = 8): TreeNode {
  const classes = classesOf(data);
  let counter = 0;
  const rec = (rows: number[], avail: number[], depth: number): TreeNode => {
    const counts = countBy(data, rows, classes);
    const impurity = imp(crit, counts);
    const node: TreeNode = { id: `n${counter++}`, depth, rows, counts, impurity, scores: [] };
    const present = classes.filter((c) => counts[c] > 0);
    const majority = classes.reduce((a, b) => (counts[b] > counts[a] ? b : a), classes[0]);
    if (present.length <= 1) {
      node.leaf = present[0] ?? majority;
      node.reason = 'pure node';
      return node;
    }
    if (avail.length === 0 || depth >= maxDepth) {
      node.leaf = majority;
      node.reason = avail.length === 0 ? 'no attributes left — majority class' : 'depth limit — majority class';
      return node;
    }
    node.scores = scoreAttrs(data, rows, avail, crit, classes);
    let best = node.scores[0];
    for (const s of node.scores) if (s.gain > best.gain + 1e-12) best = s;
    if (best.gain <= 1e-12) {
      node.leaf = majority;
      node.reason = 'no attribute reduces impurity — majority class';
      return node;
    }
    const rest = avail.filter((a) => a !== best.attr);
    node.split = {
      attr: best.attr,
      name: best.name,
      children: best.branches.map((b) => ({
        value: b.value,
        node: rec(
          rows.filter((i) => data.rows[i].x[best.attr] === b.value),
          rest,
          depth + 1,
        ),
      })),
    };
    return node;
  };
  return rec(
    data.rows.map((_, i) => i),
    data.attrs.map((_, i) => i),
    0,
  );
}

export function walk(node: TreeNode, fn: (n: TreeNode) => void) {
  fn(node);
  node.split?.children.forEach((c) => walk(c.node, fn));
}

export function treeRules(node: TreeNode, path: string[] = []): string[] {
  if (node.leaf !== undefined) return [`IF ${path.length ? path.join(' AND ') : 'TRUE'} THEN ${node.leaf}`];
  return node.split!.children.flatMap((c) => treeRules(c.node, [...path, `${node.split!.name} = ${c.value}`]));
}
