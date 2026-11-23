import { useState } from 'react';
import { BandDiagram, C, DiagramFrame, Legend, Plot, PlotLabel, Readout, Segmented, Slider, Term, fmt, glyphCount, sci, usePlot } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { SI_300K } from '@/physics/constants';
import { NcAt, NvAt, equilibriumDensities, intrinsicDensityAt, intrinsicFermiLevel, kTeV } from '@/physics/semiconductor';

type Kind = 'n' | 'p';
const EG = SI_300K['EG-Si'];
/** Schematic dopant-level offset from the band edge (eV); the book only says "close to the band". */
const LEVEL_OFFSET = 0.05;

function Bars({ items }: { items: { x: number; v: number; color: string; dash?: boolean }[] }) {
  const { x, y, innerH } = usePlot();
  const w = Math.max(14, (x(1) - x(0)) * 0.56);
  return (
    <g>
      {items.map((it) => {
        const top = y(Math.max(it.v, 1));
        return (
          <rect
            key={it.x}
            x={x(it.x) - w / 2}
            y={top}
            width={w}
            height={Math.max(0, innerH - top)}
            rx={3}
            fill={it.dash ? 'none' : it.color}
            fillOpacity={it.dash ? 1 : 0.85}
            stroke={it.color}
            strokeWidth={it.dash ? 2 : 0}
            strokeDasharray={it.dash ? '5 4' : undefined}
          />
        );
      })}
    </g>
  );
}

export default function DopingExplorer({ meta }: { meta: DiagramMeta }) {
  const [kind, setKind] = useState<Kind>('n');
  const [logN, setLogN] = useState(17);
  const [T, setT] = useState(300);

  const N = 10 ** logN;
  const ni = intrinsicDensityAt(T);
  const { n, p } = kind === 'n' ? equilibriumDensities(N, 0, ni) : equilibriumDensities(0, N, ni);
  const kT = kTeV(T);
  const Nc = NcAt(T);
  const Nv = NvAt(T);
  const EF = -kT * Math.log(Nc / n); // relative to E_C
  const EFi = intrinsicFermiLevel(EG, Nc, Nv, T);
  const degenerate = -EF < 3 * kT || EF + EG < 3 * kT;
  const majority = kind === 'n' ? 'electrons' : 'holes';
  const intrinsicLike = ni > 0.1 * N;

  return (
    <DiagramFrame
      meta={meta}
      ctx="semiconductor"
      layout="below"
      legend={
        <Legend
          items={[
            { label: <>Fermi level E<sub>F</sub></>, color: C.ink, dash: true },
            { label: <>intrinsic level E<sub>Fi</sub></>, color: C.ink2, dash: true },
            { label: kind === 'n' ? <>donor level E<sub>D</sub> (schematic)</> : <>acceptor level E<sub>A</sub> (schematic)</>, color: C.aux, dash: true },
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
              { value: 'n', label: 'Phosphorus (n-type)' },
              { value: 'p', label: 'Boron (p-type)' },
            ]}
          />
          <Slider
            label={<>{kind === 'n' ? <Term id="donor">Donor density N<sub>D</sub></Term> : <Term id="acceptor">Acceptor density N<sub>A</sub></Term>}</>}
            value={logN}
            min={12}
            max={19}
            step={0.1}
            unit="cm⁻³"
            onChange={setLogN}
            format={(v) => sci(10 ** v, 2)}
            marks={[
              { value: 16, label: '10¹⁶' },
              { value: 17, label: '10¹⁷' },
              { value: 18, label: '10¹⁸' },
            ]}
          />
          <Slider label="Temperature T" value={T} min={250} max={1100} step={5} unit="K" onChange={setT} format={(v) => v.toFixed(0)} marks={[{ value: 300, label: '300 K' }, { value: 1000, label: '1000 K' }]} />
        </>
      }
      readouts={
        <>
          <Readout label={<>Electrons n</>} value={sci(n, 3)} unit="cm⁻³" emphasis={kind === 'n'} />
          <Readout label={<>Holes p</>} value={sci(p, 3)} unit="cm⁻³" emphasis={kind === 'p'} />
          <Readout label={<Term id="intrinsic-carrier-density">n<sub>i</sub></Term>} value={sci(ni, 3)} unit="cm⁻³" />
          <Readout
            label={kind === 'n' ? <>E<sub>C</sub> − E<sub>F</sub></> : <>E<sub>F</sub> − E<sub>V</sub></>}
            value={fmt(kind === 'n' ? -EF : EF + EG, 3)}
            unit="eV"
            emphasis
            note={degenerate ? <>within 3k<sub>B</sub>T of the band edge: degenerate, formula not reliable</> : <>E<sub>F</sub> is {fmt(Math.abs(EF - EFi), 3)} eV {EF > EFi ? 'above' : 'below'} E<sub>Fi</sub></>}
          />
          <Readout label="Si atoms per dopant" value={sci(5e22 / N, 2)} />
          <Readout label="Character" value={intrinsicLike ? 'nearly intrinsic' : `${kind}-type, majority: ${majority}`} note={intrinsicLike ? <>n<sub>i</sub> is comparable with the doping</> : undefined} />
        </>
      }
      formulas={[
        { tex: 'p + N_D - n - N_A = 0', label: 'Charge neutrality (eq. 6.15)' },
        { tex: 'np = n_i^2', label: 'Law of mass action (eq. 6.9)' },
        { tex: 'E_C - E_F = k_BT\\ln\\left(\\frac{N_C}{n}\\right)', label: <>From eq. 6.6a (eq. 6.22a with n = N<sub>D</sub>)</> },
      ]}
      caption="Left: band diagram; the number of carrier symbols grows with the logarithm of the density. Right: densities on a log axis. Densities from the exact neutrality solution; effective densities of states ∝ T³ᐟ², constant bandgap."
      notice={
        <>
          <p>
            <strong>60 meV per decade.</strong> At 300 K every factor 10 more doping lifts E<sub>F</sub> by k<sub>B</sub>T ln 10 ≈ 0.06 eV towards E<sub>C</sub> (n-type). 10¹⁷ cm⁻³ puts it
            0.15 eV below E<sub>C</sub>, 0.42 eV above the intrinsic level (instruction 2 Q2f).
          </p>
          <p>
            <strong>The minority bar sinks as the majority bar rises.</strong> On the log axis the n and p bars are mirror images around n<sub>i</sub>: that is np = n<sub>i</sub>². With 10¹⁷
            phosphorus there are only about 10³ holes per cm³.
          </p>
          <p>
            <strong>Heat it up.</strong> Raising T increases n<sub>i</sub> steeply. Once n<sub>i</sub> approaches the doping level, the minority density catches up and E<sub>F</sub> slides back
            towards E<sub>Fi</sub>: the silicon behaves as intrinsic again (book ex. 7.6 at 727 °C). Above 10¹⁹ cm⁻³ E<sub>F</sub> gets within 3k<sub>B</sub>T of the band edge and the
            simple formulas start to fail (degenerate doping).
          </p>
        </>
      }
    >
      <div className="io-grid">
        <BandDiagram
          Eg={EG}
          height={290}
          ariaLabel={`Band diagram: Fermi level ${(-EF).toFixed(2)} eV below the conduction band`}
          electrons={glyphCount(n)}
          holes={glyphCount(p)}
          levels={[
            { E: EFi, label: 'E_Fi', color: 'var(--dg-ink-2)', dash: '2 4', width: 1.5 },
            kind === 'n' ? { E: -LEVEL_OFFSET, label: 'E_D', color: 'var(--dg-aux)', dash: '3 3', width: 1.5, span: [0.42, 0.95] } : { E: -EG + LEVEL_OFFSET, label: 'E_A', color: 'var(--dg-aux)', dash: '3 3', width: 1.5, span: [0.42, 0.95] },
            { E: EF, label: 'E_F', dash: '7 4', measure: kind === 'n' ? { to: 'C', text: `${fmt(-EF, 2)} eV` } : { to: 'V', text: `${fmt(EF + EG, 2)} eV` } },
          ]}
        />
        <Plot
          ariaLabel={`Carrier densities: n ${n.toExponential(1)}, p ${p.toExponential(1)}`}
          x={{ domain: [0, 4], label: 'Carrier type', ticks: [], format: () => '' }}
          y={{ domain: [1, 1e20], log: true, label: 'Density', unit: 'cm⁻³' }}
          aspect={0.95}
          minHeight={260}
          maxHeight={300}
        >
          <Bars
            items={[
              { x: 0.5, v: n, color: C.electron },
              { x: 1.5, v: p, color: C.hole },
              { x: 2.5, v: ni, color: C.ink2 },
              { x: 3.5, v: N, color: C.aux, dash: true },
            ]}
          />
          {[
            { x: 0.5, t: 'n' },
            { x: 1.5, t: 'p' },
            { x: 2.5, t: 'nᵢ' },
            { x: 3.5, t: kind === 'n' ? 'N_D' : 'N_A' },
          ].map((l) => (
            <PlotLabel key={l.x} x={l.x} y={1} anchor="middle" valign="top" dy={6} className="plot__label--plain">
              {l.t === 'N_D' ? <>N<sub>D</sub></> : l.t === 'N_A' ? <>N<sub>A</sub></> : l.t}
            </PlotLabel>
          ))}
        </Plot>
      </div>
    </DiagramFrame>
  );
}
