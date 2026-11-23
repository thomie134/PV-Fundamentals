import { useMemo, useState } from 'react';
import { C, DiagramFrame, Dot, Line, Plot, PlotLabel, Readout, Slider, Term, fmt, sample, sci, usePlot } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { NM } from '@/physics/constants';
import { frequency, photonEnergy, photonEnergyEV } from '@/physics/radiation';

/** Approximate visible colour of a wavelength (for the swatch only). */
function wavelengthColor(nm: number): string {
  if (nm < 380 || nm > 750) return 'transparent';
  const stops: [number, [number, number, number]][] = [
    [380, [122, 61, 191]],
    [440, [61, 77, 214]],
    [490, [31, 166, 201]],
    [530, [63, 179, 74]],
    [580, [232, 212, 42]],
    [620, [240, 138, 36]],
    [700, [217, 49, 43]],
    [750, [158, 31, 31]],
  ];
  let i = 0;
  while (i < stops.length - 2 && nm > stops[i + 1][0]) i++;
  const [a, ca] = stops[i];
  const [b, cb] = stops[i + 1];
  const t = Math.min(1, Math.max(0, (nm - a) / (b - a)));
  const c = ca.map((v, k) => Math.round(v + t * (cb[k] - v)));
  return `rgb(${c.join(',')})`;
}

function Bands() {
  const { x, innerH } = usePlot();
  const xs = [
    [200, 380, 'UV'],
    [380, 750, 'visible'],
    [750, 2000, 'infrared'],
  ] as const;
  return (
    <g aria-hidden>
      {xs.map(([a, b, l]) => (
        <rect key={l} x={x(a)} y={0} width={x(b) - x(a)} height={innerH} fill={l === 'visible' ? 'var(--dg-wash-photon)' : 'transparent'} />
      ))}
    </g>
  );
}

export default function PhotonCalculator({ meta }: { meta: DiagramMeta }) {
  const [lambda, setLambda] = useState(700);
  const curve = useMemo(() => sample((nm) => photonEnergyEV(nm), 200, 2000, 200), []);
  const E = photonEnergy(lambda * NM);
  const region = lambda < 380 ? 'ultraviolet' : lambda <= 750 ? 'visible' : 'infrared';
  return (
    <DiagramFrame
      meta={meta}
      ctx="radiation"
      controls={
        <>
          <Slider label={<Term id="wavelength">Wavelength λ</Term>} value={lambda} min={200} max={2000} step={5} unit="nm" onChange={setLambda} format={(v) => v.toFixed(0)} marks={[{ value: 450, label: 'blue' }, { value: 700, label: 'red' }, { value: 1107, label: 'Si gap' }]} />
          <div className="swatch-row">
            <span className="swatch-big" style={{ background: wavelengthColor(lambda) }} />
            <span className="muted small">{region === 'visible' ? 'approximate colour' : `${region}: invisible to the eye`}</span>
          </div>
        </>
      }
      readouts={
        <>
          <Readout label={<Term id="frequency">Frequency ν = c/λ</Term>} value={sci(frequency(lambda * NM), 3)} unit="Hz" />
          <Readout label="Photon energy (J)" value={sci(E, 3)} unit="J" />
          <Readout label={<Term id="photon-energy">Photon energy (eV)</Term>} value={fmt(photonEnergyEV(lambda), 3)} unit="eV" emphasis />
          <Readout label="Photons per second in 1 W" value={sci(1 / E, 3)} unit="s⁻¹" />
        </>
      }
      formulas={[{ tex: 'E_{\\mathrm{ph}} = h\\nu = \\frac{hc}{\\lambda}', label: 'Photon energy (eq. 3.1)' }]}
      notice={
        <>
          <p>
            <strong>A hyperbola.</strong> E = hc/λ: doubling λ halves the energy. 400 nm photons carry 3.1 eV, 800 nm photons 1.55 eV, 1600 nm photons
            0.78 eV.
          </p>
          <p>
            <strong>More photons per watt in the red.</strong> One watt of 1000 nm light contains twice as many photons as one watt of 500 nm light. Solar cells
            count photons, so this matters when you convert irradiance to current.
          </p>
        </>
      }
    >
      <Plot
        ariaLabel="Photon energy versus wavelength"
        x={{ domain: [200, 2000], label: <Term id="wavelength">Wavelength</Term>, unit: 'nm' }}
        y={{ domain: [0, 6.5], label: <Term id="photon-energy">Photon energy</Term>, unit: 'eV' }}
        aspect={0.55}
        hover={{ series: [{ label: 'E', color: C.accent, points: curve, format: (v) => `${v.toFixed(2)} eV` }], xFormat: (v) => `${v.toFixed(0)} nm` }}
      >
        <Bands />
        <Line points={curve} color={C.accent} />
        <Dot x={lambda} y={photonEnergyEV(lambda)} />
        <PlotLabel x={lambda} y={photonEnergyEV(lambda)} dx={10} dy={-10} valign="bottom">
          {photonEnergyEV(lambda).toFixed(2)} eV
        </PlotLabel>
        <PlotLabel x={565} y={6.2} anchor="middle" valign="top" className="plot__label--plain">
          visible
        </PlotLabel>
      </Plot>
    </DiagramFrame>
  );
}
