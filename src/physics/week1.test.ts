/**
 * Week 1 physics, checked against the official worked answers.
 * Official answers use rounded constants (h = 6.63e-34, c = 3e8, q = 1.60e-19), so we allow ~1 %.
 */
import { describe, expect, it } from 'vitest';
import g173 from '@content/data/astm-g173.json';
import * as rad from './radiation';
import * as opt from './optics';
import { NM, UM } from './constants';

const close = (got: number, want: number, rel = 0.01) => expect(Math.abs(got - want) / Math.abs(want)).toBeLessThan(rel);

describe('Lecture 1 examples', () => {
  it('slide 54: red photon (700 nm) = 2.84e-19 J = 1.77 eV', () => {
    close(rad.photonEnergy(700 * NM), 2.84e-19);
    close(rad.photonEnergyEV(700), 1.77);
  });
});

describe('Book exercise 5.6 (instruction 1)', () => {
  it('(a) I_e = 1000 W/m2', () => {
    close(rad.bandIrradiance(1.0, 250, 1000) + rad.bandIrradiance(0.25, 1000, 2000), 1000);
  });
  it('(b) Φ = 4.2e21 m^-2 s^-1 (answer book)', () => {
    close(rad.bandPhotonFlux(1.0, 250, 1000) + rad.bandPhotonFlux(0.25, 1000, 2000), 4.2e21, 0.02);
  });
  it('numerical integration agrees with the analytic band formula', () => {
    const wl = Array.from({ length: 1751 }, (_, i) => 250 + i);
    const s = { wavelength: wl, irradiance: wl.map((w) => (w < 1000 ? 1 : 0.25)) };
    close(rad.photonFlux(s, 250, 1000), rad.bandPhotonFlux(1.0, 250, 1000), 0.002);
  });
});

describe('Instruction 1, Question 1 (air / c-Si, n = 3.57)', () => {
  const n = 3.57;
  it('(a) refraction angles 0, 8.1, 14.0, 16.3°', () => {
    expect(opt.snell(1, n, 0)).toBeCloseTo(0, 5);
    expect(opt.snell(1, n, 30)!).toBeCloseTo(8.1, 1);
    expect(opt.snell(1, n, 60)!).toBeCloseTo(14.0, 1);
    expect(opt.snell(1, n, 90)!).toBeCloseTo(16.3, 1);
  });
  it('(b) reflectance 31.6 %, ~31.7 %, 32.4 %, 100 %', () => {
    close(opt.fresnel(1, n, 0).R, 0.316);
    const f30 = opt.fresnel(1, n, 30);
    close(f30.Rp, 0.265, 0.01);
    close(f30.Rs, 0.368, 0.01);
    close(f30.R, 0.3165, 0.005);
    const f60 = opt.fresnel(1, n, 60);
    close(f60.Rp, 0.088, 0.02);
    close(f60.Rs, 0.559, 0.01);
    close(f60.R, 0.324, 0.005);
    close(opt.fresnel(1, n, 90).R, 1, 1e-9);
  });
  it('(c) path to the reflector 100, 101, 103, 104 µm', () => {
    for (const [ti, want] of [[0, 100], [30, 101], [60, 103], [90, 104]] as const) {
      expect(opt.pathLength(100 * UM, opt.snell(1, n, ti)!) / UM).toBeCloseTo(want, 0);
    }
  });
  it('(d) critical angle 16.3°', () => {
    expect(opt.criticalAngle(1, n)!).toBeCloseTo(16.3, 1);
  });
  it('(e) coating reflectances', () => {
    const m = opt.coatingNoInterference(1, 1.38, n);
    close(m.R1, 0.026, 0.03);
    close(m.R2, 0.196, 0.01);
    const ito = opt.coatingNoInterference(1, 1.87, n);
    close(ito.Rtot, 0.19, 0.01);
    const tio = opt.coatingNoInterference(1, 2.49, n);
    close(tio.R1, 0.182, 0.01);
    close(tio.R2, 0.032, 0.03);
  });
  it('(g, official "g") quarter-wave thickness at 1000 nm: 181, 134, 100 nm', () => {
    expect(opt.quarterWaveThickness(1000, 1.38)).toBeCloseTo(181, 0);
    expect(opt.quarterWaveThickness(1000, 1.87)).toBeCloseTo(134, 0);
    expect(opt.quarterWaveThickness(1000, 2.49)).toBeCloseTo(100, 0);
  });
  it('(g, official "h") TIR threshold through a coating is still 16.3°', () => {
    for (const nc of [1.38, 1.87, 2.49]) {
      const tc = opt.criticalAngle(1, nc)!; // in the coating
      // angle in Si that refracts into the coating at tc: n sinθ = nc sin tc
      const tSi = (Math.asin((nc * Math.sin((tc * Math.PI) / 180)) / n) * 180) / Math.PI;
      expect(tSi).toBeCloseTo(16.3, 1);
    }
  });
});

describe('Instruction 1, Question 2 (LEDs and tandem)', () => {
  const phiX = rad.photonFluxMono(380, 500 * NM);
  const phiY = rad.photonFluxMono(400, 1000 * NM);
  const phiZ = rad.photonFluxMono(220, 1300 * NM);
  it('(a) photon flux densities', () => {
    close(phiX, 0.955e21);
    close(phiY, 2.0e21);
    close(phiZ, 1.44e21);
  });
  const R1 = opt.reflectanceNormal(1, 2.5);
  const R2 = opt.reflectanceNormal(1, 4.0);
  const R3 = opt.reflectanceNormal(2.5, 1.5);
  const R4 = opt.reflectanceNormal(1.5, 4.0);
  it('(b) reflectances 18.37 %, 36.00 %, 6.25 %, 20.66 %', () => {
    close(R1, 0.1837, 0.001);
    close(R2, 0.36, 0.001);
    close(R3, 0.0625, 0.001);
    close(R4, 0.2066, 0.001);
  });
  it('(c) photocurrents 124.6, 302.6, 124.6, 194.4 A/m2', () => {
    const q = 1.602177e-19;
    close(q * (1 - R1) * phiX, 124.6);
    close(q * (1 - R2) * (phiX + phiY), 302.6, 0.012);
    close(q * (1 - R1) * (1 - R3) * (1 - R4) * phiY, 194.4, 0.012);
  });
});

describe('Book chapter 5', () => {
  // Eq. 5.24 with the book's own numbers gives 68.1 µsr; the book prints 68.5 µsr (rounding in the book).
  it('Ω_sun ≈ 68.5 µsr (eq. 5.25, within 1 %)', () => close(rad.OMEGA_SUN, 68.5e-6, 0.01));
  it('6000 K blackbody peaks near 483 nm (eq. 5.21)', () => close(rad.wienPeak(6000) / NM, 483, 0.002));
  it('doubling T gives 16× the emitted power', () => close(rad.stefanBoltzmann(600) / rad.stefanBoltzmann(300), 16, 1e-9));
  it('AM2 at 60° from zenith (§5.5)', () => close(rad.airMass(60), 2, 1e-9));
  it('Planck integrates to σT⁴ (×π for a Lambertian emitter)', () => {
    const wl = Array.from({ length: 20000 }, (_, i) => 50 + i * 2);
    const L = rad.trapz(wl.map((w) => w * NM), wl.map((w) => rad.planckRadiance(w * NM, 5800)));
    close(Math.PI * L, rad.stefanBoltzmann(5800), 0.002);
  });
});

describe('ASTM G173 data', () => {
  const am15 = { wavelength: g173.wavelength, irradiance: g173.am15g };
  it('AM1.5G integrates to ≈ 1000 W/m2', () => close(rad.irradiance(am15), 1000, 0.002));
  it('max photocurrent for c-Si (1.12 eV) ≈ 43–44 mA/cm2', () => {
    const J = rad.maxPhotocurrent(am15, 1.12) / 10; // A/m2 → mA/cm2
    expect(J).toBeGreaterThan(42.5);
    expect(J).toBeLessThan(45);
  });
});

describe('Absorption (book §4.4, exercise 7.5a)', () => {
  it('α = 4πκ/λ = 2.9e5 m^-1 for κ = 0.015 at 650 nm', () => close(opt.alphaFromKappa(0.015, 650 * NM), 2.9e5, 0.01));
  it('absorptance and thickness are inverse operations', () => {
    const a = 6400; // m^-1
    close(opt.absorptance(a, opt.thicknessForAbsorptance(a, 0.9)), 0.9, 1e-9);
  });
  it('book §10.4: air/Si at 500 nm (ns = 4.3) reflects 38.8 %; best interlayer → 22.9 %', () => {
    close(opt.reflectanceNormal(1, 4.3), 0.388, 0.003);
    const n1 = opt.optimalArcIndex(1, 4.3);
    // The book's 22.9 % is the single-pass loss 1 − (1 − R1)(1 − R2);
    // instruction 1 Q1(f) instead uses Rtot = R1 + R2 (24.4 % here). Both are 'no interference' estimates.
    close(1 - opt.coatingNoInterference(1, n1, 4.3).transmitted, 0.229, 0.005);
    close(opt.coatingNoInterference(1, n1, 4.3).Rtot, 0.244, 0.005);
  });
});

describe('Thin-film interference', () => {
  it('reduces to the bare interface for zero thickness', () => {
    close(opt.thinFilmReflectance(600 * NM, 1, 2, 0, 3.9), opt.reflectanceNormal(1, 3.9), 1e-9);
  });
  it('a quarter-wave coating with nc = √ns gives zero reflectance at the design wavelength', () => {
    const ns = 4;
    const nc = 2;
    expect(opt.thinFilmReflectance(600 * NM, 1, nc, opt.quarterWaveThickness(600 * NM, nc), ns)).toBeLessThan(1e-12);
  });
});
