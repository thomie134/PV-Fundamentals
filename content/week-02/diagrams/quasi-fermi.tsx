import { useState } from 'react';
import { BandDiagram, C, DiagramFrame, Legend, Readout, Segmented, Slider, Term, Toggle, fmt, glyphCount, sci } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { SI_300K } from '@/physics/constants';
import { ecMinusEf, efMinusEv, equilibriumDensities, intrinsicDensity } from '@/physics/semiconductor';

type Kind = 'n' | 'p';
const EG = SI_300K['EG-Si'];

export default function QuasiFermi({ meta }: { meta: DiagramMeta }) {
  const [kind, setKind] = useState<Kind>('n');
  const [logN, setLogN] = useState(18);
  const [light, setLight] = useState(true);
  const [logD, setLogD] = useState(15);

  const ni = intrinsicDensity();
  const N = 10 ** logN;
  const dark = kind === 'n' ? equilibriumDensities(N, 0, ni) : equilibriumDensities(0, N, ni);
  const d = light ? 10 ** logD : 0;
  const n = dark.n + d;
  const p = dark.p + d;
  const EFdark = -ecMinusEf(dark.n); // relative to E_C
  const EFn = -ecMinusEf(n);
  const EFp = -EG + efMinusEv(p);
  const split = EFn - EFp;
  const lowInjection = d < 0.1 * N;

  const onKind = (k: Kind) => {
    setKind(k);
    setLogN(k === 'n' ? 18 : 16); // lecture slides 69 and 70
  };

  return (
    <DiagramFrame
      meta={meta}
      ctx="semiconductor"
      legend={
        <Legend
          items={[
            { label: <>E<sub>Fn</sub> (electrons)</>, color: C.electron },
            { label: <>E<sub>Fp</sub> (holes)</>, color: C.hole },
            { label: <>E<sub>F</sub> in the dark</>, color: C.ink2, dash: true },
          ]}
        />
      }
      controls={
        <>
          <Segmented
            label="Wafer"
            value={kind}
            onChange={onKind}
            options={[
              { value: 'n', label: 'n-type (slide 69)' },
              { value: 'p', label: 'p-type (slide 70)' },
            ]}
          />
          <Slider label={kind === 'n' ? <>Doping N<sub>D</sub></> : <>Doping N<sub>A</sub></>} value={logN} min={14} max={18} step={0.1} unit="cm⁻³" onChange={setLogN} format={(v) => sci(10 ** v, 2)} />
          <Toggle label="Light on" checked={light} onChange={setLight} />
          <Slider
            label={<><Term id="excess-carriers">Excess carriers</Term> Δn = Δp</>}
            value={logD}
            min={10}
            max={17}
            step={0.1}
            unit="cm⁻³"
            onChange={setLogD}
            format={(v) => (light ? sci(10 ** v, 2) : '0 (dark)')}
            marks={[{ value: 15, label: 'lecture: 10¹⁵' }]}
          />
        </>
      }
      readouts={
        <>
          <Readout label="Electrons n" value={sci(n, 3)} unit="cm⁻³" note={`dark: ${sci(dark.n, 2)}`} />
          <Readout label="Holes p" value={sci(p, 3)} unit="cm⁻³" note={`dark: ${sci(dark.p, 2)}`} />
          <Readout label={<>E<sub>C</sub> − E<sub>Fn</sub></>} value={fmt(-EFn, 3)} unit="eV" />
          <Readout label={<>E<sub>Fp</sub> − E<sub>V</sub></>} value={fmt(EFp + EG, 3)} unit="eV" />
          <Readout label={<><Term id="quasi-fermi-level">Splitting</Term> E<sub>Fn</sub> − E<sub>Fp</sub></>} value={fmt(Math.max(0, split), 3)} unit="eV" emphasis note="energy available per electron–hole pair" />
          <Readout label={<>np / n<sub>i</sub>²</>} value={sci((n * p) / (ni * ni), 3)} note={light ? (lowInjection ? 'low injection: Δn ≪ majority density' : 'high injection: Δn is not small') : 'equilibrium: exactly 1'} />
        </>
      }
      formulas={[
        { tex: 'n = N_C\\exp\\left(\\frac{E_{Fn} - E_C}{k_BT}\\right)', label: 'Eq. 7.51a (on the sheet)' },
        { tex: 'p = N_V\\exp\\left(\\frac{E_V - E_{Fp}}{k_BT}\\right)', label: 'Eq. 7.51b (on the sheet)' },
        { tex: 'np = n_i^2\\exp\\left(\\frac{E_{Fn} - E_{Fp}}{k_BT}\\right)', label: 'Eq. 7.52 (slide 71)' },
      ]}
      caption={`T = 300 K, nᵢ = ${sci(ni, 3)} cm⁻³ (formula-sheet constants). The number of carrier symbols grows with the logarithm of the density.`}
      notice={
        <>
          <p>
            <strong>The minority level does the moving.</strong> In the lecture’s n-type example (10¹⁸ cm⁻³, Δ = 10¹⁵ cm⁻³) the electron density barely changes, so E<sub>Fn</sub> stays where
            E<sub>F</sub> was (0.09 eV below E<sub>C</sub>). The holes go from about 10² to 10¹⁵ cm⁻³, so E<sub>Fp</sub> drops all the way to 0.25 eV above E<sub>V</sub>.
          </p>
          <p>
            <strong>Splitting = useful energy.</strong> E<sub>Fn</sub> − E<sub>Fp</sub> grows with the light intensity by k<sub>B</sub>T ln 10 ≈ 60 meV per decade of Δn. It is the
            electrochemical energy of the photogenerated pairs (book §7.6) and becomes the open-circuit voltage of a solar cell in week 5.
          </p>
          <p>
            <strong>Turn the light off</strong> and both levels snap back onto E<sub>F</sub>: np = n<sub>i</sub>² again.
          </p>
        </>
      }
    >
      <BandDiagram
        Eg={EG}
        height={300}
        ariaLabel={`Quasi-Fermi levels: electrons ${(-EFn).toFixed(2)} eV below the conduction band, holes ${(EFp + EG).toFixed(2)} eV above the valence band`}
        electrons={glyphCount(n)}
        holes={glyphCount(p)}
        levels={[
          { E: EFdark, label: 'E_F', color: 'var(--dg-ink-2)', dash: '2 4', width: 1.25, span: [0, 0.18] },
          { E: EFn, label: 'E_Fn', color: 'var(--dg-electron)', dash: '7 4', measure: { to: 'C', text: `${fmt(-EFn, 2)} eV` } },
          { E: EFp, label: 'E_Fp', color: 'var(--dg-hole)', dash: '7 4', measure: { to: 'V', text: `${fmt(EFp + EG, 2)} eV` } },
        ]}
        overlay={(y, w, x0) =>
          split > 0.02 ? (
            <g>
              <line x1={x0 + w * 0.82} x2={x0 + w * 0.82} y1={y(EFn)} y2={y(EFp)} stroke="var(--dg-ink)" strokeWidth={1.5} markerStart="url(#bd-arrow)" markerEnd="url(#bd-arrow)" />
              <text x={x0 + w * 0.82 - 6} y={(y(EFn) + y(EFp)) / 2} dy="0.32em" textAnchor="end" className="label-strong">
                {fmt(split, 2)} eV
              </text>
            </g>
          ) : null
        }
      />
    </DiagramFrame>
  );
}
