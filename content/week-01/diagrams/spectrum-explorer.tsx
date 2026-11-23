import { useMemo, useState } from 'react';
import g173 from '@content/data/astm-g173.json';
import { Area, C, DiagramFrame, Legend, Line, Plot, PlotLabel, Readout, Segmented, Slider, Term, Toggle, VRule, fmt, sci } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { NM, Q } from '@/physics/constants';
import { blackbodyIrradianceAtEarth, irradiance, photonEnergyEV, photonFlux, spectralPhotonFlux, wavelengthNmFromEV, type Spectrum } from '@/physics/radiation';

type Mode = 'power' | 'photons';

const AM15: Spectrum = { wavelength: g173.wavelength, irradiance: g173.am15g };
const AM0: Spectrum = { wavelength: g173.wavelength, irradiance: g173.am0 };
const LMAX = 2500;

/** Thin the 0.5/1 nm table to ≈ 2 nm steps for drawing (integrals use the full table). */
function forPlot(s: Spectrum): [number, number][] {
  const out: [number, number][] = [];
  let last = -Infinity;
  for (let i = 0; i < s.wavelength.length; i++) {
    const w = s.wavelength[i];
    if (w > LMAX) break;
    if (w - last >= 2) {
      out.push([w, s.irradiance[i]]);
      last = w;
    }
  }
  return out;
}

/** W m⁻² nm⁻¹ → photons in units of 10¹⁸ m⁻² s⁻¹ nm⁻¹ */
const toPhotons = (pts: [number, number][]) => pts.map(([w, p]) => [w, spectralPhotonFlux(p, w * NM) / 1e18] as [number, number]);

const EX56: [number, number][] = [
  [250, 0],
  [250, 1],
  [1000, 1],
  [1000, 0.25],
  [2000, 0.25],
  [2000, 0],
];
const ex56Photons = (): [number, number][] => {
  const pts: [number, number][] = [[250, 0]];
  for (let w = 250; w <= 1000; w += 10) pts.push([w, spectralPhotonFlux(1, w * NM) / 1e18]);
  pts.push([1000, spectralPhotonFlux(0.25, 1000 * NM) / 1e18]);
  for (let w = 1000; w <= 2000; w += 10) pts.push([w, spectralPhotonFlux(0.25, w * NM) / 1e18]);
  pts.push([2000, 0]);
  return pts;
};

export default function SpectrumExplorer({ meta }: { meta: DiagramMeta }) {
  const [mode, setMode] = useState<Mode>('power');
  const [Eg, setEg] = useState(1.12);
  const [showAM0, setShowAM0] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showEx, setShowEx] = useState(false);

  const base = useMemo(() => {
    const am15 = forPlot(AM15);
    const am0 = forPlot(AM0);
    const bb: [number, number][] = [];
    for (let w = 280; w <= LMAX; w += 10) bb.push([w, blackbodyIrradianceAtEarth(w, 5800)]);
    return { am15, am0, bb, am15ph: toPhotons(am15), am0ph: toPhotons(am0), bbph: toPhotons(bb), exPh: ex56Photons() };
  }, []);

  const lg = wavelengthNmFromEV(Eg);
  const stats = useMemo(() => {
    const Ie = irradiance(AM15);
    const IeUse = irradiance(AM15, -Infinity, lg);
    const phi = photonFlux(AM15);
    const phiAbs = photonFlux(AM15, -Infinity, lg);
    return { Ie, IeUse, phi, phiAbs, J: (Q * phiAbs) / 10 };
  }, [lg]);

  const am15 = mode === 'power' ? base.am15 : base.am15ph;
  const usable = am15.filter(([w]) => w <= lg);
  if (usable.length && lg < LMAX) usable.push([lg, am15.find(([w]) => w >= lg)?.[1] ?? 0]);
  const unusable = am15.filter(([w]) => w >= lg);
  const yMax = mode === 'power' ? (showAM0 || showBB ? 2.4 : 2.0) : showAM0 || showBB ? 7 : 5.6;

  return (
    <DiagramFrame
      meta={meta}
      ctx="radiation"
      legend={
        <Legend
          items={[
            { label: 'AM1.5G (1000 W/m²)', color: C.accent },
            { label: `Usable: λ ≤ λg (E ≥ ${Eg.toFixed(2)} eV)`, color: C.wash, kind: 'area' },
            ...(showAM0 ? [{ label: 'AM0 (outside atmosphere)', color: C.s2 }] : []),
            ...(showBB ? [{ label: '5800 K blackbody at Earth', color: C.ink2, dash: true }] : []),
            ...(showEx ? [{ label: 'Ex. 5.6 simplified spectrum', color: C.aux, dash: true }] : []),
          ]}
        />
      }
      controls={
        <>
          <Segmented
            label="Show the spectrum as"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'power', label: 'Power' },
              { value: 'photons', label: 'Photons' },
            ]}
          />
          <Slider
            label={<Term id="bandgap">Bandgap E<sub>G</sub></Term>}
            value={Eg}
            min={0.5}
            max={3}
            step={0.01}
            unit="eV"
            onChange={setEg}
            format={(v) => v.toFixed(2)}
            marks={[
              { value: 1.12, label: 'c-Si 1.12' },
              { value: 1.42, label: 'GaAs 1.42' },
              { value: 1.7, label: 'Cell A (Q2) 1.70' },
            ]}
          />
          <Toggle label="Compare with AM0" checked={showAM0} onChange={setShowAM0} />
          <Toggle label="Compare with a 5800 K blackbody" checked={showBB} onChange={setShowBB} />
          <Toggle label="Overlay exercise 5.6’s simplified spectrum" checked={showEx} onChange={setShowEx} />
        </>
      }
      readouts={
        <>
          <Readout label={<>Absorption edge λ<sub>g</sub> = hc/E<sub>G</sub></>} value={fmt(lg, 4)} unit="nm" />
          <Readout label={<Term id="irradiance">Irradiance (all λ)</Term>} value={fmt(stats.Ie, 4)} unit="W/m²" />
          <Readout label="Photon flux (all λ)" value={sci(stats.phi, 3)} unit="m⁻² s⁻¹" />
          <Readout label="Usable photon flux" value={sci(stats.phiAbs, 3)} unit="m⁻² s⁻¹" />
          <Readout label="Power in usable photons" value={fmt((100 * stats.IeUse) / stats.Ie, 3)} unit="%" />
          <Readout label={<>Max. J<sub>ph</sub> = qΦ<sub>abs</sub></>} value={fmt(stats.J, 3)} unit="mA/cm²" emphasis note="if every usable photon gives one electron" />
        </>
      }
      formulas={[
        { tex: '\\Phi(\\lambda) = P(\\lambda)\\,\\frac{\\lambda}{hc}', label: 'Spectral photon flux (lecture 1 slide 58; sheet eq. 7.3)' },
        { tex: '\\lambda_g = \\frac{hc}{E_G}', label: 'Only photons with λ ≤ λg are absorbed' },
        { tex: 'J_{\\mathrm{ph}} = q\\,\\Phi_{\\mathrm{abs}}', label: 'One electron per absorbed photon (instruction 1 Q2)' },
      ]}
      caption="Spectra: ASTM G173-03 reference tables (AM1.5 global tilt and AM0), external standard data. Readouts integrate the full table (280–4000 nm)."
      notice={
        <>
          <p>
            <strong>Power vs photons.</strong> Switching to ‘Photons’ shifts the spectrum to the red: every photon’s energy is hc/λ, so at long wavelengths
            the same watts contain more photons. The photon-flux peak sits near 650–700 nm, the power peak near 500 nm.
          </p>
          <p>
            <strong>The bandgap trade-off.</strong> Lowering E<sub>G</sub> lets the cell use more of the spectrum, so the maximum current rises (c-Si: about
            44 mA/cm²). But every absorbed photon only delivers about E<sub>G</sub> worth of energy; the rest is lost as heat. A high bandgap wastes the
            infrared, a low bandgap wastes the energy of blue photons. This tension returns in week 6 (efficiency limits) and is why tandem cells stack a
            high-gap cell on a low-gap one (instruction 1 Q2).
          </p>
          <p>
            <strong>AM0 vs AM1.5.</strong> The atmosphere removes UV (ozone), scatters blue light and cuts deep absorption bands in the infrared (water
            vapour near 940, 1130, 1400 and 1900 nm, plus O₂ and CO₂).
          </p>
        </>
      }
    >
      <Plot
        ariaLabel={`AM1.5 solar spectrum as ${mode}; usable for bandgap ${Eg.toFixed(2)} eV up to ${lg.toFixed(0)} nm`}
        x={{ domain: [280, LMAX], label: <Term id="wavelength">Wavelength</Term>, unit: 'nm' }}
        y={
          mode === 'power'
            ? { domain: [0, yMax], label: <Term id="spectral-irradiance">Spectral irradiance</Term>, unit: 'W m⁻² nm⁻¹' }
            : { domain: [0, yMax], label: <Term id="spectral-photon-flux">Spectral photon flux</Term>, unit: '10¹⁸ m⁻² s⁻¹ nm⁻¹' }
        }
        aspect={0.78}
        hover={{
          series: [
            { label: 'AM1.5G', color: C.accent, points: am15, format: (v) => v.toFixed(3) },
            ...(showAM0 ? [{ label: 'AM0', color: C.s2, points: mode === 'power' ? base.am0 : base.am0ph, format: (v: number) => v.toFixed(3) }] : []),
          ],
          xFormat: (v) => `${v.toFixed(0)} nm · ${photonEnergyEV(v).toFixed(2)} eV`,
        }}
      >
        <Area points={unusable} fill="var(--dg-grid)" />
        <Area points={usable} fill={C.wash} />
        {showBB && <Line points={mode === 'power' ? base.bb : base.bbph} color={C.ink2} dash="5 5" width={1.5} />}
        {showAM0 && <Line points={mode === 'power' ? base.am0 : base.am0ph} color={C.s2} width={1.5} />}
        {showEx && <Line points={mode === 'power' ? EX56 : base.exPh} color={C.aux} dash="6 4" width={2} />}
        <Line points={am15} color={C.accent} width={1.6} />
        {lg <= LMAX && (
          <>
            <VRule x={lg} color={C.ink} dash="4 3" />
            <PlotLabel x={lg} y={yMax * 0.8} dx={6} valign="top">
              λ<sub>g</sub> = {lg.toFixed(0)} nm
            </PlotLabel>
          </>
        )}
        <PlotLabel x={Math.max(300, (280 + Math.min(lg, LMAX)) / 2)} y={yMax * 0.98} anchor="middle" valign="top" className="plot__label--plain">
          absorbed → e⁻–h⁺ pairs
        </PlotLabel>
        {lg < 2200 && (
          <PlotLabel x={Math.min(LMAX - 150, lg + (LMAX - lg) / 2)} y={yMax * 0.98} anchor="middle" valign="top" className="plot__label--plain">
            passes through
          </PlotLabel>
        )}
      </Plot>
    </DiagramFrame>
  );
}
