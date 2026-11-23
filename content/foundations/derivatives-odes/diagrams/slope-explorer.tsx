import { useMemo, useState } from 'react';
import { C, DiagramFrame, Dot, Legend, Line, Plot, Readout, Segmented, Slider, Term, fmt, sample } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';

type Shape = 'exp' | 'parabola';

export default function SlopeExplorer({ meta }: { meta: DiagramMeta }) {
  const [shape, setShape] = useState<Shape>('exp');
  const [x0, setX0] = useState(1);
  const [L, setL] = useState(1.5);

  const f = (x: number) => (shape === 'exp' ? Math.exp(-x / L) : x * (4 - x) / 4);
  const df = (x: number) => (shape === 'exp' ? -Math.exp(-x / L) / L : (4 - 2 * x) / 4);
  const d2f = (x: number) => (shape === 'exp' ? Math.exp(-x / L) / (L * L) : -0.5);

  const curve = useMemo(() => sample(f, 0, 4, 200), [shape, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const y0 = f(x0);
  const s = df(x0);
  const tangent: [number, number][] = [
    [x0 - 0.9, y0 - 0.9 * s],
    [x0 + 0.9, y0 + 0.9 * s],
  ];

  return (
    <DiagramFrame
      meta={meta}
      ctx="math"
      legend={
        <Legend
          items={[
            { label: shape === 'exp' ? 'y = e^(−x/L)' : 'y = x(4 − x)/4', color: C.accent },
            { label: 'tangent (slope at the point)', color: C.electron, dash: true },
          ]}
        />
      }
      controls={
        <>
          <Segmented
            label="Profile"
            value={shape}
            onChange={setShape}
            options={[
              { value: 'exp', label: 'Exponential decay' },
              { value: 'parabola', label: 'Parabola' },
            ]}
          />
          <Slider label="Point x" value={x0} min={0} max={4} step={0.05} onChange={setX0} format={(v) => v.toFixed(2)} />
          {shape === 'exp' && <Slider label="Decay length L" value={L} min={0.5} max={3} step={0.05} onChange={setL} format={(v) => v.toFixed(2)} />}
        </>
      }
      readouts={
        <>
          <Readout label="y" value={fmt(y0, 3)} />
          <Readout label={<Term id="derivative">Slope y′</Term>} value={fmt(s, 3)} emphasis note={shape === 'exp' ? <>= −y/L = {fmt(-y0 / L, 3)}</> : 'falls linearly with x'} />
          <Readout label="Curvature y″" value={fmt(d2f(x0), 3)} note={shape === 'exp' ? <>= y/L² → solves y″ = y/L²</> : 'constant → solves y″ = −c'} />
        </>
      }
      formulas={shape === 'exp' ? [{ tex: 'y = e^{-x/L}, \\quad y\' = -\\frac{y}{L}, \\quad y\'\' = \\frac{y}{L^2}' }] : [{ tex: 'y = -\\frac{c}{2}x^2 + C_1x + C_0, \\quad y\'\' = -c' }]}
      notice={
        <>
          <p>
            <strong>Exponential: slope proportional to the value.</strong> Wherever you put the point, the slope is −y/L: big near the start, small in the tail. That is why a minority-carrier profile
            e<sup>−x/L</sup> drives a large diffusion current where the density is high and almost none deep inside.
          </p>
          <p>
            <strong>Parabola: constant curvature.</strong> The slope changes at the same rate everywhere, and it is zero at the top. In book ex. 7.8 that top (zero slope, no flow) sits at a wall where
            no carriers can leave.
          </p>
        </>
      }
    >
      <Plot ariaLabel={`Curve with its tangent at x = ${x0.toFixed(2)}`} x={{ domain: [0, 4], label: 'x' }} y={{ domain: [0, 1.15], label: 'y' }} aspect={0.6}>
        <Line points={curve} color={C.accent} width={2.5} />
        <Line points={tangent} color={C.electron} dash="6 4" width={2} />
        <Dot x={x0} y={y0} color={C.electron} />
      </Plot>
    </DiagramFrame>
  );
}
