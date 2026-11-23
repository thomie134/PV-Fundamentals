/**
 * Physical constants, taken from the official equation sheet (content/constants.json).
 * All physics functions use SI units unless their name says otherwise (…EV, …Nm, …Cm).
 */
import data from '@content/constants.json';

const byId = Object.fromEntries(data.constants.map((c) => [c.id, c.value])) as Record<string, number>;

export const C0 = byId.c0; // m/s
export const EPS0 = byId.eps0; // A s V^-1 m^-1
export const H = byId.h; // J s
export const KB = byId.kB; // J/K
export const Q = byId.q; // C (also J per eV)
export const SIGMA = byId.sigma; // W m^-2 K^-4
export const WIEN_B = byId.b; // m K

/** Boltzmann constant in eV/K. */
export const KB_EV = KB / Q;

export const SI_300K = Object.fromEntries(
  data.materials[0].properties.map((p) => [p.id, p.value]),
) as Record<'EG-Si' | 'NC-Si' | 'NV-Si' | 'mun-Si' | 'mup-Si', number>;

/** Unit helpers. */
export const NM = 1e-9;
export const UM = 1e-6;
export const CM = 1e-2;
export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (degrees: number) => (degrees * Math.PI) / 180;
export const eVtoJ = (eV: number) => eV * Q;
export const JtoEV = (J: number) => J / Q;
