import { useEffect, useState } from 'react';
import { IconPlus, IconTrash } from '../components/icons';
import { parseNums, parsePairs } from '../components/controls';

/* ------------------------------------------------------------------------ */
/* Categorical table editor (attributes + rows + label)                      */
/* ------------------------------------------------------------------------ */

export interface CatTable {
  attrs: string[];
  target: string;
  rows: { x: string[]; y: string }[];
}

export function CatTableEditor({ value, onChange, labelOptions, noLabel = false }: { value: CatTable; onChange: (t: CatTable) => void; labelOptions?: string[]; noLabel?: boolean }) {
  const set = (fn: (t: CatTable) => CatTable) => onChange(fn(structuredClone(value)));
  return (
    <div className="input-grid">
      <table>
        <thead>
          <tr>
            <th>#</th>
            {value.attrs.map((a, i) => (
              <th key={i}>
                <input
                  value={a}
                  aria-label={`Attribute ${i + 1} name`}
                  onChange={(e) => set((t) => ({ ...t, attrs: t.attrs.map((v, j) => (j === i ? e.target.value : v)) }))}
                  style={{ fontWeight: 700 }}
                />
              </th>
            ))}
            {!noLabel && (
              <th>
                <input value={value.target} aria-label="Target name" onChange={(e) => set((t) => ({ ...t, target: e.target.value }))} style={{ fontWeight: 700 }} />
              </th>
            )}
            <th />
          </tr>
        </thead>
        <tbody>
          {value.rows.map((r, ri) => (
            <tr key={ri}>
              <td style={{ color: 'var(--ink-3)', fontSize: '0.78rem', fontWeight: 650 }}>{ri + 1}</td>
              {r.x.map((v, ci) => (
                <td key={ci}>
                  <input
                    value={v}
                    aria-label={`Row ${ri + 1} ${value.attrs[ci]}`}
                    onChange={(e) => set((t) => ({ ...t, rows: t.rows.map((row, k) => (k === ri ? { ...row, x: row.x.map((c, m) => (m === ci ? e.target.value : c)) } : row)) }))}
                  />
                </td>
              ))}
              {!noLabel && (
                <td>
                  {labelOptions ? (
                    <select
                      value={r.y}
                      aria-label={`Row ${ri + 1} label`}
                      onChange={(e) => set((t) => ({ ...t, rows: t.rows.map((row, k) => (k === ri ? { ...row, y: e.target.value } : row)) }))}
                    >
                      {labelOptions.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={r.y}
                      aria-label={`Row ${ri + 1} label`}
                      onChange={(e) => set((t) => ({ ...t, rows: t.rows.map((row, k) => (k === ri ? { ...row, y: e.target.value } : row)) }))}
                    />
                  )}
                </td>
              )}
              <td>
                <button className="icon-btn" style={{ width: '1.9rem', height: '1.9rem' }} aria-label={`Delete row ${ri + 1}`} onClick={() => set((t) => ({ ...t, rows: t.rows.filter((_, k) => k !== ri) }))}>
                  <IconTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
        <button
          className="btn btn--sm"
          onClick={() => set((t) => ({ ...t, rows: [...t.rows, { x: t.rows[t.rows.length - 1]?.x.slice() ?? t.attrs.map(() => ''), y: t.rows[t.rows.length - 1]?.y ?? (labelOptions?.[0] ?? '') }] }))}
        >
          <IconPlus /> Add row
        </button>
        <button className="btn btn--sm btn--ghost" onClick={() => set((t) => ({ attrs: [...t.attrs, `A${t.attrs.length + 1}`], target: t.target, rows: t.rows.map((r) => ({ ...r, x: [...r.x, ''] })) }))}>
          <IconPlus /> Add attribute
        </button>
        {value.attrs.length > 1 && (
          <button className="btn btn--sm btn--ghost" onClick={() => set((t) => ({ attrs: t.attrs.slice(0, -1), target: t.target, rows: t.rows.map((r) => ({ ...r, x: r.x.slice(0, -1) })) }))}>
            Remove last attribute
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Text inputs that parse to numbers / points                                */
/* ------------------------------------------------------------------------ */

export function NumbersField({ label, value, onChange, rows = 1, hint }: { label: string; value: number[]; onChange: (v: number[]) => void; rows?: number; hint?: string }) {
  const [text, setText] = useState(value.join(', '));
  useEffect(() => {
    setText((t) => (parseNums(t).join(',') === value.join(',') ? t : value.join(', ')));
  }, [value]);
  return (
    <label className="ctl" style={{ flex: '1 1 16rem' }}>
      <span className="ctl__label">
        <span>{label}</span>
        {hint && <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>{hint}</span>}
      </span>
      <textarea
        className="field"
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseNums(e.target.value));
        }}
      />
    </label>
  );
}

export function PointsField({ label, value, onChange, rows = 5 }: { label: string; value: number[][]; onChange: (v: number[][]) => void; rows?: number }) {
  const fmt = (v: number[][]) => v.map((p) => `${p[0]}, ${p[1]}`).join('\n');
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    setText((t) => (fmt(parsePairs(t)) === fmt(value) ? t : fmt(value)));
  }, [value]);
  return (
    <label className="ctl" style={{ flex: '1 1 14rem' }}>
      <span className="ctl__label">
        <span>{label}</span>
        <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>one “x, y” per line</span>
      </span>
      <textarea
        className="field"
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parsePairs(e.target.value));
        }}
      />
    </label>
  );
}

export function NumberInput({ label, value, onChange, step = 1, min, max, width = '6rem' }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; width?: string }) {
  return (
    <label className="ctl">
      <span className="ctl__label">{label}</span>
      <input
        className="field"
        type="number"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        max={max}
        style={{ width }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
