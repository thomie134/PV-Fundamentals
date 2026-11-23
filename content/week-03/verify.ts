/**
 * Independent computation of every numeric answer in week-03/questions.json.
 * Keys: "<qid>", "<qid>#<part>", "<key>@<i>". Book ex. 7.6–7.8 are self-derived (no official answers).
 */
import { KB, NM, Q, UM } from '@/physics/constants';
import { alphaFromKappa, reflectanceNormal } from '@/physics/optics';
import { photonFluxMono } from '@/physics/radiation';
import { conductivity, equilibriumDensities, kTeV } from '@/physics/semiconductor';
import { combinedLifetime, diffusionCurrentN, diffusionLength, driftCurrent, einsteinD, ex78Profile, generationRate, lifetimeFromLength } from '@/physics/transport';

/* ex. 6.14 / 6.15 */
const grad614 = (2.7e16 - 1e15) / 2e-4; // cm⁻⁴
const J614 = diffusionCurrentN(36, grad614);

/* ex. 7.5 (SI units as in the answer book) */
const a75 = alphaFromKappa(0.015, 650 * NM); // m⁻¹
const R75 = reflectanceNormal(1, 3.84);
const f75 = photonFluxMono(1000, 650 * NM);
const phi0in = (1 - R75) * f75;
const phi50 = phi0in * Math.exp(-a75 * 50 * UM);
const G50 = generationRate(f75, a75, 50 * UM, R75);
const tau75 = lifetimeFromLength(60e-4, 29);

/* ex. 7.6 (self-derived): N_C,V ≈ 6.2e15 / 3.5e15 × T^1.5, E_G = 1.1 eV */
const ND76 = 1.5e19 / 1000;
const ni76 = (T: number) => Math.sqrt(6.2e15 * 3.5e15 * T ** 3) * Math.exp(-1.1 / (2 * kTeV(T)));
const d300 = equilibriumDensities(ND76, 0, ni76(300));
const d1000 = equilibriumDensities(ND76, 0, ni76(1000));

/* M3: diffusion length in a p-type wafer, μn = 1250 */
const D3 = einsteinD(1250);

/* M4: ex. 7.8 with numbers: W = 200 µm, Dn = 30 cm²/s, G = 1e19 cm⁻³ s⁻¹ */
const W4 = 200e-4;
const D4 = 30;
const G4 = 1e19;
const S4 = 1e3;
const C1_4 = (G4 * W4 * (1 + (S4 * W4) / (2 * D4))) / (D4 + S4 * W4);

const v: Record<string, () => number> = {
  'w3-book-6-14': () => J614,
  'w3-book-6-14@0': () => diffusionCurrentN(36, (2.7e16 - 1e15) / 2), // µm not converted
  'w3-book-6-15': () => J614 / driftCurrent(1e15, 0, 1350, 0, 1),
  'w3-book-6-15@0': () => J614 / driftCurrent(2.7e16, 0, 1350, 0, 1),
  'w3-einstein': () => einsteinD(450),
  'w3-einstein@0': () => einsteinD(1360),
  'w3-sigma': () => conductivity(1e16, 0, 1360, 450),
  'w3-sigma@0': () => conductivity(0, 1e16, 1360, 450),
  'w3-book-7-6h': () => 110 / driftCurrent(0, 1, 0, 470, 25),
  'w3-book-7-2': () => diffusionLength(25.6, 10e-6) * 1e4,
  'w3-book-7-2@0': () => diffusionLength(25.6, 10) * 1e4,
  'w3-book-7-3': () => lifetimeFromLength(200e-4, 27) * 1e6,
  'w3-book-7-3@0': () => (200e-4 / 27) * 1e6,
  'w3-combined-tau': () => combinedLifetime(10e-6, 50e-6) * 1e6,
  'w3-combined-tau@0': () => 30,
  'w3-combined-tau@1': () => 60,
  'w3-alpha-75': () => a75,
  'w3-alpha-75@0': () => a75 / 100, // gave cm⁻¹ value with m⁻¹ unit
  'w3-gen-75': () => G50,
  'w3-gen-75@0': () => a75 * f75 * Math.exp(-a75 * 50 * UM), // no reflection
  'w3-dn-75': () => G50 * tau75,
  'w3-dn-75@0': () => G50 * (60e-4 / 29), // used L/D instead of L²/D

  // M1: book ex. 7.5 (official)
  'w3-exam-75#a': () => a75,
  'w3-exam-75#b': () => R75,
  'w3-exam-75#c': () => phi0in,
  'w3-exam-75#c@0': () => f75,
  'w3-exam-75#d': () => phi50,
  'w3-exam-75#e': () => G50,
  'w3-exam-75#f': () => G50 * tau75,

  // M2: book ex. 7.6 (self-derived)
  'w3-exam-76#a': () => ND76,
  'w3-exam-76#a@0': () => 1.5e19,
  'w3-exam-76#b': () => (ND76 / 5e22) * 1e6,
  'w3-exam-76#c': () => ni76(300),
  'w3-exam-76#d': () => d300.p,
  'w3-exam-76#e': () => kTeV(300) * Math.log((6.2e15 * 300 ** 1.5) / d300.n),
  'w3-exam-76#f': () => ni76(1000),
  'w3-exam-76#f@0': () => ni76(1000) / Math.sqrt(1000 ** 3) * Math.sqrt(300 ** 3), // N_C, N_V not rescaled
  'w3-exam-76#g': () => d1000.n,
  'w3-exam-76#g@0': () => ND76,
  'w3-exam-76#h': () => kTeV(1000) * Math.log((6.2e15 * 1000 ** 1.5) / d1000.n),

  // M3: diffusion length
  'w3-exam-L#a': () => D3,
  'w3-exam-L#b': () => diffusionLength(D3, 20e-6) * 1e4,
  'w3-exam-L#b@0': () => diffusionLength(D3, 20) * 1e4,
  'w3-exam-L#d': () => combinedLifetime(20e-6, 5e-6) * 1e6,
  'w3-exam-L#d@0': () => 12.5,
  'w3-exam-L#e': () => diffusionLength(D3, combinedLifetime(20e-6, 5e-6)) * 1e4,

  // M4: ex. 7.8 with numbers (self-derived)
  'w3-exam-78#a': () => ex78Profile(W4, G4, W4, D4, 0),
  'w3-exam-78#a@0': () => (G4 * W4 * W4) / D4,
  'w3-exam-78#b': () => ex78Profile(W4, G4, W4, D4, S4),
  'w3-exam-78#c': () => ((C1_4 * D4) / G4) * 1e4,
};

/** kT/q at 300 K in V (for solution text). */
export const thermalV = (KB * 300) / Q;
export default v;
