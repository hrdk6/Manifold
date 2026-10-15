/**
 * Concept learning over conjunctive hypotheses (Mitchell, ch. 2).
 * A hypothesis is a tuple of constraints: '∅' (no value acceptable), '?' (any value) or a specific value.
 */
export const PHI = '∅';
export const ANY = '?';

export type Hyp = string[];

export interface ConceptData {
  attrs: string[];
  target: string;
  rows: { x: string[]; y: boolean; label?: string }[];
  /** Optional full attribute domains; otherwise derived from data. */
  domains?: string[][];
}

export const hypStr = (h: Hyp) => `⟨${h.join(', ')}⟩`;

export function covers(h: Hyp, x: string[]) {
  for (let i = 0; i < h.length; i++) {
    if (h[i] === PHI) return false;
    if (h[i] !== ANY && h[i] !== x[i]) return false;
  }
  return true;
}

/** h1 ≥g h2 : every instance satisfying h2 also satisfies h1. */
export function moreGeneralOrEqual(h1: Hyp, h2: Hyp) {
  if (h2.some((c) => c === PHI)) return true;
  if (h1.some((c) => c === PHI)) return false;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] === ANY) continue;
    if (h1[i] !== h2[i]) return false;
  }
  return true;
}

export const sameHyp = (a: Hyp, b: Hyp) => a.length === b.length && a.every((v, i) => v === b[i]);

export const moreGeneral = (h1: Hyp, h2: Hyp) => moreGeneralOrEqual(h1, h2) && !sameHyp(h1, h2);

export function consistent(h: Hyp, x: string[], y: boolean) {
  return covers(h, x) === y;
}

export function domainsOf(data: ConceptData) {
  if (data.domains) return data.domains;
  return data.attrs.map((_, i) => {
    const seen: string[] = [];
    for (const r of data.rows) if (!seen.includes(r.x[i])) seen.push(r.x[i]);
    return seen;
  });
}

/* ------------------------------------------------------------------------ */
/* FIND-S                                                                    */
/* ------------------------------------------------------------------------ */

export interface FindSStep {
  index: number;
  x: string[];
  y: boolean;
  before: Hyp;
  after: Hyp;
  changed: number[];
  note: string;
}

export function findS(data: ConceptData) {
  let h: Hyp = data.attrs.map(() => PHI);
  const steps: FindSStep[] = [];
  data.rows.forEach((r, idx) => {
    const before = h.slice();
    const changed: number[] = [];
    let note: string;
    if (!r.y) {
      note = 'Negative example — Find-S ignores it, h is unchanged.';
    } else if (covers(h, r.x)) {
      note = 'Positive example already covered by h — no change needed.';
    } else {
      h = h.map((c, i) => {
        if (c === PHI) {
          changed.push(i);
          return r.x[i];
        }
        if (c !== ANY && c !== r.x[i]) {
          changed.push(i);
          return ANY;
        }
        return c;
      });
      note = before.every((c) => c === PHI)
        ? 'First positive example: replace every ∅ with the observed value.'
        : `Generalise the attribute${changed.length > 1 ? 's' : ''} that disagree (${changed.map((i) => data.attrs[i]).join(', ')}) to “?”.`;
    }
    steps.push({ index: idx, x: r.x, y: r.y, before, after: h.slice(), changed, note });
  });
  const violations = data.rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !r.y && covers(h, r.x))
    .map(({ i }) => i);
  return { final: h, steps, violations };
}

/* ------------------------------------------------------------------------ */
/* CANDIDATE-ELIMINATION                                                     */
/* ------------------------------------------------------------------------ */

export interface CEAEvent {
  kind: 'removeG' | 'removeS' | 'generalizeS' | 'specializeG' | 'dropCandidate' | 'prune' | 'keep' | 'info';
  text: string;
  hyp?: Hyp;
}

export interface CEAStep {
  index: number;
  x: string[];
  y: boolean;
  S: Hyp[];
  G: Hyp[];
  Sbefore: Hyp[];
  Gbefore: Hyp[];
  events: CEAEvent[];
}

const uniq = (hs: Hyp[]) => {
  const out: Hyp[] = [];
  for (const h of hs) if (!out.some((o) => sameHyp(o, h))) out.push(h);
  return out;
};

export function candidateElimination(data: ConceptData) {
  const n = data.attrs.length;
  const doms = domainsOf(data);
  let S: Hyp[] = [new Array(n).fill(PHI)];
  let G: Hyp[] = [new Array(n).fill(ANY)];
  const steps: CEAStep[] = [];

  data.rows.forEach((r, idx) => {
    const Sbefore = S.map((h) => h.slice());
    const Gbefore = G.map((h) => h.slice());
    const ev: CEAEvent[] = [];

    if (r.y) {
      // Positive: prune G, generalise S
      const keptG: Hyp[] = [];
      for (const g of G) {
        if (covers(g, r.x)) keptG.push(g);
        else ev.push({ kind: 'removeG', hyp: g, text: `Remove ${hypStr(g)} from G — it does not cover this positive example.` });
      }
      G = keptG;
      let newS: Hyp[] = [];
      for (const s of S) {
        if (covers(s, r.x)) {
          newS.push(s);
          continue;
        }
        const h = s.map((c, i) => (c === PHI ? r.x[i] : c !== ANY && c !== r.x[i] ? ANY : c));
        if (G.some((g) => moreGeneralOrEqual(g, h))) {
          ev.push({ kind: 'generalizeS', hyp: h, text: `Generalise ${hypStr(s)} minimally to ${hypStr(h)} so it covers the example.` });
          newS.push(h);
        } else {
          ev.push({ kind: 'dropCandidate', hyp: h, text: `Minimal generalisation ${hypStr(h)} is not below any member of G — dropped.` });
        }
      }
      newS = uniq(newS);
      const pruned = newS.filter((h) => !newS.some((o) => !sameHyp(o, h) && moreGeneral(h, o)));
      for (const h of newS) if (!pruned.some((p) => sameHyp(p, h))) ev.push({ kind: 'prune', hyp: h, text: `Remove ${hypStr(h)} from S — it is more general than another member of S.` });
      S = pruned;
      if (ev.length === 0) ev.push({ kind: 'info', text: 'S already covers the example and every member of G is consistent — no change.' });
    } else {
      // Negative: prune S, specialise G
      const keptS: Hyp[] = [];
      for (const s of S) {
        if (!covers(s, r.x)) keptS.push(s);
        else ev.push({ kind: 'removeS', hyp: s, text: `Remove ${hypStr(s)} from S — it wrongly covers this negative example.` });
      }
      S = keptS;
      let newG: Hyp[] = [];
      for (const g of G) {
        if (!covers(g, r.x)) {
          newG.push(g);
          ev.push({ kind: 'keep', hyp: g, text: `${hypStr(g)} already rejects the example — keep it.` });
          continue;
        }
        ev.push({ kind: 'specializeG', hyp: g, text: `${hypStr(g)} covers the negative example, so replace it by its minimal specialisations:` });
        for (let i = 0; i < n; i++) {
          if (g[i] !== ANY) continue;
          for (const v of doms[i]) {
            if (v === r.x[i]) continue;
            const h = g.slice();
            h[i] = v;
            if (S.some((s) => moreGeneralOrEqual(h, s))) {
              ev.push({ kind: 'keep', hyp: h, text: `  ${hypStr(h)} — more general than S, keep.` });
              newG.push(h);
            } else {
              ev.push({ kind: 'dropCandidate', hyp: h, text: `  ${hypStr(h)} — not more general than S (would reject a known positive), drop.` });
            }
          }
        }
      }
      newG = uniq(newG);
      const pruned = newG.filter((h) => !newG.some((o) => !sameHyp(o, h) && moreGeneral(o, h)));
      for (const h of newG) if (!pruned.some((p) => sameHyp(p, h))) ev.push({ kind: 'prune', hyp: h, text: `Remove ${hypStr(h)} from G — it is less general than another member of G.` });
      G = pruned;
    }

    steps.push({ index: idx, x: r.x, y: r.y, S: S.map((h) => h.slice()), G: G.map((h) => h.slice()), Sbefore, Gbefore, events: ev });
  });

  return { S, G, steps, versionSpace: enumerateVersionSpace(S, G, doms) };
}

/** All hypotheses h with some s ≤ h ≤ some g (conjunctive space), capped for display. */
export function enumerateVersionSpace(S: Hyp[], G: Hyp[], doms: string[][], cap = 64): Hyp[] {
  if (S.length === 0 || G.length === 0) return [];
  const out: Hyp[] = [];
  for (const s of S) {
    if (s.some((c) => c === PHI)) continue;
    // hypotheses between s and some g: each attribute either keeps s's value or becomes '?'
    const idxs = s.map((c, i) => (c !== ANY ? i : -1)).filter((i) => i >= 0);
    const total = 1 << idxs.length;
    for (let mask = 0; mask < total; mask++) {
      const h = s.slice();
      idxs.forEach((i, b) => {
        if (mask & (1 << b)) h[i] = ANY;
      });
      if (G.some((g) => moreGeneralOrEqual(g, h)) && !out.some((o) => sameHyp(o, h))) {
        out.push(h);
        if (out.length >= cap) return out;
      }
    }
  }
  void doms;
  return out.sort((a, b) => a.filter((c) => c === ANY).length - b.filter((c) => c === ANY).length);
}
