# PV Fundamentals study site — project guide

Interactive study website for TU Delft **SET4376 PV Fundamentals** (exam 25 Jan 2027).
Vite + React 19 + TypeScript, MDX for prose, KaTeX for maths, Floating UI for popovers,
hand-built SVG diagrams (d3-scale/d3-shape for maths only), Vitest. Static site, no backend, no runtime AI.

## Golden rule: content comes from the course material

- Source of truth: `Material/` — `Week N/` (lecture + instruction PDF), plus `solar_energy_book.pdf`
  (Smets et al.), `equation-sheet PV fundamentals (1).pdf` and the scanned answer books in `Material/`.
- **Never modify anything in `Material/`.** Extracted text, OCR output and page renders live in `.work/`
  (git-ignored). PDF tools: `.work/venv/bin/python` with PyMuPDF (no poppler installed); tesseract for OCR.
  BSD grep needs `-a` on the extracted book text.
- Week → book chapter (schedule slide): W1 Ch 4–5 (+§10 coatings), W2 Ch 6, W3 Ch 7, W4 Ch 8, W5 Ch 9,
  W6 Ch 10, W7 Ch 20, W8 bonus. Book PDF page = printed page + 14. Only read the chapters for the week.
- Lecture and book differ? **Follow the lecture and flag it** (week `meta.json` → `notes`, and/or a `<Flag>`).
  Errors in official answers are flagged as `erratum`, never silently copied.
- Reputable external data is allowed when labelled (`kind: "external"`): ASTM G173 spectra, Green 2008 c-Si
  optics (`content/data/`, regenerate with `npm run data`). Book + lectures stay the main focus.
- Self-derived answers (no official solution yet, e.g. week 3) must say “self-derived, not official”.
- Past exams will be added later: use them to recalibrate question difficulty/format and the exam mode.
- If a physics detail or the material is ambiguous: flag it to the user, don’t guess.

## Folder structure

```
content/                    ← all course content (no app code changes needed to add a week)
  glossary.json             terms (3-layer popovers + glossary page)
  symbols.json              formula-symbol dictionary (keyed by LaTeX + context)
  constants.json            formula-sheet constants + c-Si properties (used by src/physics)
  data/                     reference datasets (+ raw/ sources, build with `npm run data`)
  foundations/<id>/         meta.json (+ checks), lesson.mdx, diagrams/*.tsx, verify.ts
  week-NN/                  meta.json, intuition.mdx, concepts.mdx, formulas.json, questions.json,
                            examples.json, misconceptions.json, verify.ts, diagrams/*.tsx
src/
  lib/                      types.ts (content schema!), content.ts (glob loader), latexSymbols.ts,
                            grading.ts, storage.ts (localStorage), format.ts
  physics/                  pure, typed physics functions + *.test.ts (checked against official answers)
  components/               Term, Formula, Blocks (Concept, GoDeeper, Flag, Hint, Diagram…), Question, Controls
  diagrams/kit/             DiagramFrame, Plot + marks, Glyphs, colour roles `C` — use for every diagram
  pages/                    Home (dashboard), WeekPage, PracticePage (mixed / review missed / exam sim / ?q=id),
                            FormulasPage, GlossaryPage, Foundations, StyleGuide — all routes lazy except Home
  styles/tokens.css         design tokens (colours light/dark, type, spacing, motion) — single source
scripts/check-content.ts    build check (terms, symbols, links, verifiers)
.claude/commands/add-week.md   the weekly workflow as a slash command
```

## Content format (see `src/lib/types.ts` for the exact schema)

**Week `meta.json`**: `week, title, subtitle, lectureDate, chapters, status, files, prerequisites
{terms, foundations, skills}, concepts[] {id, title, summary, context, sources[], keywords, diagrams},
diagrams[] {id, title, concept, tryThis}, notes[] {type: difference|erratum|flag|external, text}`.

**`concepts.mdx`**: a sequence of `<Concept id="…">…</Concept>` blocks (title, symbol context and sources come
from meta.json). Available without imports: `<Term id>`, `$…$`/`$$…$$` maths, `<Diagram id>`, `<GoDeeper title>`,
`<KeyIdea>`, `<Note>`, `<Flag>`, `<Hint>` (beginner mode only), `<Ctx c="optics">` (symbol context), `<F t>`.
MDX gotchas: no bare `<` or `{` in prose (put comparisons inside `$…$`, or use ≤ ≥); internal links `[x](/path)`.

**Questions (`questions.json`)**: `mcq | numeric | multi` with `hints` (exactly 3: nudge → formula → first step),
`solution` (steps), `prerequisites` (Foundations ids), `concept`, `difficulty` 1–3, `source`. MCQ options each
have `feedback` explaining *why that choice is a typical mistake*. Numeric `answer {value, unit, tolerance?
(default 0.03), absTolerance?, errors[] {value, feedback}}`; unit `%` stores percentages. Multi-part questions
mimic instruction/exam format with `points`. Rich text everywhere: `$math$`, `**bold**`, `[[term-id]]`, lists.

**Verification (mandatory)**: every numeric answer and every `errors[i].value` has an independent computation in
the folder’s `verify.ts` (`"<qid>"`, `"<qid>#<part>"`, `"<key>@<i>"`), using `src/physics`. Never type numbers
from mental arithmetic: compute them with a script first. `src/test/questions.test.ts` enforces this and checks
that no typical-mistake value falls inside the tolerance. Numbers in solution text also come from scripts.

**Worked examples (`examples.json`)**: from the instruction session, `steps[] {title, body, why?}` + `answer` +
`note` (errata, rounding differences). **Misconceptions**: `{wrong, right, tip?, concept?, foundation?}`.
**Formulas (`formulas.json`)**: `sheet: true` only if on the official equation sheet; `eq` = book number;
`when`, `note`, links to `concept`/`diagram`.

## Glossary & symbol rules

- `glossary.json` entry: `id, term, aliases, symbol?, unit?, short (1–2 sentences), long (refresher: what + why it
  matters here), example?, related[], category (prerequisite = assumed background | course), topic, weeks[],
  foundation?, taughtIn? ("week-01#concept")`. Use the course’s notation and definitions.
- Don’t put `[[links]]` inside glossary `long` texts (nested popovers); use `related`.
- `symbols.json`: `{id, latex, contexts[], name, unit, typical?, glossary?, note?}`. Same letter, different meaning →
  separate entries with different contexts (`n` = refractive index in `optics`, electron density in `semiconductor`).
  Contexts: energy, radiation, optics, semiconductor, transport, junction, cell, math, general, or `*`.
- Formula authoring: differentials as `\mathrm{d}x`; units in `\mathrm{…}`/`\text{…}`; multi-letter symbols
  `\mathit{FF}`; brace `\frac{a}{b}`. Lettered/numbered subscripts (`\Phi_X`, `n_1`) fall back to the base symbol.
- When adding a week: scan its content for new terms/symbols and add them; run `npm run check` until clean.
- Gotcha: a symbol with a **single** entry matches in every context. Adding a second entry with the same LaTeX
  (e.g. `L`, `R`) can silently break older formulas: give each entry explicit contexts and re-run the check.
- Questions may test a concept from an earlier week (the app and the checker resolve concepts across weeks).

## Design & diagram rules (live reference: `/style-guide`)

- Only tokens from `src/styles/tokens.css`; never raw hex in components. One accent (blue). Light + dark.
- Diagram colour roles via `C` from `@/diagrams/kit`: accent/hole = blue, electron = red, photon = yellow,
  aux = green; bands: `C.cb`/`C.vb` washes. Electrons/holes/photons also differ by **shape** (Glyphs) + labels.
- Every diagram: `DiagramFrame` (title → “Try this” → figure | controls, live readouts, “Formula used” →
  “What you should notice, and why”). Use `Plot` + marks (2 px lines, dashed references, ≥ 5 px dots, recessive
  horizontal grid, crosshair tooltip), `Legend` for ≥ 2 series, axis titles and region labels as `<Term>`.
  Calculations only via `src/physics` (formula-sheet constants). Sliders update live; no decorative animation.
- Diagram metadata (title, tryThis) lives in meta.json; the `.tsx` file name is the diagram id.
- Semiconductor schematics: `BandDiagram` (+ `glyphCount`, `SubLabel`) from the kit; steady-state carrier profiles:
  `solveSteadyState` in `src/physics/transport.ts`. Labels in TSX: never raw `E_F`/`n_i` strings, use `<sub>`.
- Week pages get the scroll-spy sidebar / mobile “On this page” bar from `components/PageNav.tsx` automatically.
- Interactions must work with mouse hover, touch tap and keyboard (Tab/arrows/Enter/Escape).

## Practice, exam simulation & search

- Exam composition lives in `PracticePage.tsx` (`estMinutes`, `composeExam`: ~45 % exam-style / 30 % numeric /
  25 % MCQ by estimated time). **Recalibrate these when past exams are added.** Points: `questionPoints()` in
  `Question.tsx` (question `points`, else sum of part points, else MCQ 2 / numeric 3; parts default MCQ 1 / other 2).
- Progress: `pvf.progress.v1` (latest result, `missed`, `wrongs`), exams: `pvf.exams.v1`.
- Global search (`lib/search.ts`, ⌘K / Ctrl+K / "/") indexes concepts, glossary, formulas, diagrams, examples,
  Foundations and questions automatically: new content is searchable without code changes.
- `npm run check` also renders every annotated formula with KaTeX and reports parse errors.

## Commands

`npm run dev` · `npm test` · `npm run check` (content check; `-- --strict` fails on warnings) ·
`npm run build` (check + typecheck + build) · `npm run data` (rebuild reference datasets).
QA: `.work/qa/*.mjs` drive headless Chrome via playwright-core (`channel: 'chrome'`) against the dev server.

## Adding a new week (also: `/add-week N`)

1. Read `Material/Week N/` lecture + instruction PDFs (extract to `.work/text`, render image-only slides to
   `.work/img`), the matching book chapter(s), and answer-book solutions if available. Note errata/differences.
2. Create `content/week-NN/meta.json` (concepts with sources, diagrams, prerequisites, notes).
3. Add physics functions to `src/physics/` + tests against the instruction answers (`npm test`).
4. Write `intuition.mdx` and `concepts.mdx` (Concept blocks, Terms, GoDeeper, Flags, Diagrams).
5. Build 3–5 diagrams in `content/week-NN/diagrams/` with the kit.
6. Compute all answers with scripts; write `verify.ts`, then `questions.json` (≈ 20–30: concept MCQs, numeric,
   multi-part exam-style modelled on the instruction session), `examples.json`, `misconceptions.json`, `formulas.json`.
7. Add glossary terms, symbols, constants and any needed Foundations lessons (with interactive + checks + verify.ts).
8. `npm run check` (no warnings) → `npm test` → `npm run build` → click through with the QA scripts (desktop +
   390 px touch, light + dark). Fix everything before reporting; report flags/uncertainties to the user.
