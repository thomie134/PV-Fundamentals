import { useMemo, useState } from 'react';
import { Band, C, DiagramFrame, Legend, Line, Plot, Readout, Segmented, Slider, Term, fmt, sci, usePlot } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { ex77Profile, ex78Profile, solveSteadyState } from '@/physics/transport';

type Case = 'ex78' | 'ex77' | 'light';
const N_GRID = 300;

export default function SteadyStateProfiles({ meta }: { meta: DiagramMeta }) {
  const [mode, setMode] = useState<Case>('ex78');
  const [logS, setLogS] = useState(3); // cm/s; −1 means S = 0
  const [Lum, setLum] = useState(100); // diffusion length, µm (light case)
  const [absUm, setAbsUm] = useState(10); // absorption length 1/α, µm (light case)
  const [logSfront, setLogSfront] = useState(1);

  /* ---- ex. 7.8: W = 100 µm, D = 30 cm²/s, G = 1 (normalised: Δ in units of G W²/D) ---- */
  const W = 100e-4;
  const D = 30;
  const S = logS < 0 ? 0 : 10 ** logS;
  const unit78 = (W * W) / D; // G = 1
  const ex78 = useMemo(() => {
    const sol = solveSteadyState({ W, D, tau: Infinity, G: () => 1, left: { kind: 'value', value: 0 }, right: S === 0 ? { kind: 'reflect' } : { kind: 'surface', S }, N: N_GRID });
    return {
      num: sol.x.map((x, i) => [x / W, sol.delta[i] / unit78] as [number, number]),
      exact: sol.x.filter((_, i) => i % 15 === 0).map((x) => [x / W, ex78Profile(x, 1, W, D, S) / unit78] as [number, number]),
      ref: sol.x.map((x) => [x / W, ex78Profile(x, 1, W, D, 0) / unit78] as [number, number]),
    };
  }, [S, unit78]);

  /* ---- ex. 7.7: domain −3L..3L, normalised Δ in units of G0 L²/Dp ---- */
  const ex77 = useMemo(() => {
    const L = 1;
    const sol = solveSteadyState({ W: 6 * L, D: 1, tau: Infinity, G: (x) => (Math.abs(x - 3) < 1 ? 1 : 0), left: { kind: 'value', value: 0 }, right: { kind: 'value', value: 0 }, N: 600 });
    return {
      num: sol.x.map((x, i) => [x - 3, sol.delta[i]] as [number, number]),
      exact: sol.x.filter((_, i) => i % 25 === 0).map((x) => [x - 3, ex77Profile(x - 3, 1, 1, 1)] as [number, number]),
    };
  }, []);

  /* ---- light absorbed near the front, finite lifetime: W = 300 µm, D = 30, τ = L²/D ---- */
  const Wl = 300e-4;
  const Sf = logSfront < 0 ? 0 : 10 ** logSfront;
  const light = useMemo(() => {
    const L = Lum * 1e-4;
    const a = 1 / (absUm * 1e-4);
    const tau = (L * L) / D;
    const G = (x: number) => a * Math.exp(-a * x);
    const sol = solveSteadyState({ W: Wl, D, tau, G, left: Sf === 0 ? { kind: 'reflect' } : { kind: 'surface', S: Sf }, right: { kind: 'value', value: 0 }, N: 600 });
    // Reference: a near-perfect wafer (L = 10 mm, S = 0) with the same light.
    const ref = solveSteadyState({ W: Wl, D, tau: 1 / D, G, left: { kind: 'reflect' }, right: { kind: 'value', value: 0 }, N: 600 });
    const max = Math.max(...ref.delta);
    const refPts = ref.x.map((x, i) => [x * 1e4, ref.delta[i] / max] as [number, number]);
    // Fraction collected at the rear = flux out at x = W relative to the total generation.
    const h = Wl / 600;
    const flux = (d: number[]) => (D * (d[599] - d[600])) / h;
    const total = 1 - Math.exp(-a * Wl);
    return { pts: sol.x.map((x, i) => [x * 1e4, sol.delta[i] / max] as [number, number]), refPts, collected: flux(sol.delta) / total };
  }, [Lum, absUm, Sf]);

  const peak78 = Math.max(...ex78.num.map((p) => p[1]));
  const end78 = ex78.num[ex78.num.length - 1][1];

  return (
    <DiagramFrame
      meta={meta}
      ctx="transport"
      legend={
        mode === 'ex78' ? (
          <Legend
            items={[
              { label: <>numerical solution, S = {S === 0 ? '0' : `${sci(S, 1)} cm/s`}</>, color: C.accent },
              { label: 'self-derived formula (dots)', color: C.ink },
              { label: '(a) S = 0 for reference', color: C.ink2, dash: true },
            ]}
          />
        ) : mode === 'ex77' ? (
          <Legend
            items={[
              { label: 'numerical solution', color: C.accent },
              { label: 'self-derived formula (dots)', color: C.ink },
              { label: 'illuminated region', color: C.washPhoton, kind: 'area' },
            ]}
          />
        ) : (
          <Legend items={[{ label: 'excess minority density', color: C.accent }, { label: 'near-perfect wafer (L = 10 mm, S = 0)', color: C.ink2, dash: true }]} />
        )
      }
      controls={
        <>
          <Segmented
            label="Situation"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'ex78', label: 'Ex. 7.8' },
              { value: 'ex77', label: 'Ex. 7.7' },
              { value: 'light', label: 'Light + lifetime' },
            ]}
          />
          {mode === 'ex78' && (
            <Slider
              label={<Term id="surface-recombination-velocity">Surface recombination velocity S at x = W</Term>}
              value={logS}
              min={-1}
              max={7}
              step={0.1}
              unit="cm/s"
              onChange={setLogS}
              format={(v) => (v < 0 ? '0' : sci(10 ** v, 2))}
              marks={[{ value: -1, label: 'S = 0' }, { value: 3, label: '10³' }, { value: 7, label: '→ ∞' }]}
            />
          )}
          {mode === 'light' && (
            <>
              <Slider label={<Term id="diffusion-length">Diffusion length L</Term>} value={Lum} min={10} max={1000} step={5} unit="µm" onChange={setLum} format={(v) => v.toFixed(0)} marks={[{ value: 60, label: 'ex. 7.5' }]} />
              <Slider label={<>Absorption length 1/α</>} value={absUm} min={0.5} max={300} step={0.5} unit="µm" onChange={setAbsUm} format={(v) => v.toFixed(1)} marks={[{ value: 3.4, label: '650 nm' }]} />
              <Slider label="Front surface S" value={logSfront} min={-1} max={6} step={0.1} unit="cm/s" onChange={setLogSfront} format={(v) => (v < 0 ? '0' : sci(10 ** v, 2))} marks={[{ value: -1, label: 'passivated' }]} />
            </>
          )}
        </>
      }
      readouts={
        mode === 'ex78' ? (
          <>
            <Readout label="Peak of Δn" value={fmt(peak78, 3)} unit={<>× G<sub>L</sub>W²/D<sub>n</sub></>} emphasis note="(a) S = 0: 0.5 at x = W" />
            <Readout label="Δn at the surface x = W" value={fmt(end78, 3)} unit={<>× G<sub>L</sub>W²/D<sub>n</sub></>} note={S === 0 ? 'no flow into the surface' : S > 1e6 ? 'surface removes everything: Δn → 0' : 'carriers leak into the surface'} />
            <Readout label={<>SW/D<sub>n</sub></>} value={fmt((S * W) / D, 3)} note="≪ 1: surface hardly matters; ≫ 1: acts like a contact" />
          </>
        ) : mode === 'ex77' ? (
          <>
            <Readout label="Δp at x = 0" value="2.5" unit={<>× G₀L²/D<sub>p</sub></>} emphasis />
            <Readout label="Δp at x = ±L" value="2.0" unit={<>× G₀L²/D<sub>p</sub></>} />
            <Readout label="Slope outside" value="∓1" unit={<>× G₀L/D<sub>p</sub></>} note="straight flanks: diffusion, no generation, no recombination" />
          </>
        ) : (
          <>
            <Readout label="L / wafer thickness" value={fmt(Lum / 300, 3)} note={Lum > 300 ? 'carriers reach the rear contact easily' : 'many recombine on the way'} />
            <Readout label="Collected at the rear" value={fmt(100 * Math.max(0, light.collected), 3)} unit="%" emphasis note="of the generated carriers (the rest recombine)" />
            <Readout label="Lifetime τ = L²/D" value={sci((Lum * 1e-4) ** 2 / D, 3)} unit="s" note="D = 30 cm²/s" />
          </>
        )
      }
      formulas={[
        { tex: 'D\\frac{\\mathrm{d}^2\\Delta n}{\\mathrm{d}x^2} - \\frac{\\Delta n}{\\tau} + G(x) = 0', label: 'Steady state, no field (from eq. 6.34)' },
        ...(mode === 'ex78' ? [{ tex: 'D_n\\frac{\\mathrm{d}\\Delta n}{\\mathrm{d}x}\\Big|_{W} = -S\\,\\Delta n(W)', label: 'Surface boundary condition' }] : []),
      ]}
      caption={
        mode === 'light'
          ? 'Wafer 300 µm, D = 30 cm²/s, generation G ∝ e^(−αx) from the front, excess removed at the rear (x = 300 µm, like a junction/contact). Numerical finite-difference solution.'
          : 'Self-derived, not official: the dots are the analytic solutions on this page, the line a numerical finite-difference solution of the same equation. Δn(0) = 0 (n₀ neglected).'
      }
      notice={
        mode === 'light' ? (
          <>
            <p>
              <strong>L sets the reach.</strong> Light is absorbed near the front, but the carriers spread over roughly a diffusion length. With L much longer than the wafer the profile is almost a straight
              line down to the collecting side; with short L it dies out after a few L and those carriers are lost.
            </p>
            <p>
              <strong>A bad front surface eats carriers</strong> where most are generated: raise the front S and the profile drops near x = 0. That is why passivation matters most for blue light.
            </p>
          </>
        ) : mode === 'ex77' ? (
          <p>
            <strong>Parabola plus straight lines.</strong> Inside the illuminated region generation bends the profile (constant curvature −G₀/D<sub>p</sub>). Outside there is no generation and no recombination
            (τ = ∞), so the profile is straight: a constant diffusion flow towards ±3L, where the carriers are removed. Value and slope match at ±L.
          </p>
        ) : (
          <>
            <p>
              <strong>S = 0: a parabola that flattens at the wall.</strong> No carriers leave at x = W, so the slope there is zero; all generated carriers diffuse back to x = 0, where they are removed.
            </p>
            <p>
              <strong>Raising S</strong> opens a second exit. The profile drops at x = W, its peak moves inside the bar, and for S → ∞ the surface acts like the contact at x = 0: a symmetric parabola with
              Δn(W) = 0. The quantity that decides is SW/D<sub>n</sub>.
            </p>
          </>
        )
      }
    >
      {mode === 'ex78' && (
        <Plot ariaLabel="Excess minority carrier profile for book exercise 7.8" x={{ domain: [0, 1], label: 'Position x / W', ticks: [0, 0.25, 0.5, 0.75, 1], format: (v) => String(v) }} y={{ domain: [0, 0.55], label: <>Δn (units of G<sub>L</sub>W²/D<sub>n</sub>)</> }} aspect={0.62}>
          <Line points={ex78.ref} color={C.ink2} dash="5 5" width={1.5} />
          <Line points={ex78.num} color={C.accent} width={2.5} />
          {ex78.exact.map(([x, y], i) => (
            <Dots key={i} x={x} y={y} />
          ))}
        </Plot>
      )}
      {mode === 'ex77' && (
        <Plot ariaLabel="Excess hole profile for book exercise 7.7" x={{ domain: [-3, 3], label: 'Position x / L', ticks: [-3, -2, -1, 0, 1, 2, 3], format: (v) => String(v) }} y={{ domain: [0, 2.8], label: <>Δp (units of G<sub>0</sub>L²/D<sub>p</sub>)</> }} aspect={0.62}>
          <Band x0={-1} x1={1} fill={C.washPhoton} />
          <Line points={ex77.num} color={C.accent} width={2.5} />
          {ex77.exact.map(([x, y], i) => (
            <Dots key={i} x={x} y={y} />
          ))}
        </Plot>
      )}
      {mode === 'light' && (
        <Plot ariaLabel="Excess carrier profile in an illuminated wafer" x={{ domain: [0, 300], label: 'Depth x', unit: 'µm' }} y={{ domain: [0, 1.05], label: 'Δn (relative to the perfect wafer)' }} aspect={0.62}>
          <Line points={light.refPts} color={C.ink2} dash="5 5" width={1.5} />
          <Line points={light.pts} color={C.accent} width={2.5} />
        </Plot>
      )}
    </DiagramFrame>
  );
}

function Dots({ x, y }: { x: number; y: number }) {
  const s = usePlot();
  return <circle cx={s.x(x)} cy={s.y(y)} r={3.5} fill="var(--dg-ink)" />;
}
