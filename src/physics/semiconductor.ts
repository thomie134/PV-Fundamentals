/**
 * Week 2: semiconductor carrier statistics (book Ch. 6.2–6.4, lecture 2).
 * Units: energies in eV, densities in cm⁻³, temperatures in K (as in the course).
 * Energies are measured from the conduction band edge unless stated otherwise (E_C = 0, E_V = −E_G),
 * like lecture 2 slide 53 and the book example on p. 57.
 */
import { KB, KB_EV, Q, SI_300K } from './constants';

/** Thermal energy k_B·T in eV. */
export const kTeV = (T = 300) => KB_EV * T;

/** Fermi–Dirac occupation probability f(E) for an energy E − E_F (eV) at temperature T (eq. 6.3). */
export function fermiDirac(dE: number, T = 300): number {
  if (T <= 0) return dE < 0 ? 1 : dE > 0 ? 0 : 0.5;
  return 1 / (1 + Math.exp(dE / kTeV(T)));
}

/** Boltzmann approximation of f(E): exp(−(E − E_F)/kT) (lecture 2 slide 48). Valid for E − E_F ≳ 3kT. */
export function boltzmann(dE: number, T = 300): number {
  return Math.exp(-dE / kTeV(T));
}

/** Effective densities of states scale as T^{3/2} (eq. 6.7 with constant effective masses). */
export const NcAt = (T: number, Nc300 = SI_300K['NC-Si']) => Nc300 * (T / 300) ** 1.5;
export const NvAt = (T: number, Nv300 = SI_300K['NV-Si']) => Nv300 * (T / 300) ** 1.5;

/** Electron density for a Fermi level E_F − E_C (eV, usually negative), eq. 6.6a. */
export const electronDensity = (EFminusEC: number, Nc = SI_300K['NC-Si'], T = 300) => Nc * Math.exp(EFminusEC / kTeV(T));
/** Hole density for E_V − E_F (eV, usually negative), eq. 6.6b. */
export const holeDensity = (EVminusEF: number, Nv = SI_300K['NV-Si'], T = 300) => Nv * Math.exp(EVminusEF / kTeV(T));

/** Intrinsic carrier density n_i = √(N_C N_V) exp(−E_G / 2kT), eq. 6.9. */
export function intrinsicDensity(Eg = SI_300K['EG-Si'], Nc = SI_300K['NC-Si'], Nv = SI_300K['NV-Si'], T = 300, kT = kTeV(T)): number {
  return Math.sqrt(Nc * Nv) * Math.exp(-Eg / (2 * kT));
}

/** n_i at temperature T with N_C, N_V ∝ T^{3/2} and a constant bandgap (lecture 2 slide 51 / book ex. 7.6). */
export const intrinsicDensityAt = (T: number, Eg = SI_300K['EG-Si'], Nc300 = SI_300K['NC-Si'], Nv300 = SI_300K['NV-Si']) =>
  intrinsicDensity(Eg, NcAt(T, Nc300), NvAt(T, Nv300), T);

/** Intrinsic Fermi level relative to E_C (eV, negative): −E_G/2 + (kT/2) ln(N_V/N_C), eq. 6.11. */
export const intrinsicFermiLevel = (Eg = SI_300K['EG-Si'], Nc = SI_300K['NC-Si'], Nv = SI_300K['NV-Si'], T = 300) =>
  -Eg / 2 + (kTeV(T) / 2) * Math.log(Nv / Nc);

/** E_C − E_F (eV) for a given electron density: kT ln(N_C/n), from eq. 6.6a (= eq. 6.22a with n = N_D). */
export const ecMinusEf = (n: number, Nc = SI_300K['NC-Si'], T = 300) => kTeV(T) * Math.log(Nc / n);
/** E_F − E_V (eV) for a given hole density: kT ln(N_V/p), from eq. 6.6b (= eq. 6.22b with p = N_A). */
export const efMinusEv = (p: number, Nv = SI_300K['NV-Si'], T = 300) => kTeV(T) * Math.log(Nv / p);

/**
 * Equilibrium carrier densities from charge neutrality p + N_D − n − N_A = 0 (eq. 6.15) and np = n_i² (eq. 6.9),
 * assuming full ionisation. Exact solution of the quadratic; reduces to n ≈ N_D, p ≈ n_i²/N_D for N_D ≫ n_i.
 */
export function equilibriumDensities(ND: number, NA: number, ni: number): { n: number; p: number } {
  const half = (ND - NA) / 2;
  const root = Math.sqrt(half * half + ni * ni);
  if (half >= 0) {
    const n = half + root;
    return { n, p: (ni * ni) / n };
  }
  const p = -half + root;
  return { n: (ni * ni) / p, p };
}

/** Law of mass action: minority density from majority density. */
export const minority = (majority: number, ni: number) => (ni * ni) / majority;

/** Atoms per cm³ for a cubic unit cell with `atomsPerCell` atoms and lattice constant a (m). */
export const atomDensityCm3 = (aMetre: number, atomsPerCell = 8) => atomsPerCell / (aMetre * 100) ** 3;

/** Quasi-Fermi level splitting from n and p: E_Fn − E_Fp = kT ln(np/n_i²) (lecture 2 slide 72). */
export const quasiFermiSplitting = (n: number, p: number, ni: number, T = 300) => kTeV(T) * Math.log((n * p) / (ni * ni));

/** Density of states shape √(E − E_C) for E > E_C (eq. 6.2a, arbitrary units). */
export const dosShape = (EminusEdge: number) => (EminusEdge > 0 ? Math.sqrt(EminusEdge) : 0);

/** Conductivity σ = q(nμn + pμp) in S/cm, with densities in cm⁻³ and mobilities in cm²/Vs (lecture 3 slide 24). */
export const conductivity = (n: number, p: number, mun = SI_300K['mun-Si'], mup = SI_300K['mup-Si']) => Q * (n * mun + p * mup);

/** kT/q in volts. */
export const thermalVoltage = (T = 300) => (KB * T) / Q;
