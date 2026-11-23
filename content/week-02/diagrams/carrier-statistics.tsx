import { useMemo, useState, type ReactNode } from 'react';
import { C, DiagramFrame, Legend, Readout, Slider, SubLabel, Term, Toggle, fmt, sci, useMeasure } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { SI_300K } from '@/physics/constants';
import { NcAt, NvAt, dosShape, electronDensity, fermiDirac, holeDensity, intrinsicDensityAt, intrinsicFermiLevel } from '@/physics/semiconductor';

const EG = SI_300K['EG-Si'];
const E_LO = -EG - 0.3;
const E_HI = 0.3;
const N_PTS = 260;
const LOG_DECADES = 22;

interface Panel {
  key: string;
  title: ReactNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function CarrierStatistics({ meta }: { meta: DiagramMeta }) {
  const efi = intrinsicFermiLevel(); // relative to E_C
  const [efFromEv, setEf] = useState(EG + efi); // E_F − E_V
  const [T, setT] = useState(300);
  const [log, setLog] = useState(false);
  const [ref, { width }] = useMeasure<HTMLDivElement>();

  const EF = efFromEv - EG; // relative to E_C
  const Nc = NcAt(T);
  const Nv = NvAt(T);
  const n = electronDensity(EF, Nc, T);
  const p = holeDensity(-EG - EF, Nv, T);
  const ni = intrinsicDensityAt(T);

  const curves = useMemo(() => {
    const Es = Array.from({ length: N_PTS }, (_, i) => E_LO + ((E_HI - E_LO) * i) / (N_PTS - 1));
    // DOS ∝ m*^{3/2} ∝ N_C or N_V (eq. 6.2 and 6.7): scale the valence band by N_V/N_C
    const gC = Es.map((E) => dosShape(E));
    const gV = Es.map((E) => (Nv / Nc) * dosShape(-EG - E));
    const f = Es.map((E) => fermiDirac(E - EF, T));
    const nE = Es.map((_, i) => gC[i] * f[i]);
    const pE = Es.map((_, i) => gV[i] * (1 - f[i]));
    return { Es, gC, gV, f, nE, pE };
  }, [EF, T, Nc, Nv]);

  const W = Math.max(width, 280);
  const narrow = W < 520;
  const H = narrow ? 470 : 300;
  const gap = 10;
  const panels: Panel[] = narrow
    ? [
        { key: 'band', title: 'Band diagram', x: 0, y: 0, w: (W - gap) / 2, h: 225 },
        { key: 'g', title: <Term id="density-of-states">DOS g(E)</Term>, x: (W + gap) / 2, y: 0, w: (W - gap) / 2, h: 225 },
        { key: 'f', title: <Term id="fermi-dirac">f(E)</Term>, x: 0, y: 245, w: (W - gap) / 2, h: 225 },
        { key: 'np', title: 'n(E) and p(E)', x: (W + gap) / 2, y: 245, w: (W - gap) / 2, h: 225 },
      ]
    : (() => {
        const ws = [0.22, 0.24, 0.24, 0.3].map((r) => r * (W - 3 * gap));
        let x = 0;
        return (['band', 'g', 'f', 'np'] as const).map((key, i) => {
          const pnl: Panel = { key, title: [<>Band diagram</>, <Term id="density-of-states">DOS g(E)</Term>, <Term id="fermi-dirac">f(E)</Term>, <>n(E) and p(E)</>][i], x, y: 0, w: ws[i], h: H };
          x += ws[i] + gap;
          return pnl;
        });
      })();

  const TOP = 24; // room for panel title
  const BOT = 22; // room for x note
  const yOf = (pnl: Panel) => (E: number) => pnl.y + TOP + ((E_HI - E) / (E_HI - E_LO)) * (pnl.h - TOP - BOT);

  const linX = (pnl: Panel, max: number) => (v: number) => pnl.x + 6 + (Math.max(0, v) / max) * (pnl.w - 14);
  const logX = (pnl: Panel, max: number) => (v: number) => {
    const d = v > 0 ? Math.log10(v / max) : -LOG_DECADES;
    return pnl.x + 6 + Math.max(0, (d + LOG_DECADES) / LOG_DECADES) * (pnl.w - 14);
  };
  const path = (xs: number[], toX: (v: number) => number, y: (E: number) => number, skipZero = false) => {
    let d = '';
    let pen = false;
    curves.Es.forEach((E, i) => {
      if (skipZero && xs[i] <= 0) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${toX(xs[i]).toFixed(1)},${y(E).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const gMax = Math.max(...curves.gC, ...curves.gV);
  const npMax = Math.max(...curves.nE, ...curves.pE) || 1;
  const ratio = n / p;

  return (
    <DiagramFrame
      meta={meta}
      ctx="semiconductor"
      layout="below"
      legend={
        <Legend
          items={[
            { label: 'electrons (conduction band)', color: C.electron },
            { label: 'holes (valence band)', color: C.hole },
            { label: <>Fermi level E<sub>F</sub></>, color: C.ink, dash: true },
          ]}
        />
      }
      controls={
        <>
          <Slider
            label={<><Term id="fermi-level">Fermi level</Term>: E<sub>F</sub> − E<sub>V</sub></>}
            value={efFromEv}
            min={0.12}
            max={EG - 0.12}
            step={0.005}
            unit="eV"
            onChange={setEf}
            format={(v) => v.toFixed(3)}
            marks={[
              { value: 0.135, label: 'p-type 10¹⁷' },
              { value: EG + efi, label: 'intrinsic' },
              { value: EG - 0.149, label: 'n-type 10¹⁷' },
            ]}
          />
          <Slider label="Temperature T" value={T} min={250} max={500} step={5} unit="K" onChange={setT} format={(v) => v.toFixed(0)} marks={[{ value: 300, label: '300 K' }]} />
          <Toggle label="Logarithmic axes for f(E), n(E) and p(E)" checked={log} onChange={setLog} />
        </>
      }
      readouts={
        <>
          <Readout label={<>Electrons n = N<sub>C</sub>e<sup>(E<sub>F</sub>−E<sub>C</sub>)/kT</sup></>} value={sci(n, 3)} unit="cm⁻³" emphasis />
          <Readout label={<>Holes p = N<sub>V</sub>e<sup>(E<sub>V</sub>−E<sub>F</sub>)/kT</sup></>} value={sci(p, 3)} unit="cm⁻³" emphasis />
          <Readout label="n · p" value={sci(n * p, 3)} unit="cm⁻⁶" note={<>= n<sub>i</sub>² = {sci(ni * ni, 3)} at {T} K</>} />
          <Readout label={<>E<sub>F</sub> − E<sub>Fi</sub></>} value={fmt(EF - intrinsicFermiLevel(EG, Nc, Nv, T), 3)} unit="eV" note={ratio > 1.5 ? 'n-type side' : ratio < 0.67 ? 'p-type side' : 'near intrinsic'} />
          <Readout label={<>f(E<sub>C</sub>)</>} value={sci(fermiDirac(-EF, T), 2)} note="chance that a state at the band edge is filled" />
        </>
      }
      formulas={[
        { tex: 'n = \\int_{E_C}^{E_{\\mathrm{top}}} g_C(E)\\,f(E)\\,\\mathrm{d}E', label: 'Eq. 6.4a/6.5a' },
        { tex: 'n = N_C \\exp\\left(\\frac{E_F - E_C}{k_BT}\\right)', label: 'Result (eq. 6.6a, on the sheet)' },
        { tex: 'np = n_i^2', label: <>Independent of E<sub>F</sub> (eq. 6.9)</> },
      ]}
      caption={
        log
          ? `Log axes: each panel spans ${LOG_DECADES} decades below its maximum, so the minority carriers become visible.`
          : 'Linear axes: n(E) and p(E) share one scale, so the minority carriers are usually invisible (that is the point!). DOS shapes from eq. 6.2, scaled by the effective densities of states.'
      }
      notice={
        <>
          <p>
            <strong>Shape fixed, size moves.</strong> The bump n(E) always sits just above E<sub>C</sub> with a width of a few k<sub>B</sub>T: √(E − E<sub>C</sub>) rises, the Boltzmann tail falls.
            Moving E<sub>F</sub> does not change that shape, only the height: every 60 meV closer to E<sub>C</sub> multiplies n by 10.
          </p>
          <p>
            <strong>A seesaw with a fixed product.</strong> Raising E<sub>F</sub> fills more conduction-band states and empties fewer valence-band states. n goes up exactly as much as
            p goes down: n·p stays n<sub>i</sub>², the law of mass action. Only temperature (or the bandgap) changes the product.
          </p>
          <p>
            <strong>Why intrinsic E<sub>F</sub> is not exactly midgap.</strong> The valence band has fewer effective states (N<sub>V</sub> &lt; N<sub>C</sub>), so for n = p the Fermi level must sit
            slightly closer to it: 0.553 eV above E<sub>V</sub> instead of 0.56 eV.
          </p>
        </>
      }
    >
      <div ref={ref} className="schematic" style={{ height: H }}>
        {width > 0 && (
          <svg width={W} height={H} role="img" aria-label={`Fermi level ${efFromEv.toFixed(2)} eV above the valence band: n ${n.toExponential(1)}, p ${p.toExponential(1)} per cubic centimetre`}>
            {panels.map((pnl) => {
              const y = yOf(pnl);
              const yC = y(0);
              const yV = y(-EG);
              const yF = y(EF);
              // Gap text goes at whichever of 30 / 50 / 72 % of the gap is farthest from the E_F line.
              const yGap = [0.3, 0.5, 0.72].map((t) => yC + t * (yV - yC)).reduce((best, c) => (Math.abs(c - yF) > Math.abs(best - yF) ? c : best));
              const top = pnl.y + TOP;
              const bottom = pnl.y + pnl.h - BOT;
              return (
                <g key={pnl.key}>
                  <rect x={pnl.x} y={top} width={pnl.w} height={yC - top} fill={C.cb} />
                  <rect x={pnl.x} y={yV} width={pnl.w} height={bottom - yV} fill={C.vb} />
                  <line x1={pnl.x} x2={pnl.x + pnl.w} y1={yC} y2={yC} stroke={C.ink} strokeWidth={1.5} />
                  <line x1={pnl.x} x2={pnl.x + pnl.w} y1={yV} y2={yV} stroke={C.ink} strokeWidth={1.5} />
                  <line x1={pnl.x} x2={pnl.x + pnl.w} y1={yF} y2={yF} stroke={C.ink} strokeWidth={1.5} strokeDasharray="6 4" />
                  <line x1={pnl.x + 6} x2={pnl.x + 6} y1={top} y2={bottom} stroke={C.axis} />
                  <foreignObject x={pnl.x} y={pnl.y} width={pnl.w} height={TOP}>
                    <div className="panel-title">{pnl.title}</div>
                  </foreignObject>

                  {pnl.key === 'band' && (
                    <>
                      <text x={pnl.x + pnl.w - 4} y={yC - 5} textAnchor="end" className="label-strong">
                        <SubLabel text="E_C" />
                      </text>
                      <text x={pnl.x + pnl.w - 4} y={yV + 14} textAnchor="end" className="label-strong">
                        <SubLabel text="E_V" />
                      </text>
                      <text x={pnl.x + pnl.w - 4} y={yF - 5} textAnchor="end" className="label-strong">
                        <SubLabel text="E_F" />
                      </text>
                      <text x={pnl.x + 12} y={yGap} dy="0.32em">
                        E<tspan dy="0.3em" fontSize="0.78em">G</tspan>
                        <tspan dy="-0.3em"> = 1.12 eV</tspan>
                      </text>
                    </>
                  )}
                  {pnl.key === 'g' && (
                    <>
                      <path d={path(curves.gC, linX(pnl, gMax), y, true)} fill="none" stroke={C.electron} strokeWidth={2} />
                      <path d={path(curves.gV, linX(pnl, gMax), y, true)} fill="none" stroke={C.hole} strokeWidth={2} />
                      <text x={pnl.x + 12} y={yGap} dy="0.32em">
                        no states in the gap
                      </text>
                    </>
                  )}
                  {pnl.key === 'f' && (
                    <>
                      <path d={path(curves.f, log ? logX(pnl, 1) : linX(pnl, 1), y)} fill="none" stroke={C.accent} strokeWidth={2} />
                      <text x={pnl.x + pnl.w - 4} y={bottom + 15} textAnchor="end">
                        {log ? `10⁻${LOG_DECADES} … 1` : '0 … ½ … 1'}
                      </text>
                    </>
                  )}
                  {pnl.key === 'np' && (
                    <>
                      <path d={path(curves.nE, log ? logX(pnl, npMax) : linX(pnl, npMax), y, true)} fill={log ? 'none' : 'var(--dg-wash)'} stroke={C.electron} strokeWidth={2} />
                      <path d={path(curves.pE, log ? logX(pnl, npMax) : linX(pnl, npMax), y, true)} fill="none" stroke={C.hole} strokeWidth={2} />
                      <text x={pnl.x + 12} y={Math.abs(yC + 16 - yF) < 10 ? yC + 30 : yC + 16}>
                        n = {sci(n, 2)}
                      </text>
                      <text x={pnl.x + 12} y={Math.abs(yV - 8 - yF) < 10 ? yV - 22 : yV - 8}>
                        p = {sci(p, 2)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </DiagramFrame>
  );
}
