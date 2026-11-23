import { useMemo, useState } from 'react';
import { Area, C, DiagramFrame, Dot, HRule, Line, Plot, PlotLabel, Readout, Slider, Term, Toggle, VRule, fmt, sample } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';

export default function ExpDecay({ meta }: { meta: DiagramMeta }) {
  const [L, setL] = useState(2);
  const [x, setX] = useState(3);
  const [log, setLog] = useState(false);
  const curve = useMemo(() => sample((v) => Math.exp(-v / L), 0, 10, 200), [L]);
  const y = Math.exp(-x / L);
  return (
    <DiagramFrame
      meta={meta}
      ctx="math"
      controls={
        <>
          <Slider label="Decay length L" value={L} min={0.5} max={5} step={0.1} onChange={setL} format={(v) => v.toFixed(1)} />
          <Slider label="Position x" value={x} min={0} max={10} step={0.1} onChange={setX} format={(v) => v.toFixed(1)} />
          <Toggle label={<>Logarithmic y-axis (<Term id="log-scale">log scale</Term>)</>} checked={log} onChange={setLog} />
        </>
      }
      readouts={
        <>
          <Readout label="Left: e^(−x/L)" value={fmt(100 * y, 3)} unit="%" emphasis />
          <Readout label="Removed so far" value={fmt(100 * (1 - y), 3)} unit="%" />
          <Readout label="x where 37 % is left" value={fmt(L, 3)} note="= L" />
          <Readout label="x where 10 % is left" value={fmt(L * Math.log(10), 3)} note="= L · ln 10" />
        </>
      }
      formulas={[{ tex: 'y = e^{-x/L} \\quad\\Leftrightarrow\\quad x = -L\\ln y' }]}
      notice={
        <>
          <p>
            <strong>Same fraction per step.</strong> Every step of size L multiplies y by 1/e ≈ 0.37, wherever you start. That is why doubling a solar cell’s
            thickness never doubles its absorption.
          </p>
          <p>
            <strong>Straight on a log axis.</strong> Switch on the log scale: the curve becomes a straight line whose slope is set by L. Week 2’s carrier
            densities and the absorption spectrum of silicon are drawn on log axes for this reason.
          </p>
        </>
      }
    >
      <Plot
        ariaLabel="Exponential decay"
        x={{ domain: [0, 10], label: 'x' }}
        y={log ? { domain: [1e-4, 1], log: true, label: 'y = e^(−x/L)' } : { domain: [0, 1.05], label: 'y = e^(−x/L)' }}
        aspect={0.55}
        hover={{ series: [{ label: 'y', color: C.accent, points: curve, format: (v) => v.toPrecision(3) }], xFormat: (v) => `x = ${v.toFixed(2)}` }}
      >
        {!log && <Area points={curve} />}
        <Line points={curve} color={C.accent} />
        <HRule y={1 / Math.E} />
        <PlotLabel x={9.8} y={1 / Math.E} anchor="end" valign="bottom" dy={-3} className="plot__label--plain">
          1/e ≈ 37 %
        </PlotLabel>
        <VRule x={L} color={C.ink2} />
        <Dot x={x} y={y} />
      </Plot>
    </DiagramFrame>
  );
}
