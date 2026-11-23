/**
 * Week 1: optics of interfaces and absorption (book Ch. 4, §10.4 ARC; lecture 1 §1.5).
 * Angles in degrees at the API surface; lengths in m unless named otherwise.
 */
import { deg, rad } from './constants';

/** Snell's law n1 sin θi = n2 sin θt (eq. 4.11). Returns θt in degrees, or null for total internal reflection. */
export function snell(n1: number, n2: number, thetaIDeg: number): number | null {
  const s = (n1 / n2) * Math.sin(rad(thetaIDeg));
  if (s > 1 + 1e-12) return null;
  return deg(Math.asin(Math.min(1, s)));
}

/** Critical angle for light going from the denser medium n2 into n1 < n2: sin θcrit = n1/n2 (eq. 4.19). Degrees. */
export function criticalAngle(n1: number, n2: number): number | null {
  if (n1 >= n2) return null;
  return deg(Math.asin(n1 / n2));
}

export interface FresnelResult {
  thetaT: number | null;
  rs: number;
  rp: number;
  Rs: number;
  Rp: number;
  /** Unpolarised reflectance R = (rs² + rp²)/2 (eq. 4.14) */
  R: number;
  tir: boolean;
}

/** Fresnel equations (eq. 4.12b, 4.13b) for non-absorbing media. */
export function fresnel(n1: number, n2: number, thetaIDeg: number): FresnelResult {
  const thetaT = snell(n1, n2, thetaIDeg);
  if (thetaT === null) return { thetaT: null, rs: 1, rp: 1, Rs: 1, Rp: 1, R: 1, tir: true };
  const ci = Math.cos(rad(thetaIDeg));
  const ct = Math.cos(rad(thetaT));
  const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
  const rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
  return { thetaT, rs, rp, Rs: rs * rs, Rp: rp * rp, R: (rs * rs + rp * rp) / 2, tir: false };
}

/** Reflectance at normal incidence R = ((n1 − n2)/(n1 + n2))² (eq. 4.15). */
export const reflectanceNormal = (n1: number, n2: number) => ((n1 - n2) / (n1 + n2)) ** 2;

/** Absorption coefficient α = 4πκ/λ0 (eq. 4.26). λ0 in m → α in m^-1. */
export const alphaFromKappa = (kappa: number, lambda0: number) => (4 * Math.PI * kappa) / lambda0;

/** Lambert–Beer law I(z) = I0 exp(−αz) (eq. 4.25). */
export const lambertBeer = (I0: number, alpha: number, z: number) => I0 * Math.exp(-alpha * z);

/** Absorptance of a layer, ignoring reflection: A = 1 − I(t)/I0 = 1 − exp(−α t) (lecture 1 slide 83). */
export const absorptance = (alpha: number, thickness: number, passes = 1) => 1 - Math.exp(-alpha * thickness * passes);

/** Penetration depth δp = 1/α (eq. 4.27). */
export const penetrationDepth = (alpha: number) => 1 / alpha;

/** Thickness needed to absorb a fraction A: t = −ln(1 − A)/α. */
export const thicknessForAbsorptance = (alpha: number, A: number, passes = 1) => -Math.log(1 - A) / (alpha * passes);

/** One-way path through a layer of thickness d at internal angle θt (instruction 1 Q1c). */
export const pathLength = (d: number, thetaTDeg: number) => d / Math.cos(rad(thetaTDeg));

/** Optimal single-interlayer index without interference: n1 = √(n0 ns) (eq. 10.32). */
export const optimalArcIndex = (n0: number, ns: number) => Math.sqrt(n0 * ns);

/** Quarter-wave ARC thickness: n1 d = λ0/4 (eq. 10.38) → d = λ0/(4 n1). */
export const quarterWaveThickness = (lambda0: number, nCoating: number) => lambda0 / (4 * nCoating);

/**
 * Coating without interference, as in instruction 1 Q1(e,f): R1 (air/coating) + R2 (coating/substrate).
 * Also returns the transmitted fraction (1 − R1)(1 − R2), which is what actually enters the substrate.
 */
export function coatingNoInterference(n0: number, nc: number, ns: number) {
  const R1 = reflectanceNormal(n0, nc);
  const R2 = reflectanceNormal(nc, ns);
  return { R1, R2, Rtot: R1 + R2, transmitted: (1 - R1) * (1 - R2) };
}

/* ---- Thin-film interference (beyond the formula sheet; used for the lecture's coating-colour slides) ---- */

type Cx = [number, number];
const add = (a: Cx, b: Cx): Cx => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a: Cx, b: Cx): Cx => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const sub = (a: Cx, b: Cx): Cx => [a[0] - b[0], a[1] - b[1]];
const abs2 = (a: Cx) => a[0] * a[0] + a[1] * a[1];
const expi = (phi: Cx): Cx => {
  // exp(i·phi) for complex phi = a + ib: e^{-b}(cos a + i sin a)
  const m = Math.exp(-phi[1]);
  return [m * Math.cos(phi[0]), m * Math.sin(phi[0])];
};

/**
 * Normal-incidence reflectance of a single non-absorbing coating (index nc, thickness d) on a substrate
 * with complex index ns + iκs, including interference (standard thin-film result, e.g. Hecht, Optics §9.7).
 * r = (r01 + r12 e^{2iδ}) / (1 + r01 r12 e^{2iδ}),  δ = 2π nc d / λ0.
 */
export function thinFilmReflectance(lambda0: number, n0: number, nc: number, d: number, ns: number, kappaS = 0): number {
  const N0: Cx = [n0, 0];
  const Nc: Cx = [nc, 0];
  const Ns: Cx = [ns, kappaS];
  const r01 = div(sub(N0, Nc), add(N0, Nc));
  const r12 = div(sub(Nc, Ns), add(Nc, Ns));
  const delta = (2 * Math.PI * nc * d) / lambda0;
  const e = expi([2 * delta, 0]);
  const num = add(r01, mul(r12, e));
  const den = add([1, 0], mul(mul(r01, r12), e));
  return abs2(div(num, den));
}
