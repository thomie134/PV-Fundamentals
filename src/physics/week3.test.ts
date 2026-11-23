/**
 * Week 3 physics, checked against the official answer book (ex. 6.14, 6.15, 7.2, 7.3, 7.5), the book examples
 * (p. 60, p. 72) and self-derived analytic solutions of ex. 7.7 and 7.8 (instruction 3 has no official answers).
 */
import { describe, expect, it } from 'vitest';
import { NM } from './constants';
import { alphaFromKappa, reflectanceNormal } from './optics';
import { photonFluxMono } from './radiation';
import {
  combinedLifetime,
  diffusionCurrentN,
  diffusionLength,
  driftCurrent,
  einsteinD,
  ex77Profile,
  ex78Profile,
  generationRate,
  lifetimeFromLength,
  solveSteadyState,
  steadyExcess,
} from './transport';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

describe('book §6.5 (official answers)', () => {
  it('ex. 6.14: J_n,diff = 749 A/cm² (q = 1.60e-19 in the answer)', () => {
    const grad = (2.7e16 - 1e15) / 2e-4;
    expect(rel(diffusionCurrentN(36, grad), 749)).toBeLessThan(0.005);
  });
  it('ex. 6.15: field 3468 V/cm with n = 1e15 cm⁻³ and μn = 1350', () => {
    const J = diffusionCurrentN(36, (2.7e16 - 1e15) / 2e-4);
    const field = J / driftCurrent(1e15, 0, 1350, 0, 1);
    expect(rel(field, 3468)).toBeLessThan(0.005);
  });
  it('book p. 60: D_n = 0.0258 × 1360 ≈ 35 cm²/s', () => {
    expect(einsteinD(1360)).toBeCloseTo(35.2, 1);
  });
  it('ex. 7.6h (self-derived): p = J/(qμpξ) = 5.84e16 cm⁻³', () => {
    expect(rel(110 / driftCurrent(0, 1, 0, 470, 25), 5.84e16)).toBeLessThan(0.005);
  });
});

describe('book Ch. 7 (official answers)', () => {
  it('ex. 7.2: L = 160 µm', () => {
    expect(diffusionLength(25.6, 10e-6) * 1e4).toBeCloseTo(160, 3);
  });
  it('ex. 7.3: τ = 14.8 µs', () => {
    expect(lifetimeFromLength(200e-4, 27) * 1e6).toBeCloseTo(14.8, 1);
  });
  it('book p. 72: L_n = 57 µm for μn = 1250, τ = 1 µs', () => {
    expect(diffusionLength(0.0258 * 1250, 1e-6) * 1e4).toBeCloseTo(56.8, 0);
  });
  it('lifetimes add as rates (eq. 7.27)', () => {
    expect(combinedLifetime(1e-3, 1e-3)).toBeCloseTo(5e-4, 12);
    expect(combinedLifetime(1e-6, Infinity)).toBeCloseTo(1e-6, 12);
  });
  describe('ex. 7.5', () => {
    const alpha = alphaFromKappa(0.015, 650 * NM); // m⁻¹
    const R = reflectanceNormal(1, 3.84);
    const phi0 = photonFluxMono(1000, 650 * NM); // m⁻² s⁻¹
    const phiIn = (1 - R) * phi0;
    const phi50 = phiIn * Math.exp(-alpha * 50e-6);
    it('(a) α = 2.9e5 m⁻¹, (b) R = 0.34', () => {
      expect(rel(alpha, 2.9e5)).toBeLessThan(0.005);
      expect(R).toBeCloseTo(0.344, 3);
    });
    it('(c) Φ(0) = 2.15e21 m⁻² s⁻¹; Φ(50 µm) ≈ 1.09e15 (official 1.14e15 uses e^{-αx} = 5.3e-7 instead of 5.0e-7)', () => {
      expect(rel(phiIn, 2.15e21)).toBeLessThan(0.01);
      expect(rel(phi50, 1.14e15)).toBeLessThan(0.06);
      expect(rel(phi50, 1.085e15)).toBeLessThan(0.005);
    });
    it('(d) G = αΦ ≈ 3.1e20 m⁻³ s⁻¹ (official 3.3e20); (e) Δn = Gτ, τ = L²/D = 1.24 µs', () => {
      const G = generationRate(phi0, alpha, 50e-6, R);
      expect(rel(G, alpha * phi50)).toBeLessThan(1e-12);
      const tau = lifetimeFromLength(60e-4, 29);
      expect(tau * 1e6).toBeCloseTo(1.24, 2);
      expect(rel(steadyExcess(3.3e20, tau), 4.1e14)).toBeLessThan(0.01);
    });
  });
});

describe('steady-state solver vs self-derived analytic solutions', () => {
  it('ex. 7.7: generation in |x| < L, τ = ∞, Δp(±3L) = 0', () => {
    const L = 1e-3, G0 = 1e20, Dp = 12;
    const sol = solveSteadyState({ W: 6 * L, D: Dp, tau: Infinity, G: (x) => (Math.abs(x - 3 * L) < L ? G0 : 0), left: { kind: 'value', value: 0 }, right: { kind: 'value', value: 0 }, N: 1200 });
    for (const xi of [0, 0.5 * L, L, 2 * L]) {
      const i = Math.round(((xi + 3 * L) / (6 * L)) * 1200);
      expect(rel(sol.delta[i], ex77Profile(xi, G0, L, Dp))).toBeLessThan(0.005);
    }
    expect(ex77Profile(0, G0, L, Dp)).toBeCloseTo((2.5 * G0 * L * L) / Dp, 0);
  });
  it('ex. 7.8: uniform G, Δn(0) = 0, S at x = W (S = 0 and S > 0)', () => {
    const W = 100e-4, G = 1e19, Dn = 30;
    for (const S of [0, 1e3, 1e6]) {
      const sol = solveSteadyState({ W, D: Dn, tau: Infinity, G: () => G, left: { kind: 'value', value: 0 }, right: { kind: 'surface', S }, N: 800 });
      for (const f of [0.25, 0.5, 1]) {
        const i = Math.round(f * 800);
        expect(rel(sol.delta[i], ex78Profile(f * W, G, W, Dn, S))).toBeLessThan(0.005);
      }
    }
  });
  it('finite lifetime, light absorbed at the surface: Δ decays as e^{-x/L}', () => {
    const D = 30, tau = 1e-5, L = diffusionLength(D, tau), W = 20 * L;
    const sol = solveSteadyState({ W, D, tau, G: () => 0, left: { kind: 'value', value: 1 }, right: { kind: 'value', value: 0 }, N: 2000 });
    const i = Math.round((L / W) * 2000);
    expect(sol.delta[i]).toBeCloseTo(Math.exp(-1), 2);
  });
});
