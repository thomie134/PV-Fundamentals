import { useMemo, useState } from 'react';
import { C, DiagramFrame, Dot, Legend, Line, Area, Plot, PlotLabel, Readout, Slider, Term, Toggle, VRule, fmt, sample, usePlot } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { planckRadiance, stefanBoltzmann, wienPeak } from '@/physics/radiation';
import { NM } from '@/physics/constants';

/** Spectral radiance in kW m⁻² sr⁻¹ nm⁻¹ */
const L = (nm: number, T: number) => (planckRadiance(nm * NM, T) * NM) / 1000;
const REF_T = 5800;

/** Thin visible-spectrum strip along the bottom of the plot (380–750 nm). */
function VisibleStrip() {
  const { x, innerH } = usePlot();
  const stops = [
    [380, '#7a3dbf'],
    [440, '#3d4dd6'],
    [490, '#1fa6c9'],
    [530, '#3fb34a'],
    [580, '#e8d42a'],
    [620, '#f08a24'],
    [700, '#d9312b'],
    [750, '#9e1f1f'],
  ] as const;
  const x0 = x(380);
  const x1 = x(750);
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id="vis-grad" x1="0" x2="1">
          {stops.map(([nm, c]) => (
            <stop key={nm} offset={(x(nm) - x0) / (x1 - x0)} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <rect x={x0} y={innerH - 6} width={x1 - x0} height={6} fill="url(#vis-grad)" rx={2} opacity={0.85} />
    </g>
  );
}

export default function BlackbodyExplorer({ meta }: { meta: DiagramMeta }) {
  const [T, setT] = useState(5800);
  const [showRef, setShowRef] = useState(true);
  const [autoY, setAutoY] = useState(false);

  const curve = useMemo(() => sample((nm) => L(nm, T), 100, 3000, 260), [T]);
  const ref = useMemo(() => sample((nm) => L(nm, REF_T), 100, 3000, 260), []);
  const peakNm = wienPeak(T) / NM;
  const peakL = L(peakNm, T);
  const M = stefanBoltzmann(T);
  const yMax = autoY ? peakL * 1.15 : 125;
  const where = peakNm < 380 ? 'ultraviolet' : peakNm <= 750 ? 'visible' : 'infrared';

  return (
    <DiagramFrame
      meta={meta}
      ctx="radiation"
      legend={
        <Legend
          items={[
            { label: `Blackbody at ${T} K`, color: C.accent },
            ...(showRef ? [{ label: `Reference ${REF_T} K (≈ Sun)`, color: C.ink2, dash: true }] : []),
          ]}
        />
      }
      controls={
        <>
          <Slider
            label={<Term id="kelvin">Temperature</Term>}
            value={T}
            min={3000}
            max={8000}
            step={50}
            unit="K"
            onChange={setT}
            format={(v) => v.toFixed(0)}
            marks={[
              { value: 3000, label: 'Bulb ~3000 K' },
              { value: 5800, label: 'Sun ~5800 K' },
            ]}
          />
          <Toggle label={`Show ${REF_T} K reference`} checked={showRef} onChange={setShowRef} />
          <Toggle label="Auto-scale the y-axis" checked={autoY} onChange={setAutoY} />
        </>
      }
      readouts={
        <>
          <Readout label={<>Peak wavelength λ<sub>max</sub></>} value={fmt(peakNm, 3)} unit="nm" emphasis note={`in the ${where}`} />
          <Readout label={<>Emitted power σT⁴</>} value={fmt(M / 1e6, 3)} unit="MW/m²" />
          <Readout label={`Power vs ${REF_T} K`} value={`× ${fmt(M / stefanBoltzmann(REF_T), 3)}`} note="(T / 5800)⁴" />
          <Readout label="Peak height vs 5800 K" value={`× ${fmt(peakL / L(wienPeak(REF_T) / NM, REF_T), 3)}`} note="(T / 5800)⁵" />
        </>
      }
      formulas={[
        { tex: '\\lambda_{\\max} T = 2.898 \\times 10^{-3}\\,\\mathrm{m\\,K}', label: 'Wien’s displacement law (eq. 5.21)' },
        { tex: 'M_e^{BB}(T) = \\sigma T^4', label: 'Stefan–Boltzmann law (eq. 5.19)' },
      ]}
      caption="Curves: Planck’s law (book eq. 5.18a). The coloured strip marks visible light (380–750 nm)."
      notice={
        <>
          <p>
            <strong>The peak moves left as T rises.</strong> Wien’s law says λ<sub>max</sub> ∝ 1/T: at 3000 K (a light bulb) the peak sits in the infrared near
            970 nm, which is why bulbs are mostly heaters; at 5800 K it lands at 500 nm, in the middle of the visible range. Our eyes evolved to use the light
            the Sun delivers most.
          </p>
          <p>
            <strong>The curve grows far faster than T.</strong> The area under the curve is the total emitted power, σT⁴: going from 5800 K to 8000 K (×1.38)
            multiplies the power by 1.38⁴ ≈ 3.6. The peak height grows even faster, as T⁵, because the curve also becomes narrower.
          </p>
          <p>
            <strong>Why this matters for PV:</strong> the Sun’s spectrum is roughly this curve at 5800 K, filtered by the atmosphere (next concept). It
            contains photons from UV to far infrared; a solar cell can only use part of them.
          </p>
        </>
      }
    >
      <Plot
        ariaLabel={`Planck blackbody spectrum at ${T} kelvin, peaking at ${peakNm.toFixed(0)} nanometres`}
        x={{ domain: [100, 3000], label: <Term id="wavelength">Wavelength</Term>, unit: 'nm' }}
        y={{ domain: [0, yMax], label: <Term id="planck-law">Spectral radiance</Term>, unit: 'kW m⁻² sr⁻¹ nm⁻¹' }}
        aspect={0.75}
        hover={{
          series: [
            { label: `${T} K`, color: C.accent, points: curve },
            ...(showRef ? [{ label: `${REF_T} K`, color: C.ink2, points: ref }] : []),
          ],
          xFormat: (v) => v.toFixed(0),
        }}
      >
        <VisibleStrip />
        <Area points={curve} />
        {showRef && <Line points={ref} color={C.ink2} dash="5 5" width={1.5} />}
        <Line points={curve} color={C.accent} />
        {peakL <= yMax && (
          <>
            <VRule x={peakNm} color={C.ink2} />
            <Dot x={peakNm} y={peakL} color={C.accent} />
            <PlotLabel x={peakNm} y={Math.min(peakL, yMax * 0.95)} dx={10} dy={-4} valign="bottom">
              <Term id="wien-law">λ<sub>max</sub></Term> = {peakNm.toFixed(0)} nm
            </PlotLabel>
          </>
        )}
        <PlotLabel x={565} y={yMax * 0.04} anchor="middle" valign="bottom" className="plot__label--plain">
          visible
        </PlotLabel>
      </Plot>
    </DiagramFrame>
  );
}
