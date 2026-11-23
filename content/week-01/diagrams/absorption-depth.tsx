import { useMemo, useState } from 'react';
import { Area, C, DiagramFrame, Dot, Legend, Line, Plot, PlotLabel, Readout, Slider, Term, Toggle, VRule, fmt, sample } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { siOptical } from '@/physics/materials';
import { photonEnergyEV } from '@/physics/radiation';
import { reflectanceNormal } from '@/physics/optics';

export default function AbsorptionDepth({ meta }: { meta: DiagramMeta }) {
  const [lambda, setLambda] = useState(800);
  const [t, setT] = useState(180); // µm
  const [mirror, setMirror] = useState(false);
  const [front, setFront] = useState(false);

  const { n, kappa, alphaCm } = siOptical(lambda);
  const alphaUm = alphaCm * 1e-4; // µm⁻¹
  const dp = 1 / alphaUm; // µm
  const single = 1 - Math.exp(-alphaUm * t);
  const double = 1 - Math.exp(-2 * alphaUm * t);
  const A = mirror ? double : single;
  const R = reflectanceNormal(1, n);
  const total = front ? (1 - R) * A : A;
  const I0 = front ? 1 - R : 1;

  const alphaCurve = useMemo(() => sample((w) => siOptical(w).alphaCm, 300, 1200, 240), []);
  const fwd = useMemo(() => sample((z) => I0 * Math.exp(-alphaUm * z), 0, t, 160), [alphaUm, t, I0]);
  const back = useMemo(() => sample((z) => I0 * Math.exp(-alphaUm * t) * Math.exp(-alphaUm * (t - z)), 0, t, 160), [alphaUm, t, I0]);

  return (
    <DiagramFrame
      meta={meta}
      ctx="optics"
      controls={
        <>
          <Slider
            label={<Term id="wavelength">Wavelength</Term>}
            value={lambda}
            min={300}
            max={1200}
            step={5}
            unit="nm"
            onChange={setLambda}
            format={(v) => v.toFixed(0)}
            marks={[
              { value: 450, label: 'blue 450' },
              { value: 650, label: 'ex. 7.5: 650' },
              { value: 1000, label: 'Q1: 1000' },
              { value: 1100, label: '1100' },
            ]}
          />
          <Slider label="Wafer thickness t" value={t} min={1} max={500} unit="µm" log onChange={setT} format={(v) => fmt(v, 3)} marks={[{ value: 2, label: 'thin film 2 µm' }, { value: 100, label: '100 µm' }, { value: 180, label: 'wafer 180 µm' }]} />
          <Toggle label={<>Perfect <Term id="light-trapping">back reflector</Term> (two passes)</>} checked={mirror} onChange={setMirror} />
          <Toggle label="Include front reflection (bare c-Si)" checked={front} onChange={setFront} />
        </>
      }
      readouts={
        <>
          <Readout label="c-Si at this λ: n, κ" value={`${n.toFixed(2)}, ${fmt(kappa, 2)}`} note={`photon energy ${photonEnergyEV(lambda).toFixed(2)} eV`} />
          <Readout label={<Term id="absorption-coefficient">α = 4πκ/λ₀</Term>} value={fmt(alphaCm, 3)} unit="cm⁻¹" />
          <Readout label={<Term id="penetration-depth">Penetration depth 1/α</Term>} value={fmt(dp, 3)} unit="µm" />
          <Readout label="Single pass A = 1 − e^(−αt)" value={fmt(100 * single, 3)} unit="%" />
          <Readout label="With back reflector" value={fmt(100 * double, 3)} unit="%" />
          <Readout label={front ? 'Absorbed incl. front reflection' : 'Absorbed (this setting)'} value={fmt(100 * total, 3)} unit="%" emphasis note={front ? `(1 − R) × A, R = ${(100 * R).toFixed(1)} %` : undefined} />
        </>
      }
      formulas={[
        { tex: '\\alpha = \\frac{4\\pi\\kappa}{\\lambda_0}', label: 'Absorption coefficient (eq. 4.26)' },
        { tex: 'I(z) = I_0 \\exp(-\\alpha z)', label: 'Lambert–Beer law (eq. 4.25)' },
        { tex: 'A = 1 - \\frac{I(t)}{I_0} = 1 - e^{-\\alpha t}', label: 'Absorptance, single pass (lecture 1 slide 83)' },
      ]}
      caption="c-Si optical constants: M. A. Green (2008), external reference data. The course’s values agree (ex. 7.5: ñ = 3.84 + 0.015i at 650 nm; Q1: n = 3.57 at 1000 nm)."
      notice={
        <>
          <p>
            <strong>Blue vs infrared.</strong> At 450 nm, α ≈ 2.4 × 10⁴ cm⁻¹: the light is mostly gone within half a micrometre, so even a 2 µm film absorbs it all. At
            1000 nm, α = 64 cm⁻¹ and δp ≈ 156 µm: a 180 µm wafer absorbs only about two thirds in one pass. At 1100 nm, just above the 1.12 eV gap, almost
            everything leaks out.
          </p>
          <p>
            <strong>The curve is an exponential.</strong> Each micrometre removes the same <em>fraction</em> of what is left. Doubling the thickness (or switching
            on the reflector) never doubles the absorption once a good part is already absorbed: 50 % per pass becomes 75 %, not 100 %.
          </p>
          <p>
            <strong>Why light trapping is worth it.</strong> The back reflector helps a lot for weakly absorbed light (900–1100 nm) and does nothing for blue light.
            With texture and total internal reflection the light makes many passes; that is how thin wafers still collect the infrared.
          </p>
        </>
      }
    >
      <div className="stack">
        <Plot
          ariaLabel="Absorption coefficient of crystalline silicon versus wavelength"
          x={{ domain: [300, 1200], label: <Term id="wavelength">Wavelength</Term>, unit: 'nm' }}
          y={{ domain: [1e-1, 1e7], log: true, label: <Term id="absorption-coefficient">α of c-Si</Term>, unit: 'cm⁻¹' }}
          aspect={0.3}
          minHeight={170}
          maxHeight={210}
          hover={{ series: [{ label: 'α', color: C.ink2, points: alphaCurve, format: (v) => `${fmt(v, 3)} cm⁻¹` }], xFormat: (v) => `${v.toFixed(0)} nm` }}
        >
          <Line points={alphaCurve} color={C.ink2} width={2} />
          <VRule x={lambda} color={C.accent} dash="3 3" />
          <Dot x={lambda} y={alphaCm} color={C.accent} />
        </Plot>
        <Legend
          items={[
            { label: 'Forward pass I(z)/I₀', color: C.accent },
            ...(mirror ? [{ label: 'After the back reflector', color: C.accent, dash: true }] : []),
            { label: 'Absorbed on the way in', color: C.wash, kind: 'area' as const },
          ]}
        />
        <Plot
          ariaLabel={`Light intensity versus depth in a ${t} micrometre silicon wafer at ${lambda} nanometres`}
          x={{ domain: [0, t], label: 'Depth z', unit: 'µm' }}
          y={{ domain: [0, 1.05], label: <Term id="lambert-beer">Intensity I(z)/I₀</Term> }}
          aspect={0.5}
          minHeight={220}
          hover={{
            series: [
              { label: 'forward', color: C.accent, points: fwd, format: (v) => `${(100 * v).toFixed(1)} %` },
              ...(mirror ? [{ label: 'return', color: C.accent, points: back, format: (v: number) => `${(100 * v).toFixed(1)} %` }] : []),
            ],
            xFormat: (v) => `${fmt(v, 3)} µm`,
          }}
        >
          <Area points={fwd} baseline={fwd[fwd.length - 1][1]} />
          <Line points={fwd} color={C.accent} width={2.5} />
          {mirror && <Line points={back} color={C.accent} width={2} dash="6 4" />}
          {dp < t && (
            <>
              <VRule x={dp} color={C.ink2} />
              <PlotLabel x={dp} y={0.98} dx={6} valign="top">
                δ<sub>p</sub> = 1/α: 37 % left
              </PlotLabel>
            </>
          )}
          <PlotLabel x={t} y={fwd[fwd.length - 1][1]} dx={-6} dy={-6} anchor="end" valign="bottom">
            {(100 * fwd[fwd.length - 1][1]).toFixed(1)} % reaches the back
          </PlotLabel>
        </Plot>
      </div>
    </DiagramFrame>
  );
}
