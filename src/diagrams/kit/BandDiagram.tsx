/**
 * <BandDiagram> — flat energy-band schematic (energy up, position across), shared by the
 * semiconductor weeks. Energies in eV with E_C = 0 and E_V = −E_G. Levels are drawn as
 * horizontal lines with a label on the right; carriers as Electron/Hole glyphs.
 */
import type { ReactNode } from 'react';
import { Electron, Hole } from './Glyphs';
import { useMeasure } from './useMeasure';

export interface BandLevel {
  /** Energy in eV relative to E_C. */
  E: number;
  /** Label: plain string; use "_" for a subscript, e.g. "E_Fn". */
  label: string;
  color?: string;
  dash?: string;
  width?: number;
  /** Optional dimension arrow from this level to E_C ('up') or E_V ('down') with text. */
  measure?: { to: 'C' | 'V'; text: string };
  /** Draw only over a fraction of the width (0–1) starting from the left. */
  span?: [number, number];
}

export interface BandDiagramProps {
  Eg: number;
  /** Visible energy range relative to E_C (eV). Default: 0.25 eV margin around the bands. */
  range?: [number, number];
  height?: number;
  levels?: BandLevel[];
  /** Number of electron / hole glyphs to draw in the bands (0–10). */
  electrons?: number;
  holes?: number;
  /** Labels for the band regions. */
  cbLabel?: ReactNode;
  vbLabel?: ReactNode;
  ariaLabel: string;
  /** Extra SVG drawn on top, receives the energy → y mapping and the plot width. */
  overlay?: (y: (E: number) => number, w: number, x0: number) => ReactNode;
}

const LABEL_W = 46;

/** Render "E_Fn" as E with subscript Fn. */
export function SubLabel({ text }: { text: string }) {
  const [base, sub] = text.split('_');
  return (
    <>
      {base}
      {sub && (
        <tspan dy="0.3em" fontSize="0.78em">
          {sub}
        </tspan>
      )}
    </>
  );
}

/** Deterministic, evenly spread positions for glyphs (no randomness → no layout jumps). */
function spread(count: number, x0: number, x1: number) {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(x0 + ((i + 0.5) / count) * (x1 - x0));
  return out;
}

export function BandDiagram({ Eg, range, height = 260, levels = [], electrons = 0, holes = 0, cbLabel = 'conduction band', vbLabel = 'valence band', ariaLabel, overlay }: BandDiagramProps) {
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const [lo, hi] = range ?? [-Eg - 0.3, 0.3];
  const W = Math.max(width, 220);
  const padT = 8;
  const padB = 8;
  const x0 = 34; // left: E axis
  const x1 = W - LABEL_W - 6;
  const y = (E: number) => padT + ((hi - E) / (hi - lo)) * (height - padT - padB);
  const yC = y(0);
  const yV = y(-Eg);
  const glyphR = W < 360 ? 6.5 : 8;

  // Place labels on the right without overlaps (min 13 px apart), keeping order. The band-edge
  // labels E_C and E_V take part, so a level just below E_C is pushed down instead of covering it.
  type Slot = { l: BandLevel | 'C' | 'V'; E: number; ly: number };
  const slots: Slot[] = [{ l: 'C' as const, E: 0 }, { l: 'V' as const, E: -Eg }, ...levels.map((l) => ({ l, E: l.E }))]
    .sort((a, b) => b.E - a.E)
    .map((s) => ({ ...s, ly: y(s.E) }));
  for (let i = 1; i < slots.length; i++) if (slots[i].ly - slots[i - 1].ly < 13) slots[i].ly = slots[i - 1].ly + 13;
  const labelY = new Map<BandLevel | 'C' | 'V', number>(slots.map((s) => [s.l, s.ly]));

  return (
    <div ref={ref} className="schematic band-diagram" style={{ height }}>
      {width > 0 && (
        <svg width={W} height={height} role="img" aria-label={ariaLabel}>
          {/* bands */}
          <rect x={x0} y={padT} width={x1 - x0} height={Math.max(0, yC - padT)} fill="var(--dg-cb-fill)" />
          <rect x={x0} y={yV} width={x1 - x0} height={Math.max(0, height - padB - yV)} fill="var(--dg-vb-fill)" />
          <line x1={x0} x2={x1} y1={yC} y2={yC} stroke="var(--dg-ink)" strokeWidth={2} />
          <line x1={x0} x2={x1} y1={yV} y2={yV} stroke="var(--dg-ink)" strokeWidth={2} />
          {/* energy axis */}
          <line x1={x0 - 14} x2={x0 - 14} y1={height - padB} y2={padT + 4} stroke="var(--dg-axis)" />
          <path d={`M${x0 - 18},${padT + 10}L${x0 - 14},${padT + 2}L${x0 - 10},${padT + 10}`} fill="none" stroke="var(--dg-axis)" />
          <text x={x0 - 26} y={padT + 12} textAnchor="middle">
            E
          </text>
          {/* region labels */}
          <text x={x0 + 8} y={padT + 14}>
            {cbLabel}
          </text>
          <text x={x0 + 8} y={height - padB - 6}>
            {vbLabel}
          </text>
          <text x={x1 + 6} y={labelY.get('C') ?? yC} dy="0.32em" className="label-strong">
            <SubLabel text="E_C" />
          </text>
          <text x={x1 + 6} y={labelY.get('V') ?? yV} dy="0.32em" className="label-strong">
            <SubLabel text="E_V" />
          </text>
          {/* carriers */}
          {spread(Math.min(10, Math.max(0, Math.round(electrons))), x0 + 70, x1 - 14).map((cx, i) => (
            <Electron key={`e${i}`} x={cx} y={yC - glyphR - 3 - (i % 2) * (glyphR + 2)} r={glyphR} />
          ))}
          {spread(Math.min(10, Math.max(0, Math.round(holes))), x0 + 70, x1 - 14).map((cx, i) => (
            <Hole key={`h${i}`} x={cx} y={yV + glyphR + 3 + (i % 2) * (glyphR + 2)} r={glyphR} />
          ))}
          {/* levels */}
          {levels.map((l, i) => {
            const ly = y(l.E);
            const a = l.span ? x0 + l.span[0] * (x1 - x0) : x0;
            const b = l.span ? x0 + l.span[1] * (x1 - x0) : x1;
            const tx = l.measure ? x0 + 18 + i * 22 : 0;
            return (
              <g key={i}>
                <line x1={a} x2={b} y1={ly} y2={ly} stroke={l.color ?? 'var(--dg-ink)'} strokeWidth={l.width ?? 2} strokeDasharray={l.dash} />
                {l.measure && (
                  <g>
                    <line x1={tx} x2={tx} y1={ly} y2={l.measure.to === 'C' ? yC : yV} stroke="var(--dg-ink-2)" strokeWidth={1.25} markerStart="url(#bd-arrow)" markerEnd="url(#bd-arrow)" />
                    <text x={tx + 5} y={(ly + (l.measure.to === 'C' ? yC : yV)) / 2} dy="0.32em" className="label-strong">
                      {l.measure.text}
                    </text>
                  </g>
                )}
                <text x={x1 + 6} y={labelY.get(l) ?? ly} dy="0.32em" fill={l.color ?? 'var(--dg-ink)'} style={{ fill: l.color }} className="label-strong">
                  <SubLabel text={l.label} />
                </text>
              </g>
            );
          })}
          <defs>
            <marker id="bd-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,1 L5,5 L0,9" fill="none" stroke="var(--dg-ink-2)" strokeWidth="1.5" />
            </marker>
          </defs>
          {overlay?.(y, x1 - x0, x0)}
        </svg>
      )}
    </div>
  );
}

/**
 * Number of carrier glyphs for a density (cm⁻³). Grows with the LOGARITHM of the density, so that
 * 10³ and 10¹⁷ can share one picture: ≈ 0 below 10⁴, 4 at 10¹⁰, 8 at 10¹⁷, 10 at 10²⁰.
 * Diagrams that use it must say so in their caption.
 */
export const glyphCount = (density: number) => Math.max(0, Math.min(10, Math.round((Math.log10(Math.max(density, 1)) - 4) / 1.6)));
