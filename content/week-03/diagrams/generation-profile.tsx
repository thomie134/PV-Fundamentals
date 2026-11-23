import { useMemo, useState } from 'react';
import { C, DiagramFrame, Dot, Legend, Line, Plot, Readout, Slider, Term, Toggle, VRule, fmt, sample, sci } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { NM, UM } from '@/physics/constants';
import { siOptical } from '@/physics/materials';
import { alphaFromKappa, reflectanceNormal } from '@/physics/optics';
import { photonFluxMono } from '@/physics/radiation';
import { generationRate } from '@/physics/transport';

const X_MAX = 200; // µm

export default function GenerationProfile({ meta }: { meta: DiagramMeta }) {
  const [wl, setWl] = useState(650);
  const [book, setBook] = useState(false);
  const [depth, setDepth] = useState(50);
  const [compare, setCompare] = useState(true);

  const optics = (nm: number) => {
    if (book) return { n: 3.84, kappa: 0.015 };
    return siOptical(nm);
  };
  const lam = book ? 650 : wl;
  const o = optics(lam);
  const alpha = alphaFromKappa(o.kappa, lam * NM); // m⁻¹
  const R = reflectanceNormal(1, o.n);
  const phi0 = photonFluxMono(1000, lam * NM); // m⁻² s⁻¹
  const G = (xUm: number) => generationRate(phi0, alpha, xUm * UM, R) / 1e6; // cm⁻³ s⁻¹
  const curve = useMemo(() => sample(G, 0, X_MAX, 300), [alpha, R, phi0]); // eslint-disable-line react-hooks/exhaustive-deps
  const refs = useMemo(
    () =>
      [450, 1000].map((nm) => {
        const s = siOptical(nm);
        const a = alphaFromKappa(s.kappa, nm * NM);
        const r = reflectanceNormal(1, s.n);
        const f = photonFluxMono(1000, nm * NM);
        return sample((x) => generationRate(f, a, x * UM, r) / 1e6, 0, X_MAX, 300);
      }),
    [],
  );
  const absorbedIn = (um: number) => 1 - Math.exp(-alpha * um * UM);

  return (
    <DiagramFrame
      meta={meta}
      ctx="transport"
      legend={
        <Legend
          items={[
            { label: book ? 'book ex. 7.5 (650 nm, κ = 0.015)' : `${wl} nm`, color: C.accent },
            ...(compare ? [{ label: '450 nm (blue)', color: C.s2 }, { label: '1000 nm (near-IR)', color: C.electron }] : []),
          ]}
        />
      }
      controls={
        <>
          <Slider label={<Term id="wavelength">Wavelength</Term>} value={wl} min={350} max={1150} step={5} unit="nm" onChange={setWl} format={(v) => v.toFixed(0)} marks={[{ value: 450, label: '450' }, { value: 650, label: '650' }, { value: 1000, label: '1000' }]} />
          <Toggle label="Use the data of book ex. 7.5 (n = 3.84, κ = 0.015 at 650 nm)" checked={book} onChange={setBook} />
          <Slider label="Depth x" value={depth} min={0} max={X_MAX} step={1} unit="µm" onChange={setDepth} format={(v) => v.toFixed(0)} marks={[{ value: 50, label: 'ex. 7.5' }]} />
          <Toggle label="Compare with 450 nm and 1000 nm" checked={compare} onChange={setCompare} />
        </>
      }
      readouts={
        <>
          <Readout label={<Term id="absorption-coefficient">α</Term>} value={sci(alpha / 100, 3)} unit="cm⁻¹" note={`absorption length 1/α = ${fmt(1e6 / alpha, 3)} µm`} />
          <Readout label={<Term id="reflectance">Front reflectance R</Term>} value={fmt(R, 3)} />
          <Readout label="Photon flux inside, Φ(0)" value={sci((1 - R) * phi0, 3)} unit="m⁻² s⁻¹" note={`incident Φ₀ = ${sci(phi0, 3)} (1000 W/m²)`} />
          <Readout label={<><Term id="generation-rate">G</Term> at x = {depth} µm</>} value={sci(G(depth), 3)} unit="cm⁻³ s⁻¹" emphasis note={`= ${sci(G(depth) * 1e6, 3)} m⁻³ s⁻¹`} />
          <Readout label="Absorbed in the first 1 µm / 100 µm" value={`${fmt(100 * absorbedIn(1), 3)} % / ${fmt(100 * absorbedIn(100), 3)} %`} note="of the light that enters" />
        </>
      }
      formulas={[
        { tex: 'G_{L,\\lambda}(x) = \\eta_g\\,\\Phi^0_{\\mathrm{ph},\\lambda}\\,\\alpha(\\lambda)\\exp\\left[-\\alpha(\\lambda)x\\right]', label: 'Eq. 7.4 (on the sheet); here × (1 − R)' },
        { tex: '\\alpha = \\frac{4\\pi\\kappa}{\\lambda_0}', label: 'Eq. 4.26' },
      ]}
      caption={book ? 'Book ex. 7.5 data. ηg = 1, normal incidence, no light coming back from the rear.' : 'c-Si optical data: Green (2008), external reference data. ηg = 1, 1000 W/m² monochromatic, normal incidence, no rear reflection.'}
      notice={
        <>
          <p>
            <strong>Short wavelengths: all at the surface.</strong> At 450 nm α ≈ 2 × 10⁴ cm⁻¹: the light is gone within a couple of micrometres and G is enormous right at the front. Carriers generated
            there are close to the front surface, so surface recombination matters for blue light.
          </p>
          <p>
            <strong>Long wavelengths: spread through the wafer.</strong> At 1000 nm α ≈ 60 cm⁻¹: G is small but almost constant over 200 µm, and much of the light reaches the rear. These carriers need
            a long diffusion length to reach the junction.
          </p>
          <p>
            <strong>Log axis, straight lines.</strong> On the log axis each profile is a straight line with slope −α: steeper means more strongly absorbed.
          </p>
        </>
      }
    >
      <Plot
        ariaLabel={`Generation rate versus depth at ${lam} nanometres`}
        x={{ domain: [0, X_MAX], label: 'Depth x', unit: 'µm' }}
        y={{ domain: [1e14, 1e23], log: true, label: <Term id="generation-rate">Generation rate G</Term>, unit: 'cm⁻³ s⁻¹' }}
        aspect={0.7}
        hover={{
          series: [
            { label: `${lam} nm`, color: C.accent, points: curve, format: (v) => sci(v, 2) },
            ...(compare ? [{ label: '450 nm', color: C.s2, points: refs[0], format: (v: number) => sci(v, 2) }, { label: '1000 nm', color: C.electron, points: refs[1], format: (v: number) => sci(v, 2) }] : []),
          ],
          xFormat: (v) => `${v.toFixed(0)} µm`,
        }}
      >
        {compare && <Line points={refs[0]} color={C.s2} width={1.75} />}
        {compare && <Line points={refs[1]} color={C.electron} width={1.75} />}
        <Line points={curve} color={C.accent} width={2.5} />
        <VRule x={depth} color={C.ink2} dash="3 4" width={1.25} />
        <Dot x={depth} y={G(depth)} color={C.accent} />
      </Plot>
    </DiagramFrame>
  );
}
