import { useState } from 'react';
import { DiagramFrame, Readout, Segmented, sci } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';

interface U {
  id: string;
  label: string;
  /** value of 1 of this unit in the SI unit of the group */
  f: number;
  /** derivation shown to the student */
  why: string;
}

const GROUPS: Record<string, { label: string; si: string; units: U[] }> = {
  length: {
    label: 'Length',
    si: 'm',
    units: [
      { id: 'nm', label: 'nm', f: 1e-9, why: '1 nm = 10⁻⁹ m' },
      { id: 'um', label: 'µm', f: 1e-6, why: '1 µm = 10⁻⁶ m' },
      { id: 'cm', label: 'cm', f: 1e-2, why: '1 cm = 10⁻² m' },
      { id: 'm', label: 'm', f: 1, why: 'SI unit' },
    ],
  },
  area: {
    label: 'Area',
    si: 'm²',
    units: [
      { id: 'nm2', label: 'nm²', f: 1e-18, why: '1 nm² = (10⁻⁹ m)² = 10⁻¹⁸ m²' },
      { id: 'um2', label: 'µm²', f: 1e-12, why: '1 µm² = (10⁻⁶ m)² = 10⁻¹² m²' },
      { id: 'cm2', label: 'cm²', f: 1e-4, why: '1 cm² = (10⁻² m)² = 10⁻⁴ m²' },
      { id: 'm2', label: 'm²', f: 1, why: 'SI unit' },
    ],
  },
  density: {
    label: 'Per volume',
    si: 'm⁻³',
    units: [
      { id: 'cm-3', label: 'cm⁻³', f: 1e6, why: '1 cm⁻³ = 1/(10⁻² m)³ = 10⁶ m⁻³' },
      { id: 'm-3', label: 'm⁻³', f: 1, why: 'SI unit' },
    ],
  },
  energy: {
    label: 'Energy',
    si: 'J',
    units: [
      { id: 'eV', label: 'eV', f: 1.602177e-19, why: '1 eV = q × 1 V = 1.602 × 10⁻¹⁹ J' },
      { id: 'J', label: 'J', f: 1, why: 'SI unit' },
      { id: 'MJ', label: 'MJ', f: 1e6, why: '1 MJ = 10⁶ J' },
      { id: 'kWh', label: 'kWh', f: 3.6e6, why: '1 kWh = 10³ W × 3600 s = 3.6 × 10⁶ J' },
    ],
  },
  current: {
    label: 'Current density',
    si: 'A/m²',
    units: [
      { id: 'mAcm2', label: 'mA/cm²', f: 10, why: '1 mA/cm² = 10⁻³ A / 10⁻⁴ m² = 10 A/m²' },
      { id: 'Acm2', label: 'A/cm²', f: 1e4, why: '1 A/cm² = 1 A / 10⁻⁴ m² = 10⁴ A/m²' },
      { id: 'Am2', label: 'A/m²', f: 1, why: 'SI unit' },
    ],
  },
  spectral: {
    label: 'Spectral irradiance',
    si: 'W m⁻³',
    units: [
      { id: 'Wm2nm', label: 'W m⁻² nm⁻¹', f: 1e9, why: '1 W m⁻² nm⁻¹ = 1 W m⁻² / 10⁻⁹ m = 10⁹ W m⁻³' },
      { id: 'Wm2um', label: 'W m⁻² µm⁻¹', f: 1e6, why: '1 W m⁻² µm⁻¹ = 10⁶ W m⁻³' },
      { id: 'Wm3', label: 'W m⁻³', f: 1, why: 'SI unit' },
    ],
  },
};

type G = keyof typeof GROUPS;

export default function UnitConverter({ meta }: { meta: DiagramMeta }) {
  const [g, setG] = useState<G>('area');
  const group = GROUPS[g];
  const [from, setFrom] = useState(group.units[group.units.length - 2]?.id ?? group.units[0].id);
  const [to, setTo] = useState(group.units[group.units.length - 1].id);
  const [val, setVal] = useState('1');
  const uf = group.units.find((u) => u.id === from) ?? group.units[0];
  const ut = group.units.find((u) => u.id === to) ?? group.units[group.units.length - 1];
  const x = Number(val.replace(',', '.'));
  const factor = uf.f / ut.f;
  const result = Number.isFinite(x) ? x * factor : NaN;

  const pick = (ng: G) => {
    setG(ng);
    const us = GROUPS[ng].units;
    setFrom(us[0].id);
    setTo(us[us.length - 1].id);
  };

  return (
    <DiagramFrame
      meta={meta}
      ctx="general"
      controls={
        <>
          <Segmented label="Quantity" value={g} onChange={pick} options={(Object.keys(GROUPS) as G[]).map((k) => ({ value: k, label: GROUPS[k].label }))} />
        </>
      }
      readouts={
        <>
          <Readout label="Conversion factor" value={sci(factor, 4)} />
          <Readout label="Result" value={Number.isFinite(result) ? sci(result, 4) : '–'} unit={ut.label} emphasis />
        </>
      }
      notice={
        <>
          <p>
            <strong>Powers multiply the prefix.</strong> cm → m is a factor 10⁻². For cm² it is (10⁻²)² = 10⁻⁴, for cm³ it is 10⁻⁶. For a density <em>per</em> cm³
            the factor flips to 10⁶: a cubic metre contains a million cubic centimetres, so a million times more particles.
          </p>
          <p>
            <strong>Spectral quantities hide a ‘per length’.</strong> W m⁻² nm⁻¹ means watts per m² per nanometre. Per metre of wavelength that is 10⁹ times
            more, which is why exercise 5.6 uses 1.00 × 10⁹ W m⁻² m⁻¹.
          </p>
        </>
      }
    >
      <div className="converter">
        <div className="converter__row">
          <input className="input converter__input" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-label="Value to convert" />
          <select className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From unit">
            {group.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
          <span aria-hidden>→</span>
          <select className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To unit">
            {group.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <p className="converter__result num" aria-live="polite">
          {val || '0'} {uf.label} = {Number.isFinite(result) ? sci(result, 4) : '–'} {ut.label}
        </p>
        <ol className="converter__why">
          <li>{uf.why}</li>
          {ut.id !== uf.id && <li>{ut.why}</li>}
          <li>
            So multiply by {uf.f === 1 ? '1' : sci(uf.f, 4)} / {ut.f === 1 ? '1' : sci(ut.f, 4)} = <strong>{sci(factor, 4)}</strong>
          </li>
        </ol>
      </div>
    </DiagramFrame>
  );
}
