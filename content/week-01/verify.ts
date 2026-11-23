/**
 * Independent computation of every numeric answer in questions.json (and of the values
 * that typical mistakes produce). Checked by src/test/questions.test.ts:
 *   "<qid>"            → answer of a numeric question
 *   "<qid>#<part>"     → answer of a part of a multi-step question
 *   "<key>@<i>"        → value of answer.errors[i]
 * Never type a numeric answer into questions.json without a verifier here.
 */
import { NM, Q, SIGMA, UM, deg } from '@/physics/constants';
import { bandIrradiance, bandPhotonFlux, photonEnergyEV, photonFluxMono, wienPeak } from '@/physics/radiation';
import { absorptance, alphaFromKappa, coatingNoInterference, fresnel, pathLength, quarterWaveThickness, reflectanceNormal, snell, thicknessForAbsorptance } from '@/physics/optics';

const R = reflectanceNormal;

/* M1: LEDs + tandem (modelled on instruction 1, Q2) */
const phiP = photonFluxMono(300, 450 * NM);
const phiQ = photonFluxMono(350, 850 * NM);
const phiS = photonFluxMono(200, 1250 * NM);
const R1 = R(1.0, 3.0);
const R2 = R(1.0, 3.6);
const R3 = R(3.0, 1.5);
const R4 = R(1.5, 3.6);

/* M2: light trapping in c-Si at 950 nm (modelled on instruction 1, Q1) */
const nSi = 3.59;
const tt75 = snell(1, nSi, 75)!;

/* M3: simplified spectrum (modelled on book ex. 5.6 / 5.7) */
const bands: [number, number, number][] = [
  [1.2, 300, 700],
  [0.8, 700, 1100],
  [0.15, 1100, 2000],
];
const phiBand = bands.map(([P, a, b]) => bandPhotonFlux(P, a, b));

/* M4: absorber thickness at 900 nm (c-Si, Green 2008: n = 3.61, κ = 2.17e-3) */
const alpha900 = alphaFromKappa(2.17e-3, 900 * NM); // m^-1

/* N11: Sun surface temperature (book ex. 5.1) */
const dSun = 1.5e11;
const rSun = 6.96e8;

const v: Record<string, () => number> = {
  // N1 photon energy at 700 nm (lecture 1 slide 54)
  'w1-red-photon-ev': () => photonEnergyEV(700),
  // N2 monochromatic photon flux
  'w1-flux-mono': () => photonFluxMono(250, 600 * NM),
  'w1-flux-mono@0': () => 250 / photonEnergyEV(600),
  // N3 critical angle Si → glass
  'w1-critical-si-glass': () => deg(Math.asin(1.5 / 3.57)),
  'w1-critical-si-glass@0': () => deg(Math.asin(1 / 3.57)),
  'w1-critical-si-glass@1': () => Math.asin(1.5 / 3.57),
  // N4 normal incidence air/glass (book ex. 4.1a)
  'w1-r-normal-glass': () => 100 * R(1, 1.5),
  'w1-r-normal-glass@0': () => 100 * Math.abs((1 - 1.5) / (1 + 1.5)),
  // N5 30° air/glass (book ex. 4.1b)
  'w1-r-30-glass': () => 100 * fresnel(1, 1.5, 30).R,
  'w1-r-30-glass@0': () => 100 * R(1, 1.5),
  'w1-r-30-glass@1': () => 100 * fresnel(1, 1.5, 30).Rs,
  // N6 absorption coefficient from κ (c-Si, 1000 nm)
  'w1-alpha-kappa': () => alphaFromKappa(5.09e-4, 1000 * NM) / 100,
  'w1-alpha-kappa@0': () => 5.09e-4 / (1000e-7),
  // N7 absorptance of 100 µm at α = 64 cm^-1
  'w1-absorptance-100um': () => 100 * absorptance(64e2, 100 * UM),
  'w1-absorptance-100um@0': () => 100 * 64e2 * 100 * UM,
  'w1-absorptance-100um@1': () => 100 * Math.exp(-64e2 * 100 * UM),
  // N8 Wien peak of a 5800 K blackbody
  'w1-wien-sun': () => wienPeak(5800) / NM,
  // N9 quarter-wave Si3N4
  'w1-quarter-wave': () => quarterWaveThickness(600, 2.0),
  'w1-quarter-wave@0': () => 600 / 4,
  // N10 photon flux from a photon count (book ex. 5.3)
  'w1-photon-count-flux': () => 4e18 / (20e-4),
  'w1-photon-count-flux@0': () => 4e18 / 0.2,
  // N11 temperature of the Sun (book ex. 5.1)
  'w1-sun-temperature': () => ((1350 * (dSun / rSun) ** 2) / SIGMA) ** 0.25,
  'w1-sun-temperature@0': () => (1350 / SIGMA) ** 0.25,
  'w1-sun-temperature@1': () => ((1350 * (dSun / rSun)) / SIGMA) ** 0.25,
  // N12 yearly irradiation NL in MJ/m² (lecture 1 slide 60)
  'w1-irradiation-mj': () => (1050 * 3.6e6) / 1e6,

  // M1 tandem
  'w1-exam-tandem#a1': () => phiP,
  'w1-exam-tandem#a2': () => phiQ,
  'w1-exam-tandem#a3': () => phiS,
  'w1-exam-tandem#a1@0': () => 300 / photonEnergyEV(450),
  'w1-exam-tandem#b1': () => 100 * R1,
  'w1-exam-tandem#b2': () => 100 * R2,
  'w1-exam-tandem#b3': () => 100 * R3,
  'w1-exam-tandem#b4': () => 100 * R4,
  'w1-exam-tandem#b4@0': () => 100 * Math.abs((1.5 - 3.6) / (1.5 + 3.6)),
  'w1-exam-tandem#c1': () => Q * (1 - R1) * phiP,
  'w1-exam-tandem#c1@0': () => Q * phiP,
  'w1-exam-tandem#c1@1': () => Q * (1 - R1) * (phiP + phiQ),
  'w1-exam-tandem#c2': () => Q * (1 - R2) * (phiP + phiQ),
  'w1-exam-tandem#c2@0': () => Q * (1 - R2) * (phiP + phiQ + phiS),
  'w1-exam-tandem#c2@1': () => Q * (phiP + phiQ),
  'w1-exam-tandem#c3': () => Q * (1 - R1) * (1 - R3) * (1 - R4) * phiQ,
  'w1-exam-tandem#c3@0': () => Q * (1 - R1) * (1 - R2) * (1 - R3) * phiQ,
  'w1-exam-tandem#c3@1': () => Q * (1 - R1) * phiQ,
  'w1-exam-tandem#c3@2': () => Q * (1 - R1) * (1 - R3) * (1 - R4) * (phiP + phiQ),

  // M2 light trapping
  'w1-exam-trapping#a': () => tt75,
  'w1-exam-trapping#a@0': () => 75 / nSi,
  'w1-exam-trapping#b': () => 100 * fresnel(1, nSi, 75).R,
  'w1-exam-trapping#b@0': () => 100 * R(1, nSi),
  'w1-exam-trapping#b@1': () => 100 * fresnel(1, nSi, 75).Rs,
  'w1-exam-trapping#c': () => pathLength(180, tt75),
  'w1-exam-trapping#c@0': () => pathLength(180, 75),
  'w1-exam-trapping#d': () => deg(Math.asin(1 / nSi)),
  'w1-exam-trapping#f': () => quarterWaveThickness(950, 2.0),
  'w1-exam-trapping#f@0': () => 950 / 4,

  // M3 spectrum
  'w1-exam-spectrum#a': () => bands.reduce((s, [P, a, b]) => s + bandIrradiance(P, a, b), 0),
  'w1-exam-spectrum#b': () => phiBand.reduce((s, x) => s + x, 0),
  'w1-exam-spectrum#c': () => (Q * (phiBand[0] + phiBand[1])) / 10, // A/m² → mA/cm²
  'w1-exam-spectrum#c@0': () => Q * (phiBand[0] + phiBand[1]),
  'w1-exam-spectrum#c@1': () => (Q * (phiBand[0] + phiBand[1] + phiBand[2])) / 10,
  'w1-exam-spectrum#d': () => (100 * (1.2 * 400 + 0.8 * 400)) / 935,

  // M4 absorber
  'w1-exam-absorber#a': () => alpha900 / 100,
  'w1-exam-absorber#b': () => 1 / alpha900 / UM,
  'w1-exam-absorber#c': () => thicknessForAbsorptance(alpha900, 0.9) / UM,
  'w1-exam-absorber#c@0': () => 0.9 / alpha900 / UM,
  'w1-exam-absorber#d': () => thicknessForAbsorptance(alpha900, 0.9, 2) / UM,
  'w1-exam-absorber#e': () => 100 * (1 - R(1, 3.61)) * absorptance(alpha900, 180 * UM),
  'w1-exam-absorber#e@0': () => 100 * absorptance(alpha900, 180 * UM),
};

// Coating comparison used in M2(e) feedback text (not a numeric answer, kept for reference).
export const m2Coatings = Object.fromEntries([1.46, 2.0, 2.4].map((nc) => [nc, coatingNoInterference(1, nc, nSi).Rtot]));

export default v;
