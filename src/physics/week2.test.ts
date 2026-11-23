/**
 * Week 2 physics checked against instruction 2 (official answers), lecture 2 examples and the book (§6.4).
 * Instruction 2 uses k_B = 1.38e-23 and e = 1.60e-19; the site uses the formula-sheet constants, so n_i differs
 * slightly (9.68e9 vs 9.50e9 cm⁻³). Both conventions are tested.
 */
import { describe, expect, it } from 'vitest';
import {
  atomDensityCm3,
  boltzmann,
  ecMinusEf,
  efMinusEv,
  equilibriumDensities,
  fermiDirac,
  intrinsicDensity,
  intrinsicDensityAt,
  intrinsicFermiLevel,
  kTeV,
  quasiFermiSplitting,
} from './semiconductor';

const kTinstr = (1.38e-23 * 300) / 1.6e-19;
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

describe('instruction 2, question 1 (intrinsic c-Si)', () => {
  it('(b) atom density from the unit cell: 5.00e22 cm⁻³', () => {
    expect(rel(atomDensityCm3(5.43e-10), 5.0e22)).toBeLessThan(0.002);
  });
  it('(c) n_i = 9.68e9 cm⁻³ with the instruction constants', () => {
    expect(rel(intrinsicDensity(1.12, 3.22e19, 1.83e19, 300, kTinstr), 9.68e9)).toBeLessThan(0.002);
  });
  it('(c) n_i = 9.50e9 cm⁻³ with the formula-sheet constants', () => {
    expect(rel(intrinsicDensity(), 9.5e9)).toBeLessThan(0.002);
  });
  it('lecture 2 slide 50: n_i = 9.09e9 cm⁻³ with kT = 0.0258 eV', () => {
    expect(rel(intrinsicDensity(1.12, 3.22e19, 1.83e19, 300, 0.0258), 9.09e9)).toBeLessThan(0.002);
  });
  it('(d) atoms per free electron 5.16e12', () => {
    expect(rel(5.0e22 / 9.68e9, 5.16e12)).toBeLessThan(0.002);
  });
  it('(e) E_C − E_F = 0.57 eV (intrinsic)', () => {
    expect(ecMinusEf(intrinsicDensity())).toBeCloseTo(0.567, 3);
    expect(-intrinsicFermiLevel()).toBeCloseTo(0.567, 3);
  });
});

describe('instruction 2, question 2 (n-doped c-Si, N_D = 1e17)', () => {
  it('(e) p = n_i²/n = 937 cm⁻³', () => {
    expect(rel(equilibriumDensities(1e17, 0, 9.68e9).p, 937)).toBeLessThan(0.002);
  });
  it('(f) E_C − E_F = 0.15 eV, 0.42 eV above the intrinsic level', () => {
    expect(ecMinusEf(1e17)).toBeCloseTo(0.149, 3);
    expect(ecMinusEf(intrinsicDensity()) - ecMinusEf(1e17)).toBeCloseTo(0.418, 3);
  });
});

describe('book §6.4 and lecture 2', () => {
  it('book p. 57: E_Fi = −0.57 eV, E_F(1e17) = −0.15 eV, p = 2.25e3 with n_i = 1.5e10', () => {
    expect(intrinsicFermiLevel(1.12, 3.22e19, 1.83e19, 300)).toBeCloseTo(-0.567, 3);
    expect(equilibriumDensities(1e17, 0, 1.5e10).p).toBeCloseTo(2250, 0);
  });
  it('lecture 2 slide 62: p-type 1e17 → E_F − E_V = 0.14 eV; n-type 1e20 is degenerate (E_F above E_C)', () => {
    expect(efMinusEv(1e17)).toBeCloseTo(0.135, 3);
    expect(ecMinusEf(1e20)).toBeLessThan(0);
  });
  it('lecture 2 slides 69–70: quasi-Fermi levels', () => {
    expect(ecMinusEf(1e18)).toBeCloseTo(0.09, 2);
    expect(efMinusEv(1e15)).toBeCloseTo(0.25, 2);
    expect(efMinusEv(1e16)).toBeCloseTo(0.19, 2);
    expect(ecMinusEf(1e15)).toBeCloseTo(0.27, 2);
  });
  it('slide 72: E_Fn − E_Fp = kT ln(np/n_i²) equals E_G − (E_C − E_Fn) − (E_Fp − E_V)', () => {
    const ni = intrinsicDensity();
    const n = 1e18, p = 1e15;
    expect(quasiFermiSplitting(n, p, ni)).toBeCloseTo(1.12 - ecMinusEf(n) - efMinusEv(p), 6);
  });
  it('slide 51: n_i(T) ≈ 1e-10 at 100 K and ≈ 1e14 at 500 K', () => {
    expect(Math.log10(intrinsicDensityAt(100))).toBeCloseTo(-9.6, 0);
    expect(Math.log10(intrinsicDensityAt(500))).toBeCloseTo(14, 0);
  });
  it('slide 48: Boltzmann approximation within 5 % of Fermi–Dirac for E − E_F ≥ 3kT (0.077 eV)', () => {
    expect(3 * kTeV(300)).toBeCloseTo(0.0776, 3);
    expect(rel(boltzmann(0.0776), fermiDirac(0.0776))).toBeLessThan(0.05);
    expect(fermiDirac(0)).toBe(0.5);
  });
});

describe('book ex. 7.6 (instruction 3, self-derived): N_D = 1.5e16, N_C,V ∝ T^1.5', () => {
  const nc = (T: number) => 6.2e15 * T ** 1.5;
  const nv = (T: number) => 3.5e15 * T ** 1.5;
  const kT = (T: number) => kTeV(T);
  it('300 K: n ≈ N_D, n_i ≈ 1.4e10', () => {
    const ni = intrinsicDensity(1.1, nc(300), nv(300), 300, kT(300));
    expect(rel(ni, 1.39e10)).toBeLessThan(0.01);
    expect(rel(equilibriumDensities(1.5e16, 0, ni).n, 1.5e16)).toBeLessThan(1e-6);
  });
  it('1000 K: intrinsic behaviour, n ≈ p ≈ n_i ≈ 2.5e17', () => {
    const ni = intrinsicDensity(1.1, nc(1000), nv(1000), 1000, kT(1000));
    const d = equilibriumDensities(1.5e16, 0, ni);
    expect(rel(ni, 2.49e17)).toBeLessThan(0.01);
    expect(d.n / d.p).toBeLessThan(1.1);
  });
});
