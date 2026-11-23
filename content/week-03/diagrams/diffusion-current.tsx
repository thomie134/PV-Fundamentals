import { useState } from 'react';
import { Arrow, C, DiagramFrame, Legend, Line, Plot, PlotLabel, Readout, Segmented, Slider, Term, fmt, sci, usePlot } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { diffusionCurrentN, diffusionCurrentP, einsteinD } from '@/physics/transport';
import { Q } from '@/physics/constants';

type Carrier = 'e' | 'h';

/** Flux / current arrows drawn in the middle of the plot. */
function FlowArrows({ flowRight, currentRight, color, yMax }: { flowRight: boolean; currentRight: boolean; color: string; yMax: number }) {
  const { x, y } = usePlot();
  const yA = y(yMax * 0.86);
  const yB = y(yMax * 0.74);
  const xa = x(0.3);
  const xb = x(0.7);
  return (
    <g>
      <Arrow x1={flowRight ? xa : xb} x2={flowRight ? xb : xa} y1={yA} y2={yA} color={color} width={2.5} />
      <Arrow x1={currentRight ? xa : xb} x2={currentRight ? xb : xa} y1={yB} y2={yB} color="var(--dg-ink)" width={2.5} dash="6 4" />
    </g>
  );
}

export default function DiffusionCurrent({ meta }: { meta: DiagramMeta }) {
  const [carrier, setCarrier] = useState<Carrier>('e');
  const [left, setLeft] = useState(2.7); // × 10¹⁶ cm⁻³
  const [right, setRight] = useState(0.1);
  const [dist, setDist] = useState(2); // µm
  const [D, setD] = useState(36);
  const [mu, setMu] = useState(1350);

  const d = dist * 1e-4; // cm
  const grad = ((right - left) * 1e16) / d; // cm⁻⁴, along +x
  const J = carrier === 'e' ? diffusionCurrentN(D, grad) : diffusionCurrentP(D, grad);
  const flowRight = grad < 0; // particles flow down the gradient
  const currentRight = J > 0;
  const color = carrier === 'e' ? C.electron : C.hole;
  const yMax = Math.max(left, right, 0.5) * 1.25;
  const nLow = Math.min(left, right) * 1e16;
  const nHigh = Math.max(left, right) * 1e16;
  const fieldAt = (nv: number) => Math.abs(J) / (Q * nv * mu);
  const muEinstein = D / einsteinD(1);

  return (
    <DiagramFrame
      meta={meta}
      ctx="transport"
      legend={
        <Legend
          items={[
            { label: `${carrier === 'e' ? 'electron' : 'hole'} density profile, with arrow: particle flow`, color },
            { label: 'current direction', color: C.ink, dash: true },
          ]}
        />
      }
      controls={
        <>
          <Segmented
            label="Carriers"
            value={carrier}
            onChange={setCarrier}
            options={[
              { value: 'e', label: 'Electrons' },
              { value: 'h', label: 'Holes' },
            ]}
          />
          <Slider label="Density at x = 0" value={left} min={0} max={5} step={0.05} unit="× 10¹⁶ cm⁻³" onChange={setLeft} format={(v) => v.toFixed(2)} marks={[{ value: 2.7, label: 'ex. 6.14' }]} />
          <Slider label="Density at x = d" value={right} min={0} max={5} step={0.05} unit="× 10¹⁶ cm⁻³" onChange={setRight} format={(v) => v.toFixed(2)} marks={[{ value: 0.1, label: 'ex. 6.14' }]} />
          <Slider label="Distance d" value={dist} min={0.5} max={10} step={0.1} unit="µm" onChange={setDist} format={(v) => v.toFixed(1)} marks={[{ value: 2, label: '2 µm' }]} />
          <Slider label={<Term id="diffusion-coefficient">Diffusion coefficient D</Term>} value={D} min={5} max={40} step={0.5} unit="cm²/s" onChange={setD} format={(v) => v.toFixed(1)} marks={[{ value: 36, label: 'ex. 6.14' }, { value: 11.6, label: 'Dₚ (Einstein)' }]} />
          <Slider label={<Term id="mobility">Mobility μ</Term>} value={mu} min={300} max={1500} step={10} unit="cm²/Vs" onChange={setMu} format={(v) => v.toFixed(0)} marks={[{ value: 1350, label: 'ex. 6.15' }, { value: 450, label: 'μₚ' }]} />
        </>
      }
      readouts={
        <>
          <Readout label={<>Gradient d{carrier === 'e' ? 'n' : 'p'}/dx</>} value={sci(grad, 3)} unit="cm⁻⁴" />
          <Readout label={<Term id="diffusion">Diffusion current density</Term>} value={fmt(J, 4)} unit="A/cm²" emphasis note={currentRight ? 'points in +x' : J < 0 ? 'points in −x' : 'no gradient, no current'} />
          <Readout label="Field to cancel it, at the low density" value={nLow > 0 ? fmt(fieldAt(nLow), 4) : '∞'} unit="V/cm" note={`n = ${sci(nLow, 2)} (answer book ex. 6.15)`} />
          <Readout label="…at the high density" value={nHigh > 0 ? fmt(fieldAt(nHigh), 4) : '–'} unit="V/cm" />
          <Readout label={<>Einstein check: D/(k<sub>B</sub>T/q)</>} value={fmt(muEinstein, 4)} unit="cm²/Vs" note="mobility that belongs to this D" />
        </>
      }
      formulas={[
        { tex: carrier === 'e' ? 'J_{n,\\mathrm{diff}} = qD_n\\frac{\\mathrm{d}n}{\\mathrm{d}x}' : 'J_{p,\\mathrm{diff}} = -qD_p\\frac{\\mathrm{d}p}{\\mathrm{d}x}', label: 'Eq. 6.26 (lecture 3 slide 22)' },
        { tex: '\\frac{D_n}{\\mu_n} = \\frac{k_BT}{q}', label: 'Einstein relation (eq. 6.28)' },
        { tex: '\\xi = \\frac{J_{n,\\mathrm{diff}}}{qn\\mu_n}', label: 'Drift balancing diffusion (ex. 6.15)' },
      ]}
      notice={
        <>
          <p>
            <strong>Particles always go downhill.</strong> Electrons and holes both flow from high to low density (solid arrow). The <em>current</em> (dashed) follows the holes but opposes the
            electrons, because of their negative charge. That is the minus sign in J<sub>p</sub> = −qD<sub>p</sub> dp/dx.
          </p>
          <p>
            <strong>Steeper means more.</strong> The current is proportional to the slope, not to the density itself: double the density difference, or halve the distance, and J doubles. Make
            both ends equal and the current vanishes, however high the density.
          </p>
          <p>
            <strong>Big numbers.</strong> Ex. 6.14 gives 750 A/cm², an enormous current density, because the gradient is steep (2.6 × 10¹⁶ cm⁻³ over 2 µm). Cancelling it with drift needs
            thousands of V/cm at the low-density end: such fields exist in a p-n junction (week 4).
          </p>
        </>
      }
    >
      <Plot
        ariaLabel={`Linear density profile from ${left} to ${right} times ten to the sixteen over ${dist} micrometres; diffusion current ${J.toFixed(0)} amperes per square centimetre`}
        x={{ domain: [0, 1], label: <>Position x / d (d = {dist.toFixed(1)} µm)</>, ticks: [0, 0.25, 0.5, 0.75, 1], format: (v) => String(v) }}
        y={{ domain: [0, yMax], label: carrier === 'e' ? 'Electron density n' : 'Hole density p', unit: '10¹⁶ cm⁻³' }}
        aspect={0.62}
      >
        <Line
          points={[
            [0, left],
            [1, right],
          ]}
          color={color}
          width={2.5}
        />
        {Math.abs(grad) > 0 && <FlowArrows flowRight={flowRight} currentRight={currentRight} color={color} yMax={yMax} />}
        <PlotLabel x={0} y={left} dx={8} dy={-6} valign="bottom" className="plot__label--plain">
          {left.toFixed(2)}
        </PlotLabel>
        <PlotLabel x={1} y={right} dx={-8} dy={-6} anchor="end" valign="bottom" className="plot__label--plain">
          {right.toFixed(2)}
        </PlotLabel>
      </Plot>
    </DiagramFrame>
  );
}
