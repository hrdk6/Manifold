import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconNext, IconPause, IconPlay, IconPrev, IconReset } from './icons';

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  width,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => ReactNode;
  width?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="ctl">
      <span className="ctl__label">
        <span>{label}</span>
        <span className="ctl__value">{format ? format(value) : value}</span>
      </span>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${fill}%`, width }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Seg<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: ReactNode;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  const seg = (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
  if (!label) return seg;
  return (
    <div className="ctl">
      <span className="ctl__label">{label}</span>
      {seg}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: ReactNode;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="ctl">
      {label && <span className="ctl__label">{label}</span>}
      <select className="field" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Step-through state for algorithm traces with optional autoplay. */
export function useStepper(total: number, interval = 1100) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    setI((v) => Math.min(v, Math.max(0, total - 1)));
  }, [total]);

  useEffect(() => {
    if (!playing) return;
    ref.current = window.setInterval(() => {
      setI((v) => {
        if (v >= total - 1) {
          setPlaying(false);
          return v;
        }
        return v + 1;
      });
    }, interval);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [playing, total, interval]);

  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);
  const next = useCallback(() => setI((v) => Math.min(total - 1, v + 1)), [total]);
  const reset = useCallback(() => {
    setPlaying(false);
    setI(0);
  }, []);
  const toggle = useCallback(() => {
    setI((v) => (v >= total - 1 ? 0 : v));
    setPlaying((p) => !p);
  }, [total]);
  return { i, setI, playing, setPlaying, prev, next, reset, toggle, total };
}

export function StepperBar({
  s,
  labels,
  extra,
}: {
  s: ReturnType<typeof useStepper>;
  labels?: (i: number) => ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="stepper">
      <button className="icon-btn" onClick={s.reset} aria-label="Restart">
        <IconReset />
      </button>
      <button className="icon-btn" onClick={s.prev} disabled={s.i === 0} aria-label="Previous step">
        <IconPrev />
      </button>
      <button className="btn btn--primary btn--sm" onClick={s.toggle} style={{ minWidth: '5.5rem' }}>
        {s.playing ? <IconPause /> : <IconPlay />}
        {s.playing ? 'Pause' : s.i >= s.total - 1 ? 'Replay' : 'Play'}
      </button>
      <button className="icon-btn" onClick={s.next} disabled={s.i >= s.total - 1} aria-label="Next step">
        <IconNext />
      </button>
      <span className="stepper__count">{labels ? labels(s.i) : `Step ${s.i + 1} of ${s.total}`}</span>
      {extra}
    </div>
  );
}

/** Parse "1, 2, 3" or whitespace-separated numbers. */
export function parseNums(s: string): number[] {
  return s
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(Number)
    .filter((v) => Number.isFinite(v));
}

/** Parse lines of "x, y" pairs. */
export function parsePairs(s: string): number[][] {
  return s
    .split(/\n|\)\s*,?\s*\(/)
    .map((line) => parseNums(line.replace(/[()]/g, ' ')))
    .filter((p) => p.length >= 2)
    .map((p) => p.slice(0, 2));
}
