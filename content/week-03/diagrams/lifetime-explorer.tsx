import { useMemo, useState } from 'react';
import { C, DiagramFrame, Dot, HRule, Legend, Line, Plot, Readout, Segmented, Slider, Term, fmt, sample, sci } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { SI_300K } from '@/physics/constants';
import { combinedLifetime, diffusionLength, einsteinD, tauAuger, tauRadiative } from '@/physics/transport';

type Kind = 'n' | 'p';
/** External c-Si coefficients (see week notes): Dziewior & Schmid 1977; Trupke et al. 2003. */
const CN = 2.8e-31; // cm⁶/s, eeh
const CP = 9.9e-32; // cm⁶/s, ehh
const B = 4.73e-15; // cm³/s

const fmtTau = (t: number) => (t >= 1 ? `${fmt(t, 3)} s` : t >= 1e-3 ? `${fmt(t * 1e3, 3)} ms` : t >= 1e-6 ? `${fmt(t * 1e6, 3)} µs` : `${fmt(t * 1e9, 3)} ns`);

export default function LifetimeExplorer({ meta }: { meta: DiagramMeta }) {
  const [kind, setKind] = useState<Kind>('p');
  const [logN, setLogN] = useState(16);
  const [logSRH, setLogSRH] = useState(-3);

  const N = 10 ** logN;
  const tSRH = 10 ** logSRH;
  const C_ = kind === 'n' ? CN : CP; // n-type: eeh dominates (eq. 7.45); p-type: ehh (eq. 7.47)
  const tRad = tauRadiative(B, N);
  const tAug = tauAuger(C_, N);
  const tTot = combinedLifetime(tRad, tAug, tSRH);
  const mu = kind === 'p' ? SI_300K['mun-Si'] : SI_300K['mup-Si']; // minority-carrier mobility
  const D = einsteinD(mu);
  const L = diffusionLength(D, tTot) * 1e4; // µm
  const dominant = [
    ['radiative', tRad],
    ['Auger', tAug],
    ['SRH (defects)', tSRH],
  ].sort((a, b) => (a[1] as number) - (b[1] as number))[0][0] as string;

  const curves = useMemo(() => {
    const lo = 1e13;
    const hi = 1e20;
    return {
      rad: sample((x) => tauRadiative(B, x), lo, hi, 160, true),
      aug: sample((x) => tauAuger(C_, x), lo, hi, 160, true),
      tot: sample((x) => combinedLifetime(tauRadiative(B, x), tauAuger(C_, x), tSRH), lo, hi, 200, true),
    };
  }, [C_, tSRH]);

  return (
    <DiagramFrame
      meta={meta}
      ctx="transport"
      legend={
        <Legend
          items={[
            { label: <>effective lifetime τ<sub>tot</sub></>, color: C.accent },
            { label: 'radiative', color: C.s2, dash: true },
            { label: 'Auger', color: C.electron, dash: true },
            { label: 'SRH (set by the slider)', color: C.aux, dash: true },
          ]}
        />
      }
      controls={
        <>
          <Segmented
            label="Wafer"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'p', label: 'p-type (minority: electrons)' },
              { value: 'n', label: 'n-type (minority: holes)' },
            ]}
          />
          <Slider label="Doping density" value={logN} min={13} max={20} step={0.1} unit="cm⁻³" onChange={setLogN} format={(v) => sci(10 ** v, 2)} marks={[{ value: 16, label: '10¹⁶ (wafer)' }, { value: 19, label: '10¹⁹ (emitter)' }]} />
          <Slider label={<><Term id="srh-recombination">SRH</Term> lifetime (defects)</>} value={logSRH} min={-9} max={-2} step={0.1} onChange={setLogSRH} format={(v) => fmtTau(10 ** v)} marks={[{ value: -6, label: '1 µs typical' }, { value: -3, label: '1 ms pure' }, { value: -9, label: 'Au-doped' }]} />
        </>
      }
      readouts={
        <>
          <Readout label="Radiative τ = 1/(BN)" value={fmtTau(tRad)} />
          <Readout label="Auger τ = 1/(CN²)" value={fmtTau(tAug)} />
          <Readout label="SRH τ" value={fmtTau(tSRH)} />
          <Readout label={<Term id="minority-carrier-lifetime">Effective lifetime</Term>} value={fmtTau(tTot)} emphasis note={`dominated by ${dominant}`} />
          <Readout label={<Term id="diffusion-length">Diffusion length L = √(Dτ)</Term>} value={L >= 1000 ? `${fmt(L / 1000, 3)} mm` : `${fmt(L, 3)} µm`} emphasis note={`D = ${fmt(D, 3)} cm²/s (Einstein, sheet mobility)`} />
        </>
      }
      formulas={[
        { tex: '\\frac{1}{\\tau_{\\mathrm{tot}}} = \\frac{1}{\\tau_{\\mathrm{rad}}} + \\frac{1}{\\tau_{\\mathrm{Aug}}} + \\frac{1}{\\tau_{\\mathrm{SRH}}}', label: 'Rates add (eq. 7.27)' },
        { tex: '\\tau_{\\mathrm{Aug}} = \\frac{1}{C_nN_D^2}', label: 'Auger, heavily doped n-type (eq. 7.45)' },
        { tex: 'L_n = \\sqrt{D_n\\tau_n}', label: 'Eq. 7.28a (on the sheet)' },
      ]}
      caption="Low injection, 300 K. Auger and radiative coefficients of c-Si from the literature (external: Dziewior & Schmid 1977; Trupke et al. 2003); trends only. Surface recombination not included."
      notice={
        <>
          <p>
            <strong>The shortest lifetime wins.</strong> Because the rates add, the effective lifetime always lies below the shortest individual lifetime. In ordinary silicon that is SRH: the defects
            decide.
          </p>
          <p>
            <strong>Auger takes over at high doping.</strong> τ<sub>Aug</sub> ∝ 1/N², so ten times more doping means a hundred times shorter Auger lifetime. Heavily doped layers (emitters, back-surface
            fields around 10¹⁹ cm⁻³) have lifetimes in the nanosecond range, even in perfect material.
          </p>
          <p>
            <strong>Radiative hardly matters in Si.</strong> The indirect gap makes radiative recombination slow: it is never the dominant mechanism here. In GaAs it would be.
          </p>
          <p>
            <strong>Lifetime to diffusion length.</strong> L grows only as √τ: a hundred times better lifetime gives ten times longer L.
          </p>
        </>
      }
    >
      <Plot
        ariaLabel={`Lifetime versus doping; effective lifetime ${fmtTau(tTot)}`}
        x={{ domain: [1e13, 1e20], log: true, label: 'Doping density', unit: 'cm⁻³' }}
        y={{ domain: [1e-10, 1], log: true, label: <Term id="minority-carrier-lifetime">Minority-carrier lifetime</Term>, unit: 's' }}
        aspect={0.7}
        hover={{
          series: [
            { label: 'τ (total)', color: C.accent, points: curves.tot, format: fmtTau },
            { label: 'Auger', color: C.electron, points: curves.aug, format: fmtTau },
            { label: 'radiative', color: C.s2, points: curves.rad, format: fmtTau },
          ],
          xFormat: (v) => sci(v, 2),
        }}
      >
        <Line points={curves.rad} color={C.s2} dash="5 4" width={1.75} />
        <Line points={curves.aug} color={C.electron} dash="5 4" width={1.75} />
        <HRule y={tSRH} color={C.aux} dash="5 4" width={1.75} />
        <Line points={curves.tot} color={C.accent} width={2.5} />
        <Dot x={N} y={tTot} color={C.accent} />
      </Plot>
    </DiagramFrame>
  );
}
