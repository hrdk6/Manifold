import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react';
import { useThemeName } from '../lib/theme';

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export interface Scales {
  x: (v: number) => number;
  y: (v: number) => number;
  ix: (px: number) => number;
  iy: (py: number) => number;
  w: number; // inner width
  h: number; // inner height
  W: number;
  H: number;
  m: { t: number; r: number; b: number; l: number };
  xd: [number, number];
  yd: [number, number];
}

export function niceTicks(lo: number, hi: number, count = 6) {
  const span = hi - lo;
  if (span <= 0) return [lo];
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

const fmtTick = (v: number) => {
  const a = Math.abs(v);
  if (a >= 10000) return `${Math.round(v / 1000)}k`;
  if (a >= 1000) return `${Number((v / 1000).toFixed(1))}k`;
  return String(Number(v.toFixed(3))).replace('-', '−');
};

export interface PlotProps {
  xDomain: [number, number];
  yDomain: [number, number];
  height?: number;
  /** keep 1:1 data aspect (useful for geometry: PCA, distances) */
  equal?: boolean;
  margin?: Partial<Scales['m']>;
  grid?: boolean;
  axes?: boolean;
  xTicks?: number[] | number;
  yTicks?: number[] | number;
  xLabel?: string;
  yLabel?: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  /** draw into a canvas behind the SVG (decision regions, heatmaps) */
  layer?: (ctx: CanvasRenderingContext2D, s: Scales) => void;
  layerKey?: unknown;
  onPointer?: (kind: 'down' | 'move' | 'up' | 'leave', p: [number, number], e: RPE<SVGSVGElement>) => void;
  children?: (s: Scales) => ReactNode;
  className?: string;
  ariaLabel?: string;
  cursor?: string;
  maxWidth?: number;
}

export function Plot({
  xDomain,
  yDomain,
  height = 340,
  equal = false,
  margin,
  grid = true,
  axes = true,
  xTicks = 6,
  yTicks = 5,
  xLabel,
  yLabel,
  xFormat = fmtTick,
  yFormat = fmtTick,
  layer,
  layerKey,
  onPointer,
  children,
  className,
  ariaLabel,
  cursor,
  maxWidth,
}: PlotProps) {
  const [wrap, W0] = useSize<HTMLDivElement>();
  const W = Math.max(200, maxWidth ? Math.min(W0, maxWidth) : W0);
  const m = {
    t: margin?.t ?? 14,
    r: margin?.r ?? 14,
    b: margin?.b ?? (axes ? (xLabel ? 44 : 30) : 14),
    l: margin?.l ?? (axes ? (yLabel ? 54 : 40) : 14),
  };
  const s: Scales = useMemo(() => {
    let xd = xDomain;
    let yd = yDomain;
    const H = height;
    const w = W - m.l - m.r;
    const h = H - m.t - m.b;
    if (equal) {
      const k = Math.min(w / (xd[1] - xd[0]), h / (yd[1] - yd[0]));
      const cx = (xd[0] + xd[1]) / 2;
      const cy = (yd[0] + yd[1]) / 2;
      xd = [cx - w / k / 2, cx + w / k / 2];
      yd = [cy - h / k / 2, cy + h / k / 2];
    }
    const x = (v: number) => m.l + ((v - xd[0]) / (xd[1] - xd[0])) * w;
    const y = (v: number) => m.t + h - ((v - yd[0]) / (yd[1] - yd[0])) * h;
    const ix = (px: number) => xd[0] + ((px - m.l) / w) * (xd[1] - xd[0]);
    const iy = (py: number) => yd[0] + ((m.t + h - py) / h) * (yd[1] - yd[0]);
    return { x, y, ix, iy, w, h, W, H, m, xd, yd };
  }, [W, height, equal, xDomain[0], xDomain[1], yDomain[0], yDomain[1], m.l, m.r, m.t, m.b]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = useThemeName();
  useEffect(() => {
    if (!layer || !canvasRef.current || W0 === 0) return;
    const cv = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(s.w * dpr);
    cv.height = Math.round(s.h * dpr);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, -s.m.l * dpr, -s.m.t * dpr);
    ctx.clearRect(s.m.l, s.m.t, s.w, s.h);
    layer(ctx, s);
  }, [s, layerKey, W0, theme]);

  const xt = Array.isArray(xTicks) ? xTicks : niceTicks(s.xd[0], s.xd[1], xTicks);
  const yt = Array.isArray(yTicks) ? yTicks : niceTicks(s.yd[0], s.yd[1], yTicks);

  const toData = (e: RPE<SVGSVGElement>): [number, number] => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    return [s.ix(e.clientX - r.left), s.iy(e.clientY - r.top)];
  };

  return (
    <div ref={wrap} className={className} style={{ position: 'relative', width: '100%' }}>
      {W0 > 0 && (
        <>
          {layer && (
            <canvas
              ref={canvasRef}
              className="plot-layer"
              style={{ position: 'absolute', left: s.m.l, top: s.m.t, width: s.w, height: s.h, pointerEvents: 'none' }}
            />
          )}
          <svg
            className="plot"
            width={W}
            height={s.H}
            viewBox={`0 0 ${W} ${s.H}`}
            role="img"
            aria-label={ariaLabel}
            style={{ cursor, position: 'relative' }}
            onPointerDown={onPointer ? (e) => onPointer('down', toData(e), e) : undefined}
            onPointerMove={onPointer ? (e) => onPointer('move', toData(e), e) : undefined}
            onPointerUp={onPointer ? (e) => onPointer('up', toData(e), e) : undefined}
            onPointerLeave={onPointer ? (e) => onPointer('leave', toData(e), e) : undefined}
          >
            <defs>
              <clipPath id={`clip-${W}-${s.H}`}>
                <rect x={s.m.l} y={s.m.t} width={s.w} height={s.h} />
              </clipPath>
            </defs>
            {grid && (
              <g>
                {xt.map((t) => (
                  <line key={`gx${t}`} className="gridline" x1={s.x(t)} x2={s.x(t)} y1={s.m.t} y2={s.m.t + s.h} />
                ))}
                {yt.map((t) => (
                  <line key={`gy${t}`} className="gridline" y1={s.y(t)} y2={s.y(t)} x1={s.m.l} x2={s.m.l + s.w} />
                ))}
              </g>
            )}
            {axes && (
              <g className="axis">
                <line x1={s.m.l} x2={s.m.l + s.w} y1={s.m.t + s.h} y2={s.m.t + s.h} />
                <line x1={s.m.l} x2={s.m.l} y1={s.m.t} y2={s.m.t + s.h} />
                {xt.map((t) => (
                  <text key={`tx${t}`} x={s.x(t)} y={s.m.t + s.h + 17} textAnchor="middle">
                    {xFormat(t)}
                  </text>
                ))}
                {yt.map((t) => (
                  <text key={`ty${t}`} x={s.m.l - 8} y={s.y(t) + 3.5} textAnchor="end">
                    {yFormat(t)}
                  </text>
                ))}
                {xLabel && (
                  <text x={s.m.l + s.w / 2} y={s.H - 6} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontWeight: 600 }}>
                    {xLabel}
                  </text>
                )}
                {yLabel && (
                  <text
                    transform={`translate(13 ${s.m.t + s.h / 2}) rotate(-90)`}
                    textAnchor="middle"
                    style={{ fill: 'var(--ink-2)', fontWeight: 600 }}
                  >
                    {yLabel}
                  </text>
                )}
              </g>
            )}
            <g clipPath={`url(#clip-${W}-${s.H})`}>{children?.(s)}</g>
          </svg>
        </>
      )}
      {W0 === 0 && <div style={{ height }} />}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Colour helpers for canvas layers                                          */
/* ------------------------------------------------------------------------ */

export function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export const CLASS_VARS = ['--ultra', '--rose', '--ochre', '--viridian', '--violet'];

export function classColor(i: number) {
  if (i < 0) return 'var(--ink-3)';
  return `var(${CLASS_VARS[i % CLASS_VARS.length]})`;
}

/**
 * Paint a scalar or class field over the plot area at low resolution.
 * fn returns either a class index (with confidence 0..1) or null.
 */
export function paintField(
  ctx: CanvasRenderingContext2D,
  s: Scales,
  fn: (x: number, y: number) => { cls: number; conf: number } | null,
  cell = 5,
  alpha = 0.2,
) {
  const cols = CLASS_VARS.map((v) => hexToRgb(cssVar(v) || '#888888'));
  for (let py = s.m.t; py < s.m.t + s.h; py += cell) {
    for (let px = s.m.l; px < s.m.l + s.w; px += cell) {
      const r = fn(s.ix(px + cell / 2), s.iy(py + cell / 2));
      if (!r) continue;
      const [cr, cg, cb] = cols[r.cls % cols.length];
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${(alpha * Math.max(0.15, Math.min(1, r.conf))).toFixed(3)})`;
      ctx.fillRect(px, py, cell + 0.5, cell + 0.5);
    }
  }
}

/** Diverging field: value in [-1, 1] → rose ↔ ultramarine. */
export function paintDiverging(ctx: CanvasRenderingContext2D, s: Scales, fn: (x: number, y: number) => number, cell = 5, alpha = 0.32) {
  const a = hexToRgb(cssVar('--ultra') || '#2f49d1');
  const b = hexToRgb(cssVar('--rose') || '#cf2f68');
  for (let py = s.m.t; py < s.m.t + s.h; py += cell) {
    for (let px = s.m.l; px < s.m.l + s.w; px += cell) {
      const v = Math.max(-1, Math.min(1, fn(s.ix(px + cell / 2), s.iy(py + cell / 2))));
      const c = v >= 0 ? a : b;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(alpha * Math.abs(v)).toFixed(3)})`;
      ctx.fillRect(px, py, cell + 0.5, cell + 0.5);
    }
  }
}

/** Marker for a labelled point: class 0 = filled circle, class 1 = filled triangle (shape + colour). */
export function Marker({
  x,
  y,
  cls,
  r = 5.5,
  ring,
  dim,
  title,
  onPointerDown,
  hollow,
}: {
  x: number;
  y: number;
  cls: number;
  r?: number;
  ring?: string;
  dim?: boolean;
  title?: string;
  onPointerDown?: (e: RPE<SVGElement>) => void;
  hollow?: boolean;
}) {
  const fill = hollow ? 'var(--surface)' : classColor(cls);
  const stroke = hollow ? classColor(cls) : 'var(--surface)';
  const common = {
    fill,
    stroke,
    strokeWidth: hollow ? 2 : 1.4,
    opacity: dim ? 0.3 : 1,
    onPointerDown,
    style: onPointerDown ? { cursor: 'grab' } : undefined,
  };
  return (
    <g>
      {ring && <circle cx={x} cy={y} r={r + 4.5} fill="none" stroke={ring} strokeWidth={2} />}
      {cls % 2 === 1 ? (
        <path d={`M${x} ${y - r * 1.2} L${x + r * 1.1} ${y + r * 0.75} L${x - r * 1.1} ${y + r * 0.75} Z`} {...common}>
          {title && <title>{title}</title>}
        </path>
      ) : (
        <circle cx={x} cy={y} r={r} {...common}>
          {title && <title>{title}</title>}
        </circle>
      )}
    </g>
  );
}
