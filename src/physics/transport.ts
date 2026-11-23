/**
 * Week 3: charge transport, generation and recombination (book §6.5, Ch. 7; lecture 3).
 * Course units: densities in cm⁻³, lengths in cm, mobility in cm²/Vs, D in cm²/s, fields in V/cm,
 * currents in A/cm², rates in cm⁻³ s⁻¹, unless the name says otherwise.
 */
import { KB, Q } from './constants';

/** Total drift current density J = q(nμn + pμp)ξ (eq. 6.25), A/cm². */
export const driftCurrent = (n: number, p: number, mun: number, mup: number, field: number) => Q * (n * mun + p * mup) * field;

/** Electron diffusion current density J = qDn dn/dx (eq. 6.26a), A/cm² for dn/dx in cm⁻⁴. */
export const diffusionCurrentN = (Dn: number, dndx: number) => Q * Dn * dndx;
/** Hole diffusion current density J = −qDp dp/dx (eq. 6.26b). */
export const diffusionCurrentP = (Dp: number, dpdx: number) => -Q * Dp * dpdx;

/** Einstein relation D = μ k_BT/q (eq. 6.28). */
export const einsteinD = (mu: number, T = 300) => (mu * KB * T) / Q;
/** Mobility from a diffusion coefficient (inverse Einstein). */
export const einsteinMu = (D: number, T = 300) => (D * Q) / (KB * T);

/** Diffusion length L = √(Dτ) (eq. 7.28); cm for D in cm²/s and τ in s. */
export const diffusionLength = (D: number, tau: number) => Math.sqrt(D * tau);
/** Lifetime from a diffusion length: τ = L²/D. */
export const lifetimeFromLength = (L: number, D: number) => (L * L) / D;

/** Combined lifetime 1/τ = Σ 1/τᵢ (eq. 7.27). Infinite entries are ignored. */
export const combinedLifetime = (...taus: number[]) => 1 / taus.reduce((s, t) => s + (Number.isFinite(t) && t > 0 ? 1 / t : 0), 0);

/** Radiative (direct) lifetime of minority carriers, τ = 1/(β N) (eq. 7.19/7.24). */
export const tauRadiative = (beta: number, majority: number) => 1 / (beta * majority);
/** Auger lifetime in doped material, τ = 1/(C N²) (eq. 7.45/7.47). */
export const tauAuger = (C: number, N: number) => 1 / (C * N * N);
/** SRH lifetime τ = 1/(c N_T) (eq. 7.41). */
export const tauSRH = (captureCoeff: number, NT: number) => 1 / (captureCoeff * NT);

/** Photon flux of monochromatic light: Φ = I λ / (hc) — re-exported idea from week 1, here in m⁻² s⁻¹. */

/**
 * Generation rate at depth x for monochromatic light, including front reflection:
 * G(x) = (1 − R) Φ₀ α e^{−αx} (eq. 7.4 with (1 − R), book example p. 69). Units follow the inputs.
 */
export const generationRate = (phi0: number, alpha: number, x: number, R = 0, etaG = 1) => etaG * (1 - R) * phi0 * alpha * Math.exp(-alpha * x);

/** Steady-state uniform excess density Δn = G τ (low injection, no current; book ex. 7.5e). */
export const steadyExcess = (G: number, tau: number) => G * tau;

/** Excess density decay after the light is switched off: Δ(t) = Δ₀ e^{−t/τ} (eq. 7.22). */
export const excessDecay = (delta0: number, t: number, tau: number) => delta0 * Math.exp(-t / tau);

export type Boundary = { kind: 'value'; value: number } | { kind: 'surface'; S: number } | { kind: 'reflect' };

/**
 * Solve the 1-D steady-state minority-carrier continuity equation without field
 *   D Δ'' − Δ/τ + G(x) = 0   on [0, W]
 * by finite differences (N intervals, tridiagonal Thomas algorithm).
 * Boundaries: fixed value, surface recombination (D dΔ/dn_out = −S Δ, outward normal), or reflecting (S = 0).
 * τ = Infinity means no bulk recombination. Returns x (cm) and Δ arrays.
 */
export function solveSteadyState(opts: { W: number; D: number; tau: number; G: (x: number) => number; left: Boundary; right: Boundary; N?: number }) {
  const { W, D, tau, G, left, right } = opts;
  const N = opts.N ?? 400;
  const h = W / N;
  const k = Number.isFinite(tau) ? 1 / (D * tau) : 0;
  const a = new Float64Array(N + 1); // sub-diagonal
  const b = new Float64Array(N + 1); // diagonal
  const c = new Float64Array(N + 1); // super-diagonal
  const d = new Float64Array(N + 1); // rhs
  const xs = Array.from({ length: N + 1 }, (_, i) => i * h);
  for (let i = 1; i < N; i++) {
    a[i] = 1;
    b[i] = -2 - k * h * h;
    c[i] = 1;
    d[i] = (-G(xs[i]) * h * h) / D;
  }
  // Boundary rows. Flux conditions use a ghost node: second-order accurate.
  const bc = (i: 0 | typeof N, bnd: Boundary) => {
    if (bnd.kind === 'value') {
      b[i] = 1;
      a[i] = 0;
      c[i] = 0;
      d[i] = bnd.value;
      return;
    }
    const S = bnd.kind === 'surface' ? bnd.S : 0;
    // D Δ'(out) = −S Δ → ghost Δ_g = Δ_in − 2h S Δ_b / D (outward derivative)
    const beta = (2 * h * S) / D;
    b[i] = -2 - k * h * h - beta;
    d[i] = (-G(xs[i]) * h * h) / D;
    if (i === 0) {
      c[0] = 2;
      a[0] = 0;
    } else {
      a[i] = 2;
      c[i] = 0;
    }
  };
  bc(0, left);
  bc(N, right);
  // Thomas algorithm
  const cp = new Float64Array(N + 1);
  const dp = new Float64Array(N + 1);
  cp[0] = c[0] / b[0];
  dp[0] = d[0] / b[0];
  for (let i = 1; i <= N; i++) {
    const m = b[i] - a[i] * cp[i - 1];
    cp[i] = c[i] / m;
    dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
  }
  const y = new Array<number>(N + 1);
  y[N] = dp[N];
  for (let i = N - 1; i >= 0; i--) y[i] = dp[i] - cp[i] * y[i + 1];
  return { x: xs, delta: y };
}

/** Book ex. 7.7 (self-derived): Δp(x) for generation G0 in |x| < L, τ = ∞, Δp(±3L) = 0. */
export function ex77Profile(x: number, G0: number, L: number, Dp: number) {
  const ax = Math.abs(x);
  if (ax >= 3 * L) return 0;
  if (ax <= L) return (G0 / (2 * Dp)) * (5 * L * L - x * x);
  return ((G0 * L) / Dp) * (3 * L - ax);
}

/**
 * Book ex. 7.8 (self-derived): Δn(x) in a bar 0..W, uniform G, τ = ∞, Δn(0) = Δ0 (−n0 if n(0) = 0),
 * surface recombination velocity S at x = W (S = 0: reflecting).
 */
export function ex78Profile(x: number, G: number, W: number, Dn: number, S: number, delta0 = 0) {
  const C1 = (G * W * (1 + (S * W) / (2 * Dn)) - S * delta0) / (Dn + S * W);
  return (-G * x * x) / (2 * Dn) + C1 * x + delta0;
}
