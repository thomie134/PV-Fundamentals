/**
 * Content build check (runs before every build: `npm run check`).
 *
 * Warns about:
 *  - <Term> references and [[term]] links with no glossary entry
 *  - formula symbols with no entry in content/symbols.json for their context
 *  - glossary integrity (duplicate ids, broken related/foundation links, alias clashes)
 *  - unknown diagram ids, unknown concepts/foundations in questions, numeric answers without a verifier
 *
 * Exit code 0 with warnings; `--strict` turns warnings into a failing exit code.
 */
import fs from 'node:fs';
import path from 'node:path';
import katex from 'katex';
import { annotate, buildSymbolIndex } from '../src/lib/latexSymbols';
import type { FoundationMeta, GlossaryEntry, Question, SymbolContext, SymbolsFile, WeekMeta, WorkedExample, FormulaEntry, Misconception } from '../src/lib/types';

const root = path.resolve(import.meta.dirname, '..');
const content = path.join(root, 'content');
const read = (p: string) => fs.readFileSync(p, 'utf8');
const json = <T,>(p: string): T => JSON.parse(read(p));
const rel = (p: string) => path.relative(root, p);

const warnings: string[] = [];
const warn = (msg: string) => warnings.push(msg);

/* ---------- Load ---------- */
const glossary = json<{ terms: GlossaryEntry[] }>(path.join(content, 'glossary.json')).terms;
const symbols = json<SymbolsFile>(path.join(content, 'symbols.json'));
const index = buildSymbolIndex(symbols);
const glossaryIds = new Set(glossary.map((g) => g.id));
const aliasMap = new Map<string, string>();
for (const g of glossary) {
  for (const a of [g.term, ...g.aliases]) {
    const k = a.toLowerCase().trim();
    if (aliasMap.has(k) && aliasMap.get(k) !== g.id) warn(`glossary: alias "${a}" used by both "${aliasMap.get(k)}" and "${g.id}"`);
    aliasMap.set(k, g.id);
  }
}
const resolveTerm = (s: string) => (glossaryIds.has(s) ? s : aliasMap.get(s.toLowerCase().trim()));

const weekDirs = fs.readdirSync(content).filter((d) => /^week-\d+$/.test(d)).sort();
const foundationDirs = fs.existsSync(path.join(content, 'foundations')) ? fs.readdirSync(path.join(content, 'foundations')).filter((d) => fs.existsSync(path.join(content, 'foundations', d, 'meta.json'))) : [];
const foundationIds = new Set(foundationDirs);

/* ---------- Glossary integrity ---------- */
const seen = new Set<string>();
for (const g of glossary) {
  if (seen.has(g.id)) warn(`glossary: duplicate id "${g.id}"`);
  seen.add(g.id);
  for (const r of g.related) if (!glossaryIds.has(r)) warn(`glossary: "${g.id}" relates to unknown term "${r}"`);
  if (g.foundation && !foundationIds.has(g.foundation)) warn(`glossary: "${g.id}" links to unknown Foundations lesson "${g.foundation}"`);
  if (g.symbol) checkTex(g.symbol, 'general', `glossary:${g.id} symbol`, true);
}
const symbolIds = new Set<string>();
for (const s of symbols.symbols) {
  if (symbolIds.has(s.id)) warn(`symbols: duplicate id "${s.id}"`);
  symbolIds.add(s.id);
  if (s.glossary && !glossaryIds.has(s.glossary)) warn(`symbols: "${s.id}" links to unknown glossary term "${s.glossary}"`);
}

/* ---------- Helpers ---------- */
function checkTex(tex: string, ctx: SymbolContext, where: string, quiet = false) {
  const r = annotate(tex, index, ctx);
  // The annotated LaTeX must still render (catches wrapping bugs and typos).
  try {
    katex.renderToString(r.tex, { throwOnError: true, strict: false, trust: (c) => c.command === '\\htmlData', displayMode: true });
  } catch (e) {
    warn(`KaTeX: ${(e as Error).message.split('\n')[0].slice(0, 120)} — ${where} — in: ${tex.trim().slice(0, 60)}`);
  }
  if (!quiet) for (const u of new Set(r.unresolved)) warn(`symbol: "${u}" (context ${ctx}) has no entry — ${where} — in: ${tex.trim().slice(0, 70).replace(/\s+/g, " ")}`);
}

function checkRich(text: string, ctx: SymbolContext, where: string) {
  for (const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+)\$/g)) checkTex(m[1] ?? m[2], ctx, where);
  for (const m of text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) if (!resolveTerm(m[1].trim())) warn(`term: [[${m[1]}]] has no glossary entry — ${where}`);
}

const diagramFiles = new Set<string>();
for (const dir of [...weekDirs.map((d) => path.join(content, d, 'diagrams')), ...foundationDirs.map((d) => path.join(content, 'foundations', d, 'diagrams'))]) {
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.tsx')) diagramFiles.add(f.replace(/\.tsx$/, ''));
}

function checkMdx(file: string, contextFor: (offset: number) => SymbolContext) {
  const src = read(file);
  const where = rel(file);
  // <Term id="x">, <T id="x">
  for (const m of src.matchAll(/<(?:Term|T)\s+id="([^"]+)"/g)) if (!glossaryIds.has(m[1])) warn(`term: <Term id="${m[1]}"> has no glossary entry — ${where}`);
  // <Term>text</Term> without id
  for (const m of src.matchAll(/<(?:Term|T)>([^<]+)<\/(?:Term|T)>/g)) if (!resolveTerm(m[1])) warn(`term: <Term>${m[1]}</Term> matches no glossary term or alias — ${where}`);
  for (const m of src.matchAll(/<Diagram\s+id="([^"]+)"/g)) if (!diagramFiles.has(m[1])) warn(`diagram: <Diagram id="${m[1]}"> has no file — ${where}`);
  // Math: $$...$$ blocks, then inline $...$ (outside code), and <F t="..."/>
  const stripped = src.replace(/```[\s\S]*?```/g, '');
  for (const m of stripped.matchAll(/\$\$([\s\S]+?)\$\$/g)) checkTex(m[1], contextFor(m.index ?? 0), where);
  const noDisplay = stripped.replace(/\$\$[\s\S]+?\$\$/g, (s) => ' '.repeat(s.length));
  for (const m of noDisplay.matchAll(/\$([^$\n]+)\$/g)) checkTex(m[1], contextFor(m.index ?? 0), where);
  for (const m of src.matchAll(/<F\s+t="([^"]+)"/g)) checkTex(m[1], contextFor(m.index ?? 0), where);
}

/* ---------- Weeks ---------- */
// Questions may test a concept from an earlier week (the app resolves concepts across weeks too).
const allConceptCtx = new Map<string, SymbolContext>();
for (const d of weekDirs) {
  const mp = path.join(content, d, 'meta.json');
  if (fs.existsSync(mp)) for (const c of json<WeekMeta>(mp).concepts) allConceptCtx.set(c.id, c.context);
}
for (const d of weekDirs) {
  const dir = path.join(content, d);
  const metaPath = path.join(dir, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    warn(`${d}: missing meta.json`);
    continue;
  }
  const meta = json<WeekMeta & { diagrams?: { id: string; concept?: string }[] }>(metaPath);
  const conceptCtx = new Map(meta.concepts.map((c) => [c.id, c.context]));
  for (const t of meta.prerequisites.terms) if (!glossaryIds.has(t)) warn(`${d}/meta: prerequisite term "${t}" not in glossary`);
  for (const f of meta.prerequisites.foundations) if (!foundationIds.has(f)) warn(`${d}/meta: prerequisite Foundations lesson "${f}" does not exist`);
  for (const s of meta.prerequisites.skills) checkRich(s, 'math', `${d}/meta skills`);
  for (const n of meta.notes) checkRich(n.text, 'general', `${d}/meta notes`);
  for (const dg of meta.diagrams ?? []) {
    if (!diagramFiles.has(dg.id)) warn(`${d}/meta: diagram "${dg.id}" has no file in diagrams/`);
    if (dg.concept && !conceptCtx.has(dg.concept)) warn(`${d}/meta: diagram "${dg.id}" refers to unknown concept "${dg.concept}"`);
  }

  for (const name of ['intuition.mdx', 'concepts.mdx']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) {
      warn(`${d}: missing ${name}`);
      continue;
    }
    const src = read(p);
    const blocks = [...src.matchAll(/<Concept\s+id="([^"]+)"/g)].map((m) => ({ at: m.index ?? 0, id: m[1] }));
    for (const b of blocks) if (!conceptCtx.has(b.id)) warn(`${d}/${name}: <Concept id="${b.id}"> is not listed in meta.json`);
    checkMdx(p, (off) => {
      const b = [...blocks].reverse().find((x) => x.at <= off);
      return (b && conceptCtx.get(b.id)) || 'general';
    });
  }

  const verifyPath = path.join(dir, 'verify.ts');
  const verifyKeys = new Set(fs.existsSync(verifyPath) ? [...read(verifyPath).matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]) : []);
  const qPath = path.join(dir, 'questions.json');
  if (fs.existsSync(qPath)) {
    for (const q of json<Question[]>(qPath)) {
      const ctx = conceptCtx.get(q.concept) ?? allConceptCtx.get(q.concept);
      if (!ctx) warn(`${d}/questions: ${q.id} tests unknown concept "${q.concept}"`);
      for (const p of q.prerequisites) if (!foundationIds.has(p)) warn(`${d}/questions: ${q.id} prerequisite "${p}" is not a Foundations lesson`);
      const c = ctx ?? 'general';
      const texts = [q.prompt, ...q.hints, ...q.solution];
      if (q.type === 'mcq') q.options.forEach((o) => texts.push(o.text, o.feedback));
      if (q.type === 'numeric') {
        if (!verifyKeys.has(q.id)) warn(`${d}/questions: numeric ${q.id} has no verifier in verify.ts`);
        q.answer.errors?.forEach((e, i) => {
          texts.push(e.feedback);
          if (!verifyKeys.has(`${q.id}@${i}`)) warn(`${d}/questions: ${q.id} error ${i} has no verifier`);
        });
      }
      if (q.type === 'multi')
        for (const p of q.parts) {
          texts.push(p.prompt, ...p.solution, ...(p.hints ?? []));
          if (p.kind === 'mcq') p.options.forEach((o) => texts.push(o.text, o.feedback));
          if (p.kind === 'numeric') {
            if (!verifyKeys.has(`${q.id}#${p.id}`)) warn(`${d}/questions: ${q.id}#${p.id} has no verifier`);
            p.answer.errors?.forEach((e, i) => {
              texts.push(e.feedback);
              if (!verifyKeys.has(`${q.id}#${p.id}@${i}`)) warn(`${d}/questions: ${q.id}#${p.id} error ${i} has no verifier`);
            });
          }
        }
      texts.forEach((t) => checkRich(t, c, `${d}/questions ${q.id}`));
    }
  } else warn(`${d}: missing questions.json`);

  const ePath = path.join(dir, 'examples.json');
  if (fs.existsSync(ePath))
    for (const ex of json<WorkedExample[]>(ePath)) {
      [ex.prompt, ex.answer, ex.note ?? '', ...ex.steps.flatMap((s) => [s.body, s.why ?? ''])].forEach((t) => checkRich(t, ex.context, `${d}/examples ${ex.id}`));
      if (!conceptCtx.has(ex.concept)) warn(`${d}/examples: ${ex.id} unknown concept "${ex.concept}"`);
    }
  const mPath = path.join(dir, 'misconceptions.json');
  if (fs.existsSync(mPath))
    for (const m of json<Misconception[]>(mPath)) {
      const c = (m.concept && conceptCtx.get(m.concept)) || 'general';
      [m.wrong, m.right, m.tip ?? ''].forEach((t) => checkRich(t, c, `${d}/misconceptions ${m.id}`));
      if (m.foundation && !foundationIds.has(m.foundation)) warn(`${d}/misconceptions: ${m.id} unknown foundation "${m.foundation}"`);
    }
  const fPath = path.join(dir, 'formulas.json');
  if (fs.existsSync(fPath))
    for (const f of json<FormulaEntry[]>(fPath)) {
      checkTex(f.latex, f.context, `${d}/formulas ${f.id}`);
      if (f.diagram && !diagramFiles.has(f.diagram)) warn(`${d}/formulas: ${f.id} links unknown diagram "${f.diagram}"`);
      if (f.concept && !conceptCtx.has(f.concept)) warn(`${d}/formulas: ${f.id} links unknown concept "${f.concept}"`);
    }

  // Diagram source: formulas passed as tex: '...' and <Term id="..."> in labels.
  const dgDir = path.join(dir, 'diagrams');
  if (fs.existsSync(dgDir))
    for (const file of fs.readdirSync(dgDir).filter((f) => f.endsWith('.tsx'))) {
      const src = read(path.join(dgDir, file));
      const ctx = (src.match(/ctx="([a-z]+)"/)?.[1] ?? 'general') as SymbolContext;
      for (const m of src.matchAll(/tex:\s*'((?:[^'\\]|\\.)*)'/g)) checkTex(m[1].replace(/\\\\/g, '\\'), ctx, `${d}/diagrams/${file}`);
      for (const m of src.matchAll(/<Term\s+id="([^"]+)"/g)) if (!glossaryIds.has(m[1])) warn(`term: <Term id="${m[1]}"> has no glossary entry — ${d}/diagrams/${file}`);
    }
}

/* ---------- Foundations ---------- */
for (const f of foundationDirs) {
  const dir = path.join(content, 'foundations', f);
  const meta = json<FoundationMeta>(path.join(dir, 'meta.json'));
  for (const t of meta.terms) if (!glossaryIds.has(t)) warn(`foundations/${f}: term "${t}" not in glossary`);
  const verifyPath = path.join(dir, 'verify.ts');
  const verifyKeys = new Set(fs.existsSync(verifyPath) ? [...read(verifyPath).matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]) : []);
  for (const q of meta.checks) {
    const texts = [q.prompt, ...q.hints, ...q.solution];
    if (q.type === 'mcq') q.options.forEach((o) => texts.push(o.text, o.feedback));
    if (q.type === 'numeric' && !verifyKeys.has(q.id)) warn(`foundations/${f}: numeric check ${q.id} has no verifier`);
    texts.forEach((t) => checkRich(t, meta.context ?? 'math', `foundations/${f} ${q.id}`));
  }
  const lesson = path.join(dir, 'lesson.mdx');
  if (fs.existsSync(lesson)) {
    const src = read(lesson);
    const ctxBlocks = [...src.matchAll(/<Ctx\s+c="([a-z]+)"/g)].map((m) => ({ at: m.index ?? 0, c: m[1] as SymbolContext }));
    const ends = [...src.matchAll(/<\/Ctx>/g)].map((m) => m.index ?? 0);
    checkMdx(lesson, (off) => {
      const open = [...ctxBlocks].reverse().find((b) => b.at <= off);
      if (!open) return 'math';
      const closed = ends.some((e) => e > open.at && e < off);
      return closed ? 'math' : open.c;
    });
  } else warn(`foundations/${f}: missing lesson.mdx`);
}

/* ---------- Report ---------- */
const strict = process.argv.includes('--strict');
if (warnings.length === 0) {
  console.log(`✓ content check: ${weekDirs.length} weeks, ${foundationDirs.length} Foundations lessons, ${glossary.length} glossary terms, ${symbols.symbols.length} symbols — no warnings`);
} else {
  console.warn(`⚠ content check: ${warnings.length} warning(s)\n`);
  for (const w of warnings) console.warn('  - ' + w);
  if (strict) process.exit(1);
}
