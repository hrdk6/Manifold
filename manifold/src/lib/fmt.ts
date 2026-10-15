/** Round for display: up to `d` decimals, trailing zeros trimmed. */
export function f(v: number, d = 4): string {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : v < 0 ? '−∞' : '—';
  const r = Number(v.toFixed(d));
  const s = Object.is(r, -0) ? '0' : String(r);
  return s.replace('-', '−');
}

/** Fixed decimals (keeps zeros) — used in tables where columns should align. */
export function fx(v: number, d = 3): string {
  if (!Number.isFinite(v)) return '—';
  const s = v.toFixed(d);
  return (s === (-0).toFixed(d) ? (0).toFixed(d) : s).replace('-', '−');
}

/** Same as f but returns LaTeX-safe minus. */
export function tf(v: number, d = 4): string {
  if (!Number.isFinite(v)) return '\\infty';
  const r = Number(v.toFixed(d));
  return String(Object.is(r, -0) ? 0 : r);
}

export function pct(v: number, d = 1) {
  return `${f(v * 100, d)}%`;
}

/** LaTeX for a signed term, e.g. sgn(-3) → "- 3". */
export function sgnTerm(v: number, d = 4) {
  return v < 0 ? `- ${tf(-v, d)}` : `+ ${tf(v, d)}`;
}

export function plural(n: number, w: string, p = w + 's') {
  return `${n} ${n === 1 ? w : p}`;
}
