/**
 * Week 1: solar radiation (book Ch. 5, lecture 1 §1.4).
 * SI units throughout unless the name says otherwise.
 */
import { C0, H, Q, SIGMA, WIEN_B, KB, NM } from './constants';

/** Photon energy E = hν = hc/λ (eq. 3.1 / 5.22) in J. λ in m. */
export const photonEnergy = (lambda: number) => (H * C0) / lambda;

/** Photon energy in eV for a wavelength in nm. */
export const photonEnergyEV = (lambdaNm: number) => photonEnergy(lambdaNm * NM) / Q;

/** Wavelength (nm) of a photon with energy E (eV): λ = hc/E. Also the absorption edge λg for a bandgap. */
export const wavelengthNmFromEV = (eV: number) => (H * C0) / (eV * Q) / NM;

/** Frequency ν = c/(nλ) (eq. 4.6 rearranged; n = 1 in vacuum/air). */
export const frequency = (lambda: number, n = 1) => C0 / (n * lambda);

/** Photon flux density of monochromatic light: Φ = I λ / (hc)  [m^-2 s^-1]. I in W/m², λ in m. */
export const photonFluxMono = (irradiance: number, lambda: number) => (irradiance * lambda) / (H * C0);

/** Spectral photon flux Φ_ph,λ = I_eλ λ / (hc) (eq. 7.3 / 5.15). I_eλ in W m^-2 m^-1, λ in m → m^-2 s^-1 m^-1. */
export const spectralPhotonFlux = (Ielambda: number, lambda: number) => (Ielambda * lambda) / (H * C0);

/** Trapezoidal integral of y(x). */
export function trapz(x: readonly number[], y: readonly number[]): number {
  let s = 0;
  for (let i = 1; i < x.length; i++) s += ((x[i] - x[i - 1]) * (y[i] + y[i - 1])) / 2;
  return s;
}

export interface Spectrum {
  /** wavelengths in nm */
  wavelength: readonly number[];
  /** spectral irradiance in W m^-2 nm^-1 */
  irradiance: readonly number[];
}

/** Clip a spectrum to [lo, hi] nm, interpolating the edge values. */
export function clip(s: Spectrum, lo: number, hi: number): Spectrum {
  const wl: number[] = [];
  const ir: number[] = [];
  const at = (x: number) => interp(s.wavelength, s.irradiance, x);
  if (lo > s.wavelength[0]) {
    wl.push(lo);
    ir.push(at(lo));
  }
  for (let i = 0; i < s.wavelength.length; i++) {
    const x = s.wavelength[i];
    if (x >= lo && x <= hi) {
      wl.push(x);
      ir.push(s.irradiance[i]);
    }
  }
  if (hi < s.wavelength[s.wavelength.length - 1]) {
    wl.push(hi);
    ir.push(at(hi));
  }
  return { wavelength: wl, irradiance: ir };
}

/** Linear interpolation, clamped at the ends. */
export function interp(xs: readonly number[], ys: readonly number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let lo = 0;
  let hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return ys[lo] + t * (ys[hi] - ys[lo]);
}

/** Irradiance I_e = ∫ I_eλ dλ over [lo, hi] nm, in W/m². */
export function irradiance(s: Spectrum, lo = -Infinity, hi = Infinity): number {
  const c = clip(s, Math.max(lo, s.wavelength[0]), Math.min(hi, s.wavelength[s.wavelength.length - 1]));
  return trapz(c.wavelength, c.irradiance);
}

/** Total photon flux Φ_ph = ∫ I_eλ λ/(hc) dλ over [lo, hi] nm, in m^-2 s^-1. */
export function photonFlux(s: Spectrum, lo = -Infinity, hi = Infinity): number {
  const c = clip(s, Math.max(lo, s.wavelength[0]), Math.min(hi, s.wavelength[s.wavelength.length - 1]));
  // I_eλ [W m^-2 nm^-1] × λ[m]/(hc) → photons m^-2 s^-1 nm^-1; integrate over nm.
  const phi = c.wavelength.map((wl, i) => spectralPhotonFlux(c.irradiance[i], wl * NM));
  return trapz(c.wavelength, phi);
}

/**
 * A band with constant spectral irradiance P [W m^-2 nm^-1] between λ1 and λ2 [nm] (book ex. 5.6).
 * I_e = P (λ2 − λ1);  Φ = P (λ2² − λ1²) / (2hc)  (λ in m, P in W m^-3).
 */
export const bandIrradiance = (P: number, l1: number, l2: number) => P * (l2 - l1);
export const bandPhotonFlux = (P: number, l1: number, l2: number) => ((P / NM) * ((l2 * NM) ** 2 - (l1 * NM) ** 2)) / (2 * H * C0);

/** Planck's law, spectral radiance per wavelength (eq. 5.18a): W m^-2 sr^-1 m^-1. */
export function planckRadiance(lambda: number, T: number): number {
  const x = (H * C0) / (lambda * KB * T);
  return ((2 * H * C0 * C0) / lambda ** 5) / Math.expm1(x);
}

/** Solid angle of the Sun seen from Earth (eq. 5.24/5.25), ≈ 68.5 µsr. */
export const OMEGA_SUN = Math.PI * (696000 / (149600000 - 6370)) ** 2;

/** Blackbody spectral irradiance at Earth for a Sun-sized blackbody (eq. 5.23), in W m^-2 nm^-1. */
export const blackbodyIrradianceAtEarth = (lambdaNm: number, T: number) => planckRadiance(lambdaNm * NM, T) * OMEGA_SUN * NM;

/** Stefan–Boltzmann law: total radiant emittance M = σT⁴ (eq. 5.19), W/m². */
export const stefanBoltzmann = (T: number) => SIGMA * T ** 4;

/** Wien's displacement law: λ_max = b/T (eq. 5.21), in m. */
export const wienPeak = (T: number) => WIEN_B / T;

/** Air mass AM = 1/cos θ, θ = angle between Sun and zenith (eq. 5.26). θ in degrees. */
export const airMass = (zenithDeg: number) => 1 / Math.cos((zenithDeg * Math.PI) / 180);

/**
 * Photocurrent density if every photon with E ≥ E_G (λ ≤ λg) creates one collected electron:
 * J_ph = q Φ(λ ≤ λg), in A/m².
 */
export const maxPhotocurrent = (s: Spectrum, EgEV: number, transmitted = 1) => Q * transmitted * photonFlux(s, -Infinity, wavelengthNmFromEV(EgEV));
