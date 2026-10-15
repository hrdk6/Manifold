/**
 * Okapi BM25 over an inverted index: the lexical half of hybrid search.
 * score(q, d) = Σ_t idf(t) · tf(t,d)(k1+1) / (tf(t,d) + k1(1 − b + b·|d|/avgdl))
 */

const STOP = new Set(
  `a an and are as at be been being but by can could did do does doing for from had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your
  also may might must shall us via per each both either whether yet thus hence therefore however although though because since within without between among about above below explain describe define discuss write give list state briefly short note notes what's whats`.split(/\s+/),
);

/** A light suffix-stripping stemmer; applied identically to queries and passages. */
export function stem(w: string): string {
  if (w.length <= 3 || /\d/.test(w)) return w;
  const rules: [RegExp, string][] = [
    [/ational$/, 'ate'],
    [/tional$/, 'tion'],
    [/ization$/, 'ize'],
    [/isation$/, 'ize'],
    [/ising$/, 'ize'],
    [/izing$/, 'ize'],
    [/ised$/, 'ize'],
    [/ized$/, 'ize'],
    [/iveness$/, 'ive'],
    [/fulness$/, 'ful'],
    [/ousness$/, 'ous'],
    [/alities$/, 'al'],
    [/ality$/, 'al'],
    [/ities$/, 'ity'],
    [/ies$/, 'y'],
    [/sses$/, 'ss'],
    [/ings$/, ''],
    [/ing$/, ''],
    [/edly$/, ''],
    [/ed$/, ''],
    [/ly$/, ''],
    [/ers$/, 'er'],
    [/es$/, 'e'],
    [/(?<!s)s$/, ''],
  ];
  for (const [re, rep] of rules) {
    if (re.test(w)) {
      const out = w.replace(re, rep);
      return out.length >= 3 ? out : w;
    }
  }
  return w;
}

export function tokenize(text: string): string[] {
  const s = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\\[a-z]+/g, (m) => ` ${m.slice(1)} `); // \sigma -> sigma
  const out: string[] = [];
  for (const raw of s.match(/[a-z0-9]+(?:[-'][a-z0-9]+)*/g) ?? []) {
    const parts = raw.split(/[-']/);
    if (parts.length > 1) {
      const joined = parts.join('');
      if (joined.length <= 12) out.push(joined); // k-means -> kmeans, k-nn -> knn
    }
    for (const p of parts) {
      if (p.length < 2 && !/\d/.test(p)) continue;
      if (STOP.has(p)) continue;
      out.push(stem(p));
    }
  }
  return out;
}

export interface Bm25Hit {
  idx: number;
  score: number;
}

export class Bm25 {
  private postings = new Map<string, { idx: number; tf: number }[]>();
  private lens: number[] = [];
  private avg = 0;
  readonly k1 = 1.2;
  readonly b = 0.75;

  constructor(texts: string[]) {
    texts.forEach((t, idx) => {
      const toks = tokenize(t);
      this.lens.push(toks.length);
      const tf = new Map<string, number>();
      for (const w of toks) tf.set(w, (tf.get(w) ?? 0) + 1);
      for (const [w, n] of tf) {
        let p = this.postings.get(w);
        if (!p) this.postings.set(w, (p = []));
        p.push({ idx, tf: n });
      }
    });
    this.avg = this.lens.reduce((s, v) => s + v, 0) / Math.max(1, this.lens.length);
  }

  get size() {
    return this.lens.length;
  }

  idf(term: string) {
    const n = this.postings.get(term)?.length ?? 0;
    return Math.log(1 + (this.lens.length - n + 0.5) / (n + 0.5));
  }

  search(query: string, k: number, allow?: (idx: number) => boolean): Bm25Hit[] {
    const terms = [...new Set(tokenize(query))];
    const scores = new Map<number, number>();
    for (const t of terms) {
      const p = this.postings.get(t);
      if (!p) continue;
      const idf = this.idf(t);
      for (const { idx, tf } of p) {
        if (allow && !allow(idx)) continue;
        const norm = tf + this.k1 * (1 - this.b + (this.b * this.lens[idx]) / this.avg);
        scores.set(idx, (scores.get(idx) ?? 0) + (idf * (tf * (this.k1 + 1))) / norm);
      }
    }
    return [...scores.entries()]
      .map(([idx, score]) => ({ idx, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

/** Query terms (stemmed) present in a passage, for highlighting. */
export function matchTerms(query: string) {
  return new Set(tokenize(query));
}
