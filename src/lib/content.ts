/**
 * Content loader. Discovers everything under content/ with import.meta.glob, so adding
 * content/week-04/ (or a new foundations lesson) never requires changes to app code.
 */
import type { ComponentType } from 'react';
import glossaryData from '@content/glossary.json';
import symbolsData from '@content/symbols.json';
import type {
  DiagramMeta,
  FoundationMeta,
  FormulaEntry,
  GlossaryEntry,
  Misconception,
  Question,
  SymbolsFile,
  WeekMeta,
  WorkedExample,
} from './types';
import { buildSymbolIndex } from './latexSymbols';

type WeekMetaFile = WeekMeta & { diagrams?: DiagramMeta[] };
type FoundationMetaFile = FoundationMeta & { diagrams?: DiagramMeta[] };

const metaFiles = import.meta.glob<WeekMetaFile>('/content/week-*/meta.json', { eager: true, import: 'default' });
const questionFiles = import.meta.glob<Question[]>('/content/week-*/questions.json', { eager: true, import: 'default' });
const formulaFiles = import.meta.glob<FormulaEntry[]>('/content/week-*/formulas.json', { eager: true, import: 'default' });
const exampleFiles = import.meta.glob<WorkedExample[]>('/content/week-*/examples.json', { eager: true, import: 'default' });
const misconceptionFiles = import.meta.glob<Misconception[]>('/content/week-*/misconceptions.json', { eager: true, import: 'default' });
const intuitionFiles = import.meta.glob<{ default: ComponentType }>('/content/week-*/intuition.mdx');
const conceptFiles = import.meta.glob<{ default: ComponentType }>('/content/week-*/concepts.mdx');
const foundationMetaFiles = import.meta.glob<FoundationMetaFile>('/content/foundations/*/meta.json', { eager: true, import: 'default' });
const foundationLessonFiles = import.meta.glob<{ default: ComponentType }>('/content/foundations/*/lesson.mdx');
const diagramFiles = import.meta.glob<{ default: ComponentType<{ meta: DiagramMeta }> }>([
  '/content/week-*/diagrams/*.tsx',
  '/content/foundations/*/diagrams/*.tsx',
]);

const folderOf = (path: string) => path.split('/').slice(0, -1).join('/');
const byFolder = <T,>(files: Record<string, T>) => Object.fromEntries(Object.entries(files).map(([p, v]) => [folderOf(p), v]));

export const weekSlug = (n: number) => `week-${String(n).padStart(2, '0')}`;
export const weekPath = (n: number) => `/week/${n}`;

/* ---------------- Weeks ---------------- */

export const weeks: WeekMetaFile[] = Object.values(metaFiles).sort((a, b) => a.week - b.week);
const weekFolder = (n: number) => `/content/${weekSlug(n)}`;
export const getWeek = (n: number) => weeks.find((w) => w.week === n);

const q = byFolder(questionFiles);
const f = byFolder(formulaFiles);
const ex = byFolder(exampleFiles);
const mis = byFolder(misconceptionFiles);
export const questionsForWeek = (n: number): Question[] => q[weekFolder(n)] ?? [];
export const formulasForWeek = (n: number): FormulaEntry[] => f[weekFolder(n)] ?? [];
export const examplesForWeek = (n: number): WorkedExample[] => ex[weekFolder(n)] ?? [];
export const misconceptionsForWeek = (n: number): Misconception[] => mis[weekFolder(n)] ?? [];

export const allQuestions: Question[] = weeks.flatMap((w) => questionsForWeek(w.week));
export const allFormulas: FormulaEntry[] = weeks.flatMap((w) => formulasForWeek(w.week));
export const questionById = new Map(allQuestions.map((x) => [x.id, x]));

export function loadIntuition(n: number) {
  return intuitionFiles[`${weekFolder(n)}/intuition.mdx`];
}
export function loadConcepts(n: number) {
  return conceptFiles[`${weekFolder(n)}/concepts.mdx`];
}

/** Concept lookup across weeks: "week-01#photons" or just the concept id. */
export function findConcept(id: string) {
  for (const w of weeks) {
    const c = w.concepts.find((x) => x.id === id);
    if (c) return { week: w, concept: c };
  }
  return undefined;
}

/* ---------------- Glossary & symbols ---------------- */

export const glossary: GlossaryEntry[] = (glossaryData as { terms: GlossaryEntry[] }).terms;
export const glossaryById = new Map(glossary.map((g) => [g.id, g]));
const aliasIndex = new Map<string, GlossaryEntry>();
for (const g of glossary) {
  for (const name of [g.term, ...g.aliases]) aliasIndex.set(name.toLowerCase(), g);
}
/** Find a glossary entry by id, term or alias (case-insensitive). */
export function findTerm(key: string): GlossaryEntry | undefined {
  return glossaryById.get(key) ?? aliasIndex.get(key.toLowerCase().trim());
}

export const symbols = symbolsData as SymbolsFile;
export const symbolIndex = buildSymbolIndex(symbols);
export const symbolById = new Map(symbols.symbols.map((s) => [s.id, s]));

/* ---------------- Foundations ---------------- */

export const foundations: FoundationMetaFile[] = Object.values(foundationMetaFiles).sort((a, b) => a.order - b.order);
export const foundationById = new Map(foundations.map((x) => [x.id, x]));
export const loadFoundationLesson = (id: string) => foundationLessonFiles[`/content/foundations/${id}/lesson.mdx`];

/* ---------------- Diagrams ---------------- */

const diagramMetaIndex = new Map<string, DiagramMeta>();
for (const w of weeks) for (const d of w.diagrams ?? []) diagramMetaIndex.set(d.id, { ...d, week: w.week });
for (const fm of foundations) for (const d of fm.diagrams ?? []) diagramMetaIndex.set(d.id, d);
export const diagramMeta = (id: string) => diagramMetaIndex.get(id);
export const allDiagramIds = () => [...diagramMetaIndex.keys()];

const diagramLoaders = new Map(Object.entries(diagramFiles).map(([p, load]) => [p.split('/').pop()!.replace(/\.tsx$/, ''), load]));
export const diagramLoader = (id: string) => diagramLoaders.get(id);
