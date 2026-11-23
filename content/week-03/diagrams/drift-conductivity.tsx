import { useMemo, useState } from 'react';
import { C, DiagramFrame, Dot, Legend, Line, Plot, Readout, Segmented, Slider, Term, fmt, sample, sci } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { SI_300K } from '@/physics/constants';
import { conductivity, equilibriumDensities, intrinsicDensity } from '@/physics/semiconductor';
import { driftCurrent } from '@/physics/transport';

type Kind = 'n' | 'p';
const MUN = SI_300K['mun-Si'];
const MUP = SI_300K['mup-Si'];
const NI = intrinsicDensity();

const sigmaFor = (kind: Kind, N: number) => {
  const d = kind === 'n' ? equilibriumDensities(N, 0, NI) : equilibriumDensities(0, N, NI);
  return conductivity(d.n, d.p, MUN, MUP);
};

export default function DriftConductivity({ meta }: { meta: DiagramMeta }) {
  const [kind, setKind] = useState<Kind>('n');
  const [logN, setLogN] = useState(16);
  const [field, setField] = useState(25);

  const N = 10 ** logN;
  const { n, p } = kind === 'n' ? equilibriumDensities(N, 0, NI) : equilibriumDensities(0, N, NI);
  const sigma = conductivity(n, p, MUN, MUP);
  const J = driftCurrent(n, p, MUN, MUP, field);
  const share = (n * MUN) / (n * MUN + p * MUP);

  const curves = useMemo(
    () => ({
      n: sample((x) => sigmaFor('n', x), 1e8, 1e19, 200, true),
      p: sample((x) => sigmaFor('p', x), 1e8, 1e19, 200, true),
    }),
    [],
  );

  return (
    <DiagramFrame
      meta={meta}
      ctx="transport"
      legend={
        <Legend
          items={[
            { label: 'n-type (phosphorus)', color: C.electron },
            { label: 'p-type (boron)', color: C.hole },
          ]}
        />
      }
      controls={
        <>
          <Segmented
            label="Dopant"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'n', label: 'Phosphorus (n)' },
              { value: 'p', label: 'Boron (p)' },
            ]}
          />
          <Slider label="Doping density" value={logN} min={8} max={19} step={0.1} unit="cm⁻³" onChange={setLogN} format={(v) => sci(10 ** v, 2)} marks={[{ value: 16, label: '10¹⁶' }, { value: Math.log10(5.84e16), label: 'ex. 7.6h' }]} />
          <Slider label={<Term id="electric-field">Electric field ξ</Term>} value={field} min={0} max={100} step={1} unit="V/cm" onChange={setField} format={(v) => v.toFixed(0)} marks={[{ value: 25, label: '25 V/cm' }]} />
        </>
      }
      readouts={
        <>
          <Readout label="Electrons n" value={sci(n, 3)} unit="cm⁻³" />
          <Readout label="Holes p" value={sci(p, 3)} unit="cm⁻³" />
          <Readout label={<Term id="conductivity">Conductivity σ</Term>} value={sigma < 1e-3 ? sci(sigma, 3) : fmt(sigma, 3)} unit="Ω⁻¹cm⁻¹" emphasis note={`resistivity ρ = 1/σ = ${1 / sigma < 1e-3 || 1 / sigma > 1e4 ? sci(1 / sigma, 2) : fmt(1 / sigma, 3)} Ω cm`} />
          <Readout label="Drift current density" value={J < 1e-3 ? sci(J, 3) : fmt(J, 3)} unit="A/cm²" emphasis />
          <Readout label="Share carried by electrons" value={fmt(100 * share, 3)} unit="%" />
          <Readout label={<><Term id="drift-velocity">Drift velocities</Term> μξ</>} value={<>{sci(MUN * field, 2)} / {sci(MUP * field, 2)}</>} unit="cm/s" note="electrons / holes; thermal velocity ≈ 10⁷ cm/s" />
        </>
      }
      formulas={[
        { tex: 'J_{\\mathrm{drift}} = q\\left(p\\mu_p + n\\mu_n\\right)\\xi', label: 'Eq. 6.25 (on the sheet)' },
        { tex: '\\sigma = q\\left(n\\mu_n + p\\mu_p\\right)', label: 'Conductivity (lecture 3 slide 24)' },
      ]}
      caption="300 K, sheet mobilities μn = 1360 and μp = 450 cm²/Vs kept constant (in reality they drop at high doping), nᵢ = 9.5 × 10⁹ cm⁻³."
      notice={
        <>
          <p>
            <strong>Two lines, a factor 3 apart.</strong> Above about 10¹² cm⁻³ the conductivity grows in proportion to the doping: only the majority carriers matter. The n-type line lies a factor
            μ<sub>n</sub>/μ<sub>p</sub> ≈ 3 above the p-type line, because electrons are more mobile.
          </p>
          <p>
            <strong>The floor is intrinsic.</strong> At very low doping both lines flatten at σ = qn<sub>i</sub>(μ<sub>n</sub> + μ<sub>p</sub>) ≈ 3 × 10⁻⁶ Ω⁻¹cm⁻¹: the thermally generated carriers
            dominate.
          </p>
          <p>
            <strong>Slow drift, fast jiggle.</strong> At 25 V/cm the drift velocity of electrons is about 3 × 10⁴ cm/s, hundreds of times smaller than the random thermal velocity. Drift is a small bias
            on top of a lot of random motion.
          </p>
        </>
      }
    >
      <Plot
        ariaLabel={`Conductivity versus doping; current point ${sigma.toExponential(1)} per ohm centimetre`}
        x={{ domain: [1e8, 1e19], log: true, label: 'Doping density', unit: 'cm⁻³' }}
        y={{ domain: [1e-6, 1e3], log: true, label: <Term id="conductivity">Conductivity σ</Term>, unit: 'Ω⁻¹cm⁻¹' }}
        aspect={0.7}
        hover={{
          series: [
            { label: 'n-type', color: C.electron, points: curves.n, format: (v) => sci(v, 2) },
            { label: 'p-type', color: C.hole, points: curves.p, format: (v) => sci(v, 2) },
          ],
          xFormat: (v) => sci(v, 2),
        }}
      >
        <Line points={curves.p} color={C.hole} width={2} />
        <Line points={curves.n} color={C.electron} width={2} />
        <Dot x={N} y={sigma} color={kind === 'n' ? C.electron : C.hole} />
      </Plot>
    </DiagramFrame>
  );
}
