import { useRef, useState, type ReactNode } from 'react';
import { Marker, paintField, Plot, type Scales } from '../components/Plot';
import { Seg } from '../components/controls';

export type LPoint = { x: number; y: number; c: number };

/**
 * Interactive 2-D classification canvas: click to add a point of the chosen class,
 * drag to move, double-click (or right-click) to delete. A model field paints the background.
 */
export function Playground2D({
  points,
  setPoints,
  domain,
  field,
  fieldKey,
  overlay,
  height = 380,
  editable = true,
  classes = 2,
  cell = 5,
  showAdd = true,
  ring,
  query,
  onQuery,
}: {
  points: LPoint[];
  setPoints: (p: LPoint[]) => void;
  domain: [number, number, number, number];
  field?: (x: number, y: number) => { cls: number; conf: number } | null;
  fieldKey?: unknown;
  overlay?: (s: Scales) => ReactNode;
  height?: number;
  editable?: boolean;
  classes?: number;
  cell?: number;
  showAdd?: boolean;
  ring?: (i: number) => string | undefined;
  /** optional draggable query point (drawn as a black diamond) */
  query?: [number, number];
  onQuery?: (q: [number, number]) => void;
}) {
  const [addCls, setAddCls] = useState(0);
  const drag = useRef<number | 'q' | null>(null);
  const moved = useRef(false);
  const ptsRef = useRef(points);
  ptsRef.current = points;

  return (
    <div>
      {editable && showAdd && (
        <div className="controls" style={{ marginBottom: '0.6rem', alignItems: 'center' }}>
          <Seg
            value={addCls}
            onChange={setAddCls}
            options={Array.from({ length: classes }, (_, i) => ({
              value: i,
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="11" height="11" viewBox="0 0 12 12">
                    {i % 2 === 1 ? (
                      <path d="M6 1 L11 10 L1 10Z" fill={`var(${['--ultra', '--rose', '--ochre', '--viridian'][i]})`} />
                    ) : (
                      <circle cx="6" cy="6" r="5" fill={`var(${['--ultra', '--rose', '--ochre', '--viridian'][i]})`} />
                    )}
                  </svg>
                  Add class {String.fromCharCode(65 + i)}
                </span>
              ),
            }))}
          />
          <span className="figure__hint">Click to add, drag to move, double-click to delete</span>
          <button className="btn btn--ghost btn--sm" onClick={() => setPoints([])}>
            Clear
          </button>
        </div>
      )}
      <div className="plot-wrap">
        <Plot
          xDomain={[domain[0], domain[1]]}
          yDomain={[domain[2], domain[3]]}
          height={height}
          equal
          layer={field ? (ctx, s) => paintField(ctx, s, field, cell) : undefined}
          layerKey={fieldKey}
          cursor={editable ? 'crosshair' : undefined}
          onPointer={
            editable || onQuery
              ? (kind, p, e) => {
                  if (drag.current === 'q') {
                    if (kind === 'move') onQuery?.([p[0], p[1]]);
                    else if (kind === 'up' || kind === 'leave') drag.current = null;
                    return;
                  }
                  if (!editable) return;
                  if (kind === 'down') {
                    moved.current = false;
                    if (drag.current === null && e.button === 0 && !(e.target as Element).closest('[data-pt]')) {
                      setPoints([...ptsRef.current, { x: p[0], y: p[1], c: addCls }]);
                    }
                  } else if (kind === 'move' && typeof drag.current === 'number') {
                    moved.current = true;
                    const i = drag.current;
                    setPoints(ptsRef.current.map((q, j) => (j === i ? { ...q, x: p[0], y: p[1] } : q)));
                  } else if (kind === 'up' || kind === 'leave') {
                    drag.current = null;
                  }
                }
              : undefined
          }
        >
          {(s) => (
            <>
              {overlay?.(s)}
              {points.map((p, i) => (
                <g
                  key={i}
                  data-pt
                  onPointerDown={
                    editable
                      ? (e) => {
                          e.stopPropagation();
                          drag.current = i;
                          (e.currentTarget.ownerSVGElement as SVGSVGElement)?.setPointerCapture(e.pointerId);
                        }
                      : undefined
                  }
                  onDoubleClick={editable ? () => setPoints(ptsRef.current.filter((_, j) => j !== i)) : undefined}
                  onContextMenu={
                    editable
                      ? (e) => {
                          e.preventDefault();
                          setPoints(ptsRef.current.filter((_, j) => j !== i));
                        }
                      : undefined
                  }
                  style={{ cursor: editable ? 'grab' : undefined }}
                >
                  <Marker x={s.x(p.x)} y={s.y(p.y)} cls={p.c} ring={ring?.(i)} />
                </g>
              ))}
              {query && (
                <g
                  data-pt
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    drag.current = 'q';
                    (e.currentTarget.ownerSVGElement as SVGSVGElement)?.setPointerCapture(e.pointerId);
                  }}
                >
                  <circle cx={s.x(query[0])} cy={s.y(query[1])} r={14} fill="transparent" />
                  <rect
                    x={s.x(query[0]) - 7}
                    y={s.y(query[1]) - 7}
                    width={14}
                    height={14}
                    rx={3}
                    fill="var(--ink)"
                    stroke="var(--surface)"
                    strokeWidth={2}
                    transform={`rotate(45 ${s.x(query[0])} ${s.y(query[1])})`}
                  />
                </g>
              )}
            </>
          )}
        </Plot>
      </div>
    </div>
  );
}

export const toXY = (pts: LPoint[]) => ({ X: pts.map((p) => [p.x, p.y]), y: pts.map((p) => p.c) });
export const fromXY = (X: number[][], y: number[]): LPoint[] => X.map((r, i) => ({ x: r[0], y: r[1], c: y[i] }));
