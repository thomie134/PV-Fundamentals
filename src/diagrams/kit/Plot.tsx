/**
 * <Plot> — the shared 2-D chart primitive. Draws axes, recessive gridlines and a
 * crosshair/tooltip hover layer in the house style; children draw marks with the
 * scales from context. HTML labels (which may contain <Term>) are portalled into an
 * overlay so diagram labels can be hoverable glossary terms.
 */
import { scaleLinear, scaleLog, type ScaleContinuousNumeric } from 'd3-scale';
import { area as d3area, line as d3line, curveLinear, curveMonotoneX } from 'd3-shape';
import { createContext, useContext, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { fmt, superscript } from '@/lib/format';
import { useMeasure } from './useMeasure';

export interface AxisSpec {
  domain: [number, number];
  label: ReactNode;
  unit?: string;
  log?: boolean;
  ticks?: number[];
  tickCount?: number;
  format?: (v: number) => string;
}

export type Pt = readonly [number, number];

export interface HoverSeries {
  label: string;
  color: string;
  points: readonly Pt[];
  format?: (y: number) => string;
}

interface PlotCtxValue {
  x: ScaleContinuousNumeric<number, number>;
  y: ScaleContinuousNumeric<number, number>;
  innerW: number;
  innerH: number;
  clipId: string;
  overlay: HTMLDivElement | null;
  margin: Margin;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const PlotCtx = createContext<PlotCtxValue | null>(null);
export const usePlot = () => {
  const c = useContext(PlotCtx);
  if (!c) throw new Error('Plot marks must be used inside <Plot>');
  return c;
};

const makeScale = (a: AxisSpec, range: [number, number]) =>
  (a.log ? scaleLog().domain(a.domain).range(range).clamp(false) : scaleLinear().domain(a.domain).range(range)) as ScaleContinuousNumeric<number, number>;

function ticksFor(a: AxisSpec, s: ScaleContinuousNumeric<number, number>, px: number): { ticks: number[]; count: number } {
  if (a.ticks) return { ticks: a.ticks, count: a.ticks.length };
  if (a.log) {
    const [lo, hi] = a.domain;
    const out: number[] = [];
    const step = Math.ceil((Math.log10(hi) - Math.log10(lo)) / Math.max(2, Math.floor(px / 46)));
    for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e += Math.max(1, step)) out.push(10 ** e);
    return { ticks: out, count: out.length };
  }
  const count = a.tickCount ?? Math.max(2, Math.min(8, Math.floor(px / 70)));
  return { ticks: s.ticks(count), count };
}

const logFormat = (v: number) => {
  const e = Math.round(Math.log10(v));
  if (e === 0) return '1';
  if (e === 1) return '10';
  return `10${superscript(e)}`;
};

export interface PlotProps {
  x: AxisSpec;
  y: AxisSpec;
  /** Height as fraction of width (default 0.6); clamped to [minHeight, maxHeight]. */
  aspect?: number;
  minHeight?: number;
  maxHeight?: number;
  ariaLabel: string;
  hover?: { series: HoverSeries[]; xFormat?: (x: number) => string };
  children?: ReactNode;
  margin?: Partial<Margin>;
}

export function Plot({ x: xs, y: ys, aspect = 0.6, minHeight = 240, maxHeight = 440, ariaLabel, hover, children, margin: m }: PlotProps) {
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const clipId = useId().replace(/:/g, '');
  const narrow = width < 420;
  const W = Math.max(width, 200);
  const H = Math.round(Math.min(maxHeight, Math.max(minHeight, W * aspect)));
  const top = m?.top ?? 14;
  const bottom = m?.bottom ?? 46;
  const innerH = H - top - bottom;
  // y first: its scale does not depend on the left margin, and the tick labels decide that margin.
  const y = useMemo(() => makeScale(ys, [innerH, 0]), [ys.domain[0], ys.domain[1], ys.log, innerH]); // eslint-disable-line react-hooks/exhaustive-deps
  const { ticks: yt, count: yCount } = ticksFor(ys, y, innerH);
  const yf = ys.format ?? (ys.log ? logFormat : ys.ticks ? (v: number) => fmt(v, 3) : y.tickFormat(yCount));
  const yLabelChars = Math.max(1, ...yt.map((t) => yf(t).length));
  const margin: Margin = { top, bottom, right: m?.right ?? (narrow ? 10 : 18), left: m?.left ?? Math.round(30 + yLabelChars * 6.8) };
  const innerW = W - margin.left - margin.right;
  const x = useMemo(() => makeScale(xs, [0, innerW]), [xs.domain[0], xs.domain[1], xs.log, innerW]); // eslint-disable-line react-hooks/exhaustive-deps
  const { ticks: xt, count: xCount } = ticksFor(xs, x, innerW);
  const xf = xs.format ?? (xs.log ? logFormat : xs.ticks ? (v: number) => fmt(v, 3) : x.tickFormat(xCount));

  const ctx: PlotCtxValue = { x, y, innerW, innerH, clipId, overlay, margin };

  return (
    <div ref={ref} className="plot" style={{ height: H }}>
      {width > 0 && (
        <PlotCtx.Provider value={ctx}>
          <svg width={W} height={H} role="img" aria-label={ariaLabel} className="plot__svg">
            <defs>
              <clipPath id={clipId}>
                <rect x={0} y={-2} width={innerW} height={innerH + 4} />
              </clipPath>
            </defs>
            <g transform={`translate(${margin.left},${margin.top})`}>
              <g className="plot__grid" aria-hidden>
                {yt.map((t) => (
                  <line key={t} x1={0} x2={innerW} y1={y(t)} y2={y(t)} />
                ))}
              </g>
              <g className="plot__axis plot__axis--y" aria-hidden>
                {yt.map((t) => (
                  <text key={t} x={-8} y={y(t)} dy="0.32em" textAnchor="end">
                    {yf(t)}
                  </text>
                ))}
              </g>
              <g className="plot__axis plot__axis--x" aria-hidden transform={`translate(0,${innerH})`}>
                <line x1={0} x2={innerW} className="plot__baseline" />
                {xt.map((t) => (
                  <g key={t} transform={`translate(${x(t)},0)`}>
                    <line y2={5} />
                    <text y={18} textAnchor="middle">
                      {xf(t)}
                    </text>
                  </g>
                ))}
              </g>
              <g clipPath={`url(#${clipId})`}>{children}</g>
              {hover && <HoverLayer series={hover.series} xFormat={hover.xFormat ?? ((v) => fmt(v, 3))} xUnit={xs.unit} />}
            </g>
          </svg>
          <div ref={setOverlay} className="plot__overlay" style={{ left: margin.left, top: margin.top, width: innerW, height: innerH }}>
            <div className="plot__xlabel" style={{ top: innerH + 28 }}>
              {xs.label}
              {xs.unit && <span className="plot__unit"> ({xs.unit})</span>}
            </div>
            <div className="plot__ylabel" style={{ left: -margin.left + 2, top: innerH / 2 }}>
              <span>
                {ys.label}
                {ys.unit && <span className="plot__unit"> ({ys.unit})</span>}
              </span>
            </div>
          </div>
        </PlotCtx.Provider>
      )}
    </div>
  );
}

/* ---------------- Marks ---------------- */

const finite = (p: Pt) => Number.isFinite(p[0]) && Number.isFinite(p[1]);

export function Line({ points, color = 'var(--dg-accent)', width = 2, dash, smooth = false, opacity }: { points: readonly Pt[]; color?: string; width?: number; dash?: string; smooth?: boolean; opacity?: number }) {
  const { x, y } = usePlot();
  const d = d3line<Pt>()
    .defined(finite)
    .x((p) => x(p[0]))
    .y((p) => y(p[1]))
    .curve(smooth ? curveMonotoneX : curveLinear)(points as Pt[]);
  return <path d={d ?? ''} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinejoin="round" strokeLinecap="round" opacity={opacity} />;
}

export function Area({ points, fill = 'var(--dg-wash)', baseline }: { points: readonly Pt[]; fill?: string; baseline?: number }) {
  const { x, y, innerH } = usePlot();
  const y0 = baseline === undefined ? innerH : y(baseline);
  const d = d3area<Pt>()
    .defined(finite)
    .x((p) => x(p[0]))
    .y0(y0)
    .y1((p) => y(p[1]))(points as Pt[]);
  return <path d={d ?? ''} fill={fill} stroke="none" />;
}

/** Vertical shaded band between x0 and x1. */
export function Band({ x0, x1, fill = 'var(--dg-wash)' }: { x0: number; x1: number; fill?: string }) {
  const { x, innerH } = usePlot();
  const a = x(x0);
  const b = x(x1);
  return <rect x={Math.min(a, b)} y={0} width={Math.abs(b - a)} height={innerH} fill={fill} />;
}

export function VRule({ x: xv, color = 'var(--dg-ink-2)', dash = '4 4', width = 1.5 }: { x: number; color?: string; dash?: string; width?: number }) {
  const { x, innerH } = usePlot();
  return <line x1={x(xv)} x2={x(xv)} y1={0} y2={innerH} stroke={color} strokeWidth={width} strokeDasharray={dash} />;
}

export function HRule({ y: yv, color = 'var(--dg-ink-2)', dash = '4 4', width = 1.5 }: { y: number; color?: string; dash?: string; width?: number }) {
  const { y, innerW } = usePlot();
  return <line x1={0} x2={innerW} y1={y(yv)} y2={y(yv)} stroke={color} strokeWidth={width} strokeDasharray={dash} />;
}

export function Dot({ x: xv, y: yv, color = 'var(--dg-accent)', r = 5 }: { x: number; y: number; color?: string; r?: number }) {
  const { x, y } = usePlot();
  if (!Number.isFinite(xv) || !Number.isFinite(yv)) return null;
  return <circle cx={x(xv)} cy={y(yv)} r={r} fill={color} stroke="var(--dg-surface)" strokeWidth={2} className="plot__dot" />;
}

/** HTML label at data coordinates; may contain <Term>. Rendered in the overlay, outside the clip. */
export function PlotLabel({
  x: xv,
  y: yv,
  children,
  anchor = 'start',
  valign = 'middle',
  dx = 0,
  dy = 0,
  className,
  style,
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: 'start' | 'middle' | 'end';
  valign?: 'top' | 'middle' | 'bottom';
  dx?: number;
  dy?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { x, y, overlay } = usePlot();
  if (!overlay) return null;
  const tx = anchor === 'start' ? '0' : anchor === 'middle' ? '-50%' : '-100%';
  const ty = valign === 'top' ? '0' : valign === 'middle' ? '-50%' : '-100%';
  return createPortal(
    <div className={['plot__label', className].filter(Boolean).join(' ')} style={{ left: x(xv) + dx, top: y(yv) + dy, transform: `translate(${tx},${ty})`, ...style }}>
      {children}
    </div>,
    overlay,
  );
}

/* ---------------- Hover layer ---------------- */

function interpAt(points: readonly Pt[], xv: number): number | null {
  if (points.length === 0) return null;
  if (xv < points[0][0] || xv > points[points.length - 1][0]) return null;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid][0] <= xv) lo = mid;
    else hi = mid;
  }
  const [x0, y0] = points[lo];
  const [x1, y1] = points[hi];
  if (x1 === x0) return y0;
  return y0 + ((xv - x0) / (x1 - x0)) * (y1 - y0);
}

function HoverLayer({ series, xFormat, xUnit }: { series: HoverSeries[]; xFormat: (x: number) => string; xUnit?: string }) {
  const { x, y, innerW, innerH, overlay } = usePlot();
  const [px, setPx] = useState<number | null>(null);
  const rectRef = useRef<SVGRectElement>(null);
  const move = (clientX: number) => {
    const r = rectRef.current?.getBoundingClientRect();
    if (!r) return;
    setPx(Math.max(0, Math.min(innerW, clientX - r.left)));
  };
  const xv = px === null ? null : x.invert(px);
  const vals = xv === null ? [] : series.map((s) => ({ s, v: interpAt(s.points, xv) }));
  return (
    <>
      <rect
        ref={rectRef}
        width={innerW}
        height={innerH}
        fill="transparent"
        style={{ touchAction: 'pan-y' }}
        onPointerMove={(e) => move(e.clientX)}
        onPointerDown={(e) => move(e.clientX)}
        onPointerLeave={() => setPx(null)}
      />
      {px !== null && (
        <g pointerEvents="none">
          <line x1={px} x2={px} y1={0} y2={innerH} className="plot__crosshair" />
          {vals.map(({ s, v }) => (v === null || !Number.isFinite(y(v)) ? null : <circle key={s.label} cx={px} cy={y(v)} r={4.5} fill={s.color} stroke="var(--dg-surface)" strokeWidth={2} />))}
        </g>
      )}
      {px !== null &&
        overlay &&
        xv !== null &&
        createPortal(
          <div className="plot__tooltip" style={{ left: px, transform: `translateX(${px > innerW * 0.6 ? 'calc(-100% - 12px)' : '12px'})` }}>
            <div className="plot__tooltip-x num">
              {xFormat(xv)}
              {xUnit ? ` ${xUnit}` : ''}
            </div>
            {vals.map(({ s, v }) =>
              v === null ? null : (
                <div key={s.label} className="plot__tooltip-row">
                  <span className="swatch" style={{ background: s.color }} />
                  <span>{s.label}</span>
                  <span className="num">{(s.format ?? ((n: number) => fmt(n, 3)))(v)}</span>
                </div>
              ),
            )}
          </div>,
          overlay,
        )}
    </>
  );
}

/** Legend row shown above a plot (always present for ≥ 2 series). */
export function Legend({ items }: { items: { label: ReactNode; color: string; dash?: boolean; kind?: 'line' | 'area' }[] }) {
  return (
    <ul className="legend">
      {items.map((it, i) => (
        <li key={i}>
          <span className={`legend__key legend__key--${it.kind ?? 'line'} ${it.dash ? 'is-dashed' : ''}`} style={{ ['--c' as string]: it.color }} aria-hidden />
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}
