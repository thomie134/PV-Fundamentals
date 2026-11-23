/**
 * Numeric answer parsing and grading, with detection of typical mistakes
 * (power-of-ten slips from unit conversions, eV↔J mix-ups, percent vs fraction, sign).
 */
import type { NumericAnswer } from './types';

const Q = 1.602177e-19;

/** Parse "4.2e21", "4.2E21", "4,2·10^21", "4.2 × 10^21", "4.2x10^21", "−3.1", "31.6%". */
export function parseNumber(input: string): { value: number; percent: boolean } | null {
  let s = input.trim().replace(/\s+/g, '').replace(/−/g, '-').replace(/,/g, '.');
  if (!s) return null;
  let percent = false;
  if (s.endsWith('%')) {
    percent = true;
    s = s.slice(0, -1);
  }
  s = s.replace(/\*\*/g, '^');
  const m = s.match(/^([-+]?\d*\.?\d+)(?:(?:[x×*·])10\^?\(?([-+]?\d+)\)?|[eE]([-+]?\d+))?$/);
  if (!m) return null;
  const mant = Number(m[1]);
  const exp = m[2] ?? m[3];
  const value = exp !== undefined ? mant * 10 ** Number(exp) : mant;
  if (!Number.isFinite(value)) return null;
  return { value: percent ? value / 100 : value, percent };
}

export type GradeKind = 'correct' | 'specific' | 'power10' | 'eVJ' | 'percent' | 'sign' | 'close' | 'wrong';

export interface Grade {
  correct: boolean;
  kind: GradeKind;
  message?: string;
}

const relErr = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);

const POWER_HINTS: Record<number, string> = {
  2: 'A factor 10² often comes from cm ↔ m, or a percentage written as a fraction.',
  3: 'A factor 10³ often comes from mm ↔ m, g ↔ kg, or mA ↔ A.',
  4: 'A factor 10⁴ often comes from cm² ↔ m² (e.g. A/cm² vs A/m²).',
  6: 'A factor 10⁶ often comes from µm ↔ m or cm³ ↔ m³ (e.g. cm⁻³ vs m⁻³).',
  9: 'A factor 10⁹ is the classic nm ↔ m slip (e.g. using λ in nm with hc in J m).',
  12: 'A factor 10¹² can come from nm² ↔ m²... check squared length units.',
  18: 'A factor 10¹⁸ is nm² ↔ m²: when λ is squared, the conversion factor is squared too.',
};

export function gradeNumeric(input: string, answer: NumericAnswer): Grade {
  const parsed = parseNumber(input);
  if (!parsed) return { correct: false, kind: 'wrong', message: 'Could not read that number. Try e.g. 4.2e21 or 4.2×10^21.' };
  // Convention: answers with unit "%" store the percentage (31.6); typing "31.6%" or "31.6" both work.
  const isPercentUnit = answer.unit.trim() === '%';
  const v = isPercentUnit && parsed.percent ? parsed.value * 100 : parsed.value;
  const target = answer.value;
  const tol = answer.tolerance ?? 0.03;
  const ok = (x: number) => relErr(x, target) <= tol || (answer.absTolerance !== undefined && Math.abs(x - target) <= answer.absTolerance);

  if (ok(v)) return { correct: true, kind: 'correct' };

  for (const e of answer.errors ?? []) {
    if (relErr(v, e.value) <= Math.max(tol, 0.02)) return { correct: false, kind: 'specific', message: e.feedback };
  }
  if (ok(-v)) return { correct: false, kind: 'sign', message: 'Right size, wrong sign. Check the direction/sign convention.' };
  if (!parsed.percent && (ok(v / 100) || ok(v * 100)))
    return { correct: false, kind: 'percent', message: 'Off by exactly 100: did you mix a percentage and a fraction (31.6 % = 0.316)?' };
  if (ok(v * Q) || ok(v / Q))
    return { correct: false, kind: 'eVJ', message: 'Off by a factor 1.602 × 10⁻¹⁹: an eV ↔ J mix-up (1 eV = 1.602 × 10⁻¹⁹ J).' };
  const ratio = v / target;
  if (ratio > 0) {
    const p = Math.round(Math.log10(ratio));
    if (p !== 0 && relErr(ratio, 10 ** p) <= tol * 1.5) {
      const dir = p > 0 ? 'too large' : 'too small';
      const hint = POWER_HINTS[Math.abs(p)] ?? 'Check every unit conversion and prefix.';
      return { correct: false, kind: 'power10', message: `Your digits are right but the answer is 10${toSup(Math.abs(p))} ${dir}. ${hint}` };
    }
  }
  if (relErr(v, target) <= Math.max(0.1, tol * 3))
    return { correct: false, kind: 'close', message: 'Close, but outside the tolerance. Did you round an intermediate result too early, or use a slightly different constant?' };
  return { correct: false, kind: 'wrong' };
}

const toSup = (n: number) => String(n).replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]);
