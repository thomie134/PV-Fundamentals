import { useMemo, useState } from 'react';
import { C, DiagramFrame, Line, Plot, Readout, Slider, Term, fmt, usePlot } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { trapz } from '@/physics/radiation';

/** Book exercise 5.7: triangular solar-simulator spectrum, peak 2.0 W m⁻² nm⁻¹ at 800 nm, zero at 300 and 1300 nm. */
const f = (nm: number) => (nm <= 300 || nm >= 1300 ? 0 : nm <= 800 ? (2 * (nm - 300)) / 500 : (2 * (1300 - nm)) / 500);

function exactArea(a: number, b: number) {
  const pts = [a, ...[300, 800, 1300].filter((p) => p > a && p < b), b];
  return trapz(pts, pts.map(f)); // exact for a piecewise-linear function
}

function Slices({ a, b, n }: { a: number; b: number; n: number }) {
  const { x, y } = usePlot();
  const w = (b - a) / n;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const mid = a + (i + 0.5) * w;
        const h = f(mid);
        const x0 = x(a + i * w);
        const x1 = x(a + (i + 1) * w);
        return <rect key={i} x={x0 + (n < 60 ? 1 : 0)} width={Math.max(0.5, x1 - x0 - (n < 60 ? 2 : 0))} y={y(h)} height={y(0) - y(h)} fill="var(--dg-wash)" stroke="var(--dg-accent)" strokeOpacity={n < 40 ? 0.5 : 0} />;
      })}
    </g>
  );
}

export default function RiemannSpectrum({ meta }: { meta: DiagramMeta }) {
  const [a, setA] = useState(300);
  const [b, setB] = useState(1300);
  const [n, setN] = useState(8);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const curve = useMemo(() => [300, 800, 1300].map((v) => [v, f(v)] as [number, number]), []);
  const w = (hi - lo) / n;
  const sum = Array.from({ length: n }, (_, i) => f(lo + (i + 0.5) * w) * w).reduce((s2, v) => s2 + v, 0);
  const exact = exactArea(lo, hi);
  return (
    <DiagramFrame
      meta={meta}
      ctx="radiation"
      controls={
        <>
          <Slider label="Lower limit λ₁" value={a} min={300} max={1300} step={10} unit="nm" onChange={setA} format={(v) => v.toFixed(0)} />
          <Slider label="Upper limit λ₂" value={b} min={300} max={1300} step={10} unit="nm" onChange={setB} format={(v) => v.toFixed(0)} />
          <Slider label="Number of slices" value={n} min={2} max={200} log onChange={(v) => setN(Math.round(v))} format={(v) => Math.round(v).toString()} />
        </>
      }
      readouts={
        <>
          <Readout label="Sum of slices Σ f·Δλ" value={fmt(sum, 4)} unit="W/m²" />
          <Readout label={<Term id="integral">Exact area ∫ f dλ</Term>} value={fmt(exact, 4)} unit="W/m²" emphasis />
          <Readout label="Slice width Δλ" value={fmt(w, 3)} unit="nm" />
          <Readout label="Difference" value={fmt(Math.abs(sum - exact), 2)} unit="W/m²" />
        </>
      }
      formulas={[{ tex: 'I_e = \\int_{\\lambda_1}^{\\lambda_2} I_{e\\lambda}\\,\\mathrm{d}\\lambda \\approx \\sum I_{e\\lambda}\\,\\Delta\\lambda' }]}
      caption="Spectrum: the triangular solar-simulator spectrum of book exercise 5.7 (total 1000 W/m²)."
      notice={
        <>
          <p>
            <strong>More slices → closer to the exact area.</strong> Each rectangle is height × width (W m⁻² nm⁻¹ × nm = W m⁻²). With enough slices the sum becomes
            the integral. The full spectrum adds up to 1000 W/m², just like AM1.5.
          </p>
          <p>
            <strong>Partial integrals.</strong> Moving the limits gives the power in part of the spectrum, e.g. only the photons a solar cell can absorb (λ below its
            absorption edge).
          </p>
        </>
      }
    >
      <Plot ariaLabel="Spectrum with rectangle slices" x={{ domain: [250, 1350], label: <Term id="wavelength">Wavelength</Term>, unit: 'nm' }} y={{ domain: [0, 2.2], label: <Term id="spectral-irradiance">Spectral irradiance</Term>, unit: 'W m⁻² nm⁻¹' }} aspect={0.55}>
        <Slices a={lo} b={hi} n={n} />
        <Line points={curve} color={C.accent} width={2.5} />
      </Plot>
    </DiagramFrame>
  );
}
