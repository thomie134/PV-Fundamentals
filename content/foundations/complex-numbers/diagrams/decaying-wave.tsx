import { useMemo, useState } from 'react';
import { C, DiagramFrame, Legend, Line, Plot, Readout, Slider, Term, fmt, sample } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';

const L0 = 600; // nm

export default function DecayingWave({ meta }: { meta: DiagramMeta }) {
  const [n, setN] = useState(1.5);
  const [kappa, setKappa] = useState(0.03);
  const env = (z: number) => Math.exp((-2 * Math.PI * kappa * z) / L0);
  const field = useMemo(() => sample((z) => env(z) * Math.cos((2 * Math.PI * n * z) / L0), 0, 3000, 900), [n, kappa]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = useMemo(() => sample(env, 0, 3000, 120), [kappa]); // eslint-disable-line react-hooks/exhaustive-deps
  const down = up.map(([z, v]) => [z, -v] as [number, number]);
  const intensity = up.map(([z, v]) => [z, v * v] as [number, number]);
  const alphaCm = (4 * Math.PI * kappa) / (L0 * 1e-7);
  return (
    <DiagramFrame
      meta={meta}
      ctx="optics"
      legend={
        <Legend
          items={[
            { label: 'Electric field of the wave', color: C.accent },
            { label: 'Envelope (field amplitude)', color: C.ink2, dash: true },
            { label: 'Intensity ∝ field²', color: C.s2 },
          ]}
        />
      }
      controls={
        <>
          <Slider label={<Term id="refractive-index">Real part n</Term>} value={n} min={1} max={4} step={0.05} onChange={setN} format={(v) => v.toFixed(2)} />
          <Slider label={<Term id="extinction-coefficient">Imaginary part κ</Term>} value={kappa} min={0} max={0.2} step={0.005} onChange={setKappa} format={(v) => v.toFixed(3)} />
        </>
      }
      readouts={
        <>
          <Readout label="Wavelength inside λ₀/n" value={fmt(L0 / n, 3)} unit="nm" />
          <Readout label={<Term id="absorption-coefficient">α = 4πκ/λ₀</Term>} value={fmt(alphaCm, 3)} unit="cm⁻¹" />
          <Readout label="Penetration depth 1/α" value={kappa > 0 ? fmt(1e7 / alphaCm, 3) : '∞'} unit={kappa > 0 ? 'nm' : undefined} emphasis />
        </>
      }
      formulas={[
        { tex: '\\tilde{n} = n + i\\kappa', label: 'Complex refractive index (eq. 4.21)' },
        { tex: '\\alpha = \\frac{4\\pi\\kappa}{\\lambda_0}', label: 'Absorption coefficient (eq. 4.26)' },
      ]}
      caption="Vacuum wavelength λ₀ = 600 nm; depth axis in nm."
      notice={
        <>
          <p>
            <strong>n squeezes the wave.</strong> A higher real part shortens the wavelength inside the material (λ₀/n) without changing how fast it fades.
          </p>
          <p>
            <strong>κ makes it fade.</strong> With κ = 0 the wave travels forever. Any κ above zero makes the amplitude decay exponentially; the intensity
            (amplitude squared) decays twice as fast, which is where the 4π in α = 4πκ/λ₀ comes from.
          </p>
        </>
      }
    >
      <Plot ariaLabel="Electric field of a light wave in an absorbing material" x={{ domain: [0, 3000], label: 'Depth z', unit: 'nm' }} y={{ domain: [-1.05, 1.05], label: 'Field / intensity', unit: 'norm.' }} aspect={0.5}>
        <Line points={up} color={C.ink2} dash="5 5" width={1.5} />
        <Line points={down} color={C.ink2} dash="5 5" width={1.5} />
        <Line points={intensity} color={C.s2} width={2} />
        <Line points={field} color={C.accent} width={1.75} />
      </Plot>
    </DiagramFrame>
  );
}
