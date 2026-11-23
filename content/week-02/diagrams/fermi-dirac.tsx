import { useMemo, useState } from 'react';
import { C, DiagramFrame, Dot, HRule, Legend, Line, Plot, PlotLabel, Readout, Slider, Term, Toggle, VRule, fmt, sample, sci } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { boltzmann, fermiDirac, kTeV } from '@/physics/semiconductor';

const REFS = [100, 200, 300, 400];

export default function FermiDirac({ meta }: { meta: DiagramMeta }) {
  const [T, setT] = useState(300);
  const [dE, setDE] = useState(0.1);
  const [showB, setShowB] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  const kT = kTeV(T);
  const fd = useMemo(() => sample((e) => fermiDirac(e, T), -0.3, 0.3, 241), [T]);
  const bz = useMemo(() => sample((e) => boltzmann(e, T), -0.3, 0.3, 241).filter(([, v]) => v <= 1.25), [T]);
  const refs = useMemo(() => REFS.map((t) => sample((e) => fermiDirac(e, t), -0.3, 0.3, 161)), []);
  const f = fermiDirac(dE, T);
  const fb = boltzmann(dE, T);
  const err = f > 0 ? (fb - f) / f : 0;

  return (
    <DiagramFrame
      meta={meta}
      ctx="semiconductor"
      legend={
        <Legend
          items={[
            { label: `Fermi–Dirac at ${T} K`, color: C.accent },
            ...(showB ? [{ label: 'Boltzmann approximation', color: C.electron, dash: true }] : []),
            ...(showRefs ? [{ label: '100, 200, 300, 400 K (slide 44)', color: C.ink2 }] : []),
          ]}
        />
      }
      controls={
        <>
          <Slider label={<Term id="kelvin">Temperature T</Term>} value={T} min={0} max={600} step={5} unit="K" onChange={setT} format={(v) => v.toFixed(0)} marks={[{ value: 300, label: '300 K' }]} />
          <Slider label={<>Energy E − E<sub>F</sub></>} value={dE} min={-0.3} max={0.3} step={0.005} unit="eV" onChange={setDE} format={(v) => v.toFixed(3)} />
          <Toggle label="Show the Boltzmann approximation" checked={showB} onChange={setShowB} />
          <Toggle label="Show the lecture’s temperatures" checked={showRefs} onChange={setShowRefs} />
        </>
      }
      readouts={
        <>
          <Readout label={<Term id="thermal-energy">k<sub>B</sub>T</Term>} value={fmt(kT, 3)} unit="eV" note={<>3k<sub>B</sub>T = {fmt(3 * kT, 3)} eV</>} />
          <Readout label={<>f(E) at E − E<sub>F</sub> = {dE.toFixed(3)} eV</>} value={f < 1e-3 ? sci(f, 3) : fmt(f, 3)} emphasis note={`probability that a state there is filled; empty: ${fmt(1 - f, 3)}`} />
          <Readout label="Boltzmann value" value={fb < 1e-3 ? sci(fb, 3) : fmt(fb, 3)} note={T === 0 ? '' : `${err >= 0 ? '+' : ''}${fmt(100 * err, 2)} % vs Fermi–Dirac`} />
        </>
      }
      formulas={[
        { tex: 'f(E) = \\frac{1}{1 + \\exp\\left(\\frac{E - E_F}{k_BT}\\right)}', label: 'Fermi–Dirac (eq. 6.3, not on the sheet)' },
        { tex: 'f_B(E) = \\exp\\left(-\\frac{E - E_F}{k_BT}\\right)', label: <>Boltzmann approximation, for E − E<sub>F</sub> ≥ 3k<sub>B</sub>T (slide 47)</> },
      ]}
      notice={
        <>
          <p>
            <strong>Always ½ at E<sub>F</sub>.</strong> Whatever the temperature, the curve passes through ½ at E = E<sub>F</sub>. At 0 K it is a sharp step; heating softens the step
            over a width of a few k<sub>B</sub>T (≈ 0.026 eV at 300 K), so some states above E<sub>F</sub> fill and some below empty.
          </p>
          <p>
            <strong>Where Boltzmann works.</strong> More than 3k<sub>B</sub>T above E<sub>F</sub> the dashed curve lies on top of the Fermi–Dirac curve (about 5 % off at exactly 3k<sub>B</sub>T,
            less beyond). Near and below E<sub>F</sub> it is useless: it even exceeds 1. In c-Si E<sub>C</sub> lies ≥ 0.15 eV above E<sub>F</sub> for normal doping, so the
            approximation behind n = N<sub>C</sub> e<sup>(E<sub>F</sub>−E<sub>C</sub>)/kT</sup> holds.
          </p>
          <p>
            <strong>Tiny numbers.</strong> Set E − E<sub>F</sub> to 0.3 eV: f ≈ 10⁻⁵. At the conduction band edge of intrinsic silicon (0.57 eV above E<sub>F</sub>) f is only about 3 × 10⁻¹⁰,
            which is why a band with 10¹⁹ states holds just 10¹⁰ electrons.
          </p>
        </>
      }
    >
      <Plot
        ariaLabel={`Fermi–Dirac distribution at ${T} kelvin`}
        x={{ domain: [-0.3, 0.3], label: <>Energy E − E<sub>F</sub></>, unit: 'eV' }}
        y={{ domain: [0, 1.1], label: <Term id="fermi-dirac">Occupation probability f(E)</Term>, ticks: [0, 0.25, 0.5, 0.75, 1], format: (v) => String(v) }}
        aspect={0.66}
        hover={{
          series: [
            { label: 'Fermi–Dirac', color: C.accent, points: fd },
            ...(showB ? [{ label: 'Boltzmann', color: C.electron, points: bz }] : []),
          ],
          xFormat: (v) => `${v.toFixed(3)} eV`,
        }}
      >
        {T > 0 && <VRule x={3 * kT} color={C.ink2} dash="3 4" width={1.25} />}
        {T > 0 && 3 * kT < 0.27 && (
          <PlotLabel x={3 * kT} y={0.95} dx={5} valign="top" className="plot__label--plain">
            3k<sub>B</sub>T
          </PlotLabel>
        )}
        <HRule y={0.5} color={C.grid} dash="2 4" width={1} />
        {showRefs && refs.map((pts, i) => <Line key={i} points={pts} color={C.ink2} width={1.25} opacity={0.55} />)}
        {showB && <Line points={bz} color={C.electron} dash="6 4" width={2} />}
        <Line points={fd} color={C.accent} width={2.5} />
        <Dot x={dE} y={f} color={C.accent} />
        <PlotLabel x={0} y={0.5} dx={6} dy={-4} valign="bottom">
          f(E<sub>F</sub>) = ½
        </PlotLabel>
      </Plot>
    </DiagramFrame>
  );
}
