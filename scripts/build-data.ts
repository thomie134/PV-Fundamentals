/**
 * Convert raw reference datasets in content/data/raw/ into compact JSON for the site.
 *
 * External, reputable sources (labelled as such wherever they are shown on the site):
 *  - ASTM G173-03 reference spectra (AM0 extraterrestrial + AM1.5 global tilt), via pvlib-python's copy.
 *  - M. A. Green, Sol. Energy Mater. Sol. Cells 92, 1305 (2008): optical constants of c-Si at 300 K,
 *    via the refractiveindex.info database (CC0).
 * Run: npm run data
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'content', 'data');
const raw = path.join(root, 'raw');

const rows = fs.readFileSync(path.join(raw, 'ASTMG173.csv'), 'utf8').trim().split(/\r?\n/).slice(2).map((l) => l.split(',').map(Number));
const wavelength = rows.map((r) => r[0]);
const am0 = rows.map((r) => r[1]);
const am15g = rows.map((r) => r[2]);
fs.writeFileSync(path.join(root, 'astm-g173.json'), JSON.stringify({
  source: 'ASTM G173-03 reference spectra (SMARTS v2.9.2), via pvlib-python',
  unit_wavelength: 'nm', unit_irradiance: 'W m^-2 nm^-1', wavelength, am0, am15g,
}));

const yml = fs.readFileSync(path.join(raw, 'Si-Green-2008.yml'), 'utf8').split('data: |')[1].trim().split(/\r?\n/);
const si: [number, number, number][] = [];
for (const ln of yml) {
  const p = ln.trim().split(/\s+/).map(Number);
  if (p.length !== 3 || p.some(Number.isNaN)) break;
  si.push([Math.round(p[0] * 1e6) / 1e3, p[1], p[2]]);
}
fs.writeFileSync(path.join(root, 'si-optical-green2008.json'), JSON.stringify({
  source: 'M. A. Green, Sol. Energy Mater. Sol. Cells 92, 1305-1310 (2008), via refractiveindex.info (CC0)',
  columns: ['wavelength_nm', 'n', 'kappa'], data: si,
}));

const trap = (x: number[], y: number[]) => x.slice(1).reduce((s, xi, i) => s + (xi - x[i]) * (y[i + 1] + y[i]) / 2, 0);
console.log(`G173: ${wavelength.length} points, AM1.5G = ${trap(wavelength, am15g).toFixed(1)} W/m2, AM0 = ${trap(wavelength, am0).toFixed(1)} W/m2`);
console.log(`Si (Green 2008): ${si.length} points, ${si[0][0]}-${si[si.length - 1][0]} nm`);
for (const t of [650, 1000]) {
  const r = si.reduce((a, b) => (Math.abs(b[0] - t) < Math.abs(a[0] - t) ? b : a));
  console.log(`  ${r[0]} nm: n=${r[1]}, kappa=${r[2]}, alpha=${(4 * Math.PI * r[2] / (r[0] * 1e-7)).toPrecision(3)} cm^-1`);
}
