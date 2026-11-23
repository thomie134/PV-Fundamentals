/**
 * Tabulated material data (external reference data, labelled on the site).
 * c-Si optical constants at 300 K: M. A. Green, Sol. Energy Mater. Sol. Cells 92, 1305 (2008).
 */
import si from '@content/data/si-optical-green2008.json';
import { alphaFromKappa } from './optics';
import { interp } from './radiation';

const wl = si.data.map((r) => r[0]);
const nArr = si.data.map((r) => r[1]);
const kArr = si.data.map((r) => r[2]);
const logK = kArr.map((k) => Math.log(Math.max(k, 1e-12)));

export const SI_DATA_RANGE: [number, number] = [wl[0], wl[wl.length - 1]];

/** n, κ and α (cm⁻¹) of c-Si at wavelength λ (nm), interpolated (κ log-linearly). */
export function siOptical(lambdaNm: number) {
  const n = interp(wl, nArr, lambdaNm);
  const kappa = Math.exp(interp(wl, logK, lambdaNm));
  const alphaCm = alphaFromKappa(kappa, lambdaNm * 1e-9) / 100;
  return { n, kappa, alphaCm };
}
