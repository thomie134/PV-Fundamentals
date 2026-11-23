/**
 * Content types. Everything under content/ must match these shapes.
 * See CLAUDE.md ("Content format") for authoring rules.
 */

/** Symbol context: decides which meaning a formula symbol has (n = refractive index vs electron density). */
export type SymbolContext =
  | 'energy'
  | 'radiation'
  | 'optics'
  | 'semiconductor'
  | 'transport'
  | 'junction'
  | 'cell'
  | 'math'
  | 'general';

/** Where a piece of content comes from. Shown in the Sources section. */
export interface SourceRef {
  kind: 'lecture' | 'instruction' | 'book' | 'answers' | 'external' | 'summary';
  /** e.g. "L1 slides 65–68", "Instruction 1 Q1", "Book §4.3 (p. 29–31)", "ASTM G173-03" */
  ref: string;
  note?: string;
}

export interface ConceptMeta {
  id: string;
  title: string;
  summary: string;
  context: SymbolContext;
  sources: SourceRef[];
  keywords?: string[];
  /** Ids of diagrams shown inside this concept. */
  diagrams?: string[];
}

export interface WeekNote {
  /** 'difference' = lecture vs book notation/approach; 'erratum' = typo in source; 'flag' = uncertain/ambiguous */
  type: 'difference' | 'erratum' | 'flag' | 'external';
  text: string;
}

export interface WeekMeta {
  week: number;
  title: string;
  subtitle: string;
  lectureDate: string;
  chapters: string;
  status: 'complete' | 'draft' | 'planned';
  files: { lecture: string; instruction: string };
  prerequisites: {
    terms: string[];
    foundations: string[];
    skills: string[];
  };
  concepts: ConceptMeta[];
  notes: WeekNote[];
}

export interface DiagramMeta {
  id: string;
  title: string;
  week?: number;
  concept?: string;
  tryThis: string;
}

/* ---------------- Glossary & symbols ---------------- */

export interface GlossaryEntry {
  id: string;
  term: string;
  aliases: string[];
  /** LaTeX, rendered with KaTeX */
  symbol?: string;
  unit?: string;
  /** One or two plain-language sentences (layer 1). */
  short: string;
  /** Refresher: what it is + why it matters here (layer 2). Rich text: $math$, **bold**, [[term-id]]. */
  long: string;
  /** Tiny numeric example (layer 2). Rich text. */
  example?: string;
  related: string[];
  category: 'prerequisite' | 'course';
  topic: string;
  weeks: number[];
  /** Foundations lesson id that refreshes this term. */
  foundation?: string;
  /** Concept anchor where it is taught, e.g. "week-01#refraction-reflection". */
  taughtIn?: string;
}

export interface SymbolEntry {
  id: string;
  /** LaTeX as it appears in formulas, e.g. "n_i", "\\Phi^0_{\\mathrm{ph},\\lambda}". Normalised before matching. */
  latex: string;
  /** Contexts where this meaning applies; ["*"] = everywhere. */
  contexts: (SymbolContext | '*')[];
  name: string;
  unit: string;
  typical?: string;
  glossary?: string;
  note?: string;
}

export interface SymbolsFile {
  /** Bases that are never symbols (Euler's e, imaginary i). Write differentials as \mathrm{d}. */
  ignore: string[];
  symbols: SymbolEntry[];
}

export interface Constant {
  id: string;
  latex: string;
  name: string;
  value: number;
  unit: string;
  /** Display string as printed on the formula sheet. */
  display: string;
  onSheet: boolean;
  note?: string;
}

/* ---------------- Formulas ---------------- */

export interface FormulaEntry {
  id: string;
  title: string;
  latex: string;
  context: SymbolContext;
  /** true = on the official equation sheet */
  sheet: boolean;
  /** Book equation number, e.g. "4.11" */
  eq?: string;
  week: number;
  topic: string;
  when: string;
  /** Extra notes, e.g. lecture vs book notation. */
  note?: string;
  concept?: string;
  diagram?: string;
  source: string;
}

/* ---------------- Questions ---------------- */

export interface McqOption {
  id: string;
  text: string;
  correct?: boolean;
  /** Why this choice is right, or why it is a typical mistake. */
  feedback: string;
}

export interface NumericError {
  /** The value a typical mistake produces (verified in verify.ts as "<qid>@<index>"). */
  value: number;
  feedback: string;
}

export interface NumericAnswer {
  value: number;
  unit: string;
  /** Relative tolerance, default 0.03 (3 %). */
  tolerance?: number;
  /** Accept the answer if |given − value| <= absTolerance (for values near 0, angles). */
  absTolerance?: number;
  errors?: NumericError[];
}

interface QuestionCore {
  id: string;
  week: number;
  topic: string;
  concept: string;
  difficulty: 1 | 2 | 3;
  /** Foundations lesson ids this question leans on. */
  prerequisites: string[];
  /** e.g. "Modelled on Instruction 1, Q2" */
  source?: string;
  points?: number;
  /** Three steps: nudge → relevant formula → first step. Rich text. */
  hints: string[];
  /** Full worked solution, one rich-text step per entry. */
  solution: string[];
}

export interface McqQuestion extends QuestionCore {
  type: 'mcq';
  prompt: string;
  options: McqOption[];
}

export interface NumericQuestion extends QuestionCore {
  type: 'numeric';
  prompt: string;
  answer: NumericAnswer;
}

export type QuestionPart =
  | {
      id: string;
      label: string;
      kind: 'numeric';
      prompt: string;
      points?: number;
      answer: NumericAnswer;
      hints?: string[];
      solution: string[];
    }
  | {
      id: string;
      label: string;
      kind: 'mcq';
      prompt: string;
      points?: number;
      options: McqOption[];
      hints?: string[];
      solution: string[];
    }
  | {
      id: string;
      label: string;
      kind: 'open';
      prompt: string;
      points?: number;
      /** Model answer; the student self-assesses. */
      solution: string[];
      hints?: string[];
    };

export interface MultiQuestion extends QuestionCore {
  type: 'multi';
  /** Scenario / given data. */
  prompt: string;
  parts: QuestionPart[];
}

export type Question = McqQuestion | NumericQuestion | MultiQuestion;

/* ---------------- Worked examples & misconceptions ---------------- */

export interface ExampleStep {
  title: string;
  body: string;
  /** "Why" explanation; expanded by default in beginner mode. */
  why?: string;
}

export interface WorkedExample {
  id: string;
  title: string;
  source: string;
  concept: string;
  context: SymbolContext;
  prompt: string;
  steps: ExampleStep[];
  answer: string;
  /** Flags about the official answer (errata etc.). */
  note?: string;
}

export interface Misconception {
  id: string;
  wrong: string;
  right: string;
  tip?: string;
  concept?: string;
  foundation?: string;
}

/* ---------------- Foundations ---------------- */

export interface FoundationMeta {
  id: string;
  title: string;
  summary: string;
  order: number;
  /** Symbol context for the lesson's quick checks (default 'math'). */
  context?: SymbolContext;
  weeks: number[];
  /** Terms this lesson refreshes. */
  terms: string[];
  checks: (McqQuestion | NumericQuestion)[];
}
