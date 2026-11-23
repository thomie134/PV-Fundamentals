---
description: Build a new week of the PV Fundamentals site from the course material (usage: /add-week 4)
argument-hint: <week number>
---

Add week **$ARGUMENTS** to the study site. Follow CLAUDE.md exactly (content rules, formats, design rules).
Week number: $ARGUMENTS (folder `content/week-0$ARGUMENTS` if one digit, else `content/week-$ARGUMENTS`).

## 1. Read the material (never modify `Material/`)
- `Material/Week $ARGUMENTS/`: the lecture PDF and the instruction PDF. If the folder or a file is missing or
  unreadable, stop and tell me.
- Extract text with `.work/venv/bin/python -I .work/scripts/extract.py` style PyMuPDF code into `.work/text/`;
  render slides whose equations/diagrams are images to `.work/img/` and look at them.
- Book: find the chapter on the lecture’s schedule slide (W4 Ch 8, W5 Ch 9, W6 Ch 10, W7 Ch 20); read only that
  chapter (`python3 -I .work/scripts/pages.py <first> <last>`, PDF page = printed page + 14).
- Answer books in `Material/` (OCR’d in `.work/text/*OCR*`; re-run tesseract if new scans were added). If the
  instruction set has no official answers, derive them, verify with scripts, and mark them “self-derived, not official”.
- Check the formula sheet for the week’s equations. List every lecture-vs-book difference and every erratum.

## 2. Build the content (no app code changes)
1. `meta.json`: concepts (id, title, summary, symbol context, sources with slide/section/page refs), diagrams
   (id, title, concept, one-line tryThis), prerequisites (terms, Foundations, skills), notes (differences/errata/flags).
2. Physics: add typed functions to `src/physics/` and tests reproducing the instruction answers.
3. `intuition.mdx` (plain language, why it matters for solar cells) and `concepts.mdx` (one `<Concept>` per key
   concept; `<Term>`s; `<GoDeeper>` for derivations/book references; `<Flag>` where sources differ; `<Hint>` for
   beginner scaffolding; diagrams inline).
4. 3–5 interactive diagrams in `diagrams/` using `@/diagrams/kit` only (DiagramFrame, Plot, Glyphs, `C` roles,
   readouts with the computed numbers, “Formula used”, “What you should notice, and why”, Term labels).
5. Compute every number with a script first. Then write `verify.ts`, and `questions.json` (≈ 20–30: concept MCQs
   with per-option feedback, numeric questions with typical-error values + feedback, 3–4 multi-part exam-style
   questions modelled on the instruction session, 3 stepped hints each, full solutions, tags), `examples.json`
   (instruction questions, step by step with “why”), `misconceptions.json`, `formulas.json` (sheet flag, eq number).
6. Glossary/symbols: add every new term and symbol (course notation; contexts for ambiguous letters), constants,
   and any Foundations lesson the week newly assumes (lesson.mdx + small interactive + 2–3 checks + verify.ts).
7. Update overview data if needed (Home planned-weeks list, Foundations `weeks` arrays, glossary `weeks`).

## 3. Verify, then report
- `npm run check` must report no warnings; `npm test` all green; `npm run build` succeeds.
- Start the dev server and run the QA scripts in `.work/qa/` (adapt ids): every diagram renders, Term hover/tap/
  keyboard + Escape, formula symbol hover, questions grade correctly, 390 px touch viewport, dark mode. Look at the
  screenshots and fix layout problems.
- Report to me: what was built, the source-difference/erratum flags, anything uncertain or self-derived, and
  anything in the material that was unreadable or missing.
