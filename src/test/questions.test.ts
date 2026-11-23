/**
 * Every numeric answer (and every "typical mistake" value) in the question banks must be
 * reproduced by an independent computation in the matching verify.ts. This is what makes
 * the answers trustworthy: nothing is typed in from mental arithmetic.
 */
import { describe, expect, it } from 'vitest';
import type { FoundationMeta, NumericAnswer, Question } from '@/lib/types';

const banks = import.meta.glob<Question[]>('/content/week-*/questions.json', { eager: true, import: 'default' });
const foundationMetas = import.meta.glob<FoundationMeta>('/content/foundations/*/meta.json', { eager: true, import: 'default' });
const verifiers = import.meta.glob<Record<string, () => number>>(['/content/week-*/verify.ts', '/content/foundations/*/verify.ts'], { eager: true, import: 'default' });

const folder = (p: string) => p.split('/').slice(0, -1).join('/');
const verifyFor = (p: string) => verifiers[`${folder(p)}/verify.ts`] ?? {};

interface Item {
  key: string;
  answer: NumericAnswer;
  v: Record<string, () => number>;
  where: string;
}

const items: Item[] = [];
for (const [path, qs] of Object.entries(banks)) {
  const v = verifyFor(path);
  for (const q of qs) {
    if (q.type === 'numeric') items.push({ key: q.id, answer: q.answer, v, where: path });
    if (q.type === 'multi') for (const p of q.parts) if (p.kind === 'numeric') items.push({ key: `${q.id}#${p.id}`, answer: p.answer, v, where: path });
  }
}
for (const [path, meta] of Object.entries(foundationMetas)) {
  const v = verifyFor(path);
  for (const q of meta.checks) if (q.type === 'numeric') items.push({ key: q.id, answer: q.answer, v, where: path });
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);

describe('numeric answers are verified by computation', () => {
  it('found question banks', () => expect(items.length).toBeGreaterThan(0));
  for (const it_ of items) {
    it(`${it_.key}`, () => {
      const f = it_.v[it_.key];
      expect(f, `missing verifier "${it_.key}" in ${folder(it_.where)}/verify.ts`).toBeTypeOf('function');
      const computed = f();
      expect(rel(it_.answer.value, computed), `${it_.key}: stored ${it_.answer.value}, computed ${computed}`).toBeLessThan(0.005);
      (it_.answer.errors ?? []).forEach((e, i) => {
        const g = it_.v[`${it_.key}@${i}`];
        expect(g, `missing verifier "${it_.key}@${i}"`).toBeTypeOf('function');
        expect(rel(e.value, g()), `${it_.key}@${i}: stored ${e.value}, computed ${g()}`).toBeLessThan(0.005);
        // A typical-mistake value must not be accepted as correct.
        expect(rel(e.value, computed), `${it_.key}@${i} lies inside the tolerance of the right answer`).toBeGreaterThan(it_.answer.tolerance ?? 0.03);
      });
    });
  }
});

describe('question bank integrity', () => {
  for (const [path, qs] of Object.entries(banks)) {
    it(`${path}: unique ids, 3 hints, exactly one correct MCQ option`, () => {
      const ids = qs.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const q of qs) {
        expect(q.hints.length, `${q.id} hints`).toBeGreaterThanOrEqual(3);
        expect(q.solution.length, `${q.id} solution`).toBeGreaterThan(0);
        if (q.type === 'mcq') expect(q.options.filter((o) => o.correct).length, q.id).toBe(1);
        if (q.type === 'multi')
          for (const p of q.parts) if (p.kind === 'mcq') expect(p.options.filter((o) => o.correct).length, `${q.id}#${p.id}`).toBe(1);
      }
    });
  }
});
