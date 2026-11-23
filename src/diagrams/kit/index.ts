/** Shared diagram kit: import everything a diagram needs from '@/diagrams/kit'. */
export { DiagramFrame, type DiagramFrameProps, type FrameFormula } from './DiagramFrame';
export { Plot, Line, Area, Band, VRule, HRule, Dot, PlotLabel, Legend, usePlot, type AxisSpec, type Pt, type HoverSeries } from './Plot';
export { useMeasure } from './useMeasure';
export { Slider, Segmented, Toggle, Readout } from '@/components/Controls';
export { Term } from '@/components/Term';
export { Formula, Tex } from '@/components/Formula';
export { fmt, sci, pct } from '@/lib/format';

/** Colour roles (CSS variables from tokens.css). Use these, never raw hex. */
export const C = {
  accent: 'var(--dg-accent)',
  electron: 'var(--dg-electron)',
  hole: 'var(--dg-hole)',
  photon: 'var(--dg-photon)',
  aux: 'var(--dg-aux)',
  ink: 'var(--dg-ink)',
  ink2: 'var(--dg-ink-2)',
  axis: 'var(--dg-axis)',
  grid: 'var(--dg-grid)',
  wash: 'var(--dg-wash)',
  washPhoton: 'var(--dg-wash-photon)',
  cb: 'var(--dg-cb-fill)',
  vb: 'var(--dg-vb-fill)',
  s1: 'var(--dg-series-1)',
  s2: 'var(--dg-series-2)',
  s3: 'var(--dg-series-3)',
  s4: 'var(--dg-series-4)',
} as const;

/** Sample a function on [a, b] with n points. */
export function sample(f: (x: number) => number, a: number, b: number, n = 200, log = false): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = log ? a * (b / a) ** t : a + (b - a) * t;
    out.push([x, f(x)]);
  }
  return out;
}
export { Electron, Hole, Photon, Arrow } from './Glyphs';
export { BandDiagram, SubLabel, glyphCount, type BandLevel } from './BandDiagram';
