import { describe, expect, it } from 'vitest';
import { gradeNumeric, parseNumber } from './grading';

describe('parseNumber', () => {
  it.each([
    ['4.2e21', 4.2e21],
    ['4.2E21', 4.2e21],
    ['4,2×10^21', 4.2e21],
    ['4.2 x 10^21', 4.2e21],
    ['4.2*10^-3', 4.2e-3],
    ['4.2·10^(−3)', 4.2e-3],
    ['−3.5', -3.5],
    ['31.6%', 0.316],
  ])('%s → %d', (s, v) => expect(Math.abs(parseNumber(s)!.value / v - 1)).toBeLessThan(1e-12));
  it('rejects text', () => expect(parseNumber('abc')).toBeNull());
});

describe('gradeNumeric', () => {
  const flux = { value: 4.25e21, unit: 'm⁻² s⁻¹' };
  it('accepts within 3 %', () => expect(gradeNumeric('4.2e21', flux).correct).toBe(true));
  it('detects nm ↔ m (10⁹)', () => {
    const g = gradeNumeric('4.25e12', flux);
    expect(g.kind).toBe('power10');
    expect(g.message).toContain('nm');
  });
  it('detects nm² ↔ m² (10¹⁸)', () => expect(gradeNumeric('4.25e39', flux).message).toContain('nm²'));
  it('detects eV ↔ J', () => {
    const E = { value: 1.77, unit: 'eV' };
    expect(gradeNumeric('2.84e-19', E).kind).toBe('eVJ');
  });
  it('detects percent vs fraction', () => {
    expect(gradeNumeric('31.6', { value: 0.316, unit: '–' }).kind).toBe('percent');
  });
  it('percent-unit answers accept "31.6" and "31.6%"', () => {
    const R = { value: 31.6, unit: '%' };
    expect(gradeNumeric('31.6', R).correct).toBe(true);
    expect(gradeNumeric('31.6%', R).correct).toBe(true);
    expect(gradeNumeric('0.316', R).kind).toBe('percent');
  });
  it('uses question-specific error feedback first', () => {
    const a = { value: 125, unit: 'A/m²', errors: [{ value: 153, feedback: 'forgot reflection' }] };
    expect(gradeNumeric('153', a).message).toBe('forgot reflection');
  });
  it('absolute tolerance for angles', () => {
    expect(gradeNumeric('16.2', { value: 16.26, unit: '°', tolerance: 0.001, absTolerance: 0.15 }).correct).toBe(true);
  });
});
