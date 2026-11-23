/**
 * Automatic formula-symbol annotation.
 *
 * Formulas are written as plain LaTeX. This module scans the LaTeX for "atoms"
 * (a base letter / Greek letter / accented letter plus optional sub- and superscripts),
 * looks each atom up in the symbol dictionary (content/symbols.json) for the current
 * context, and wraps matches in \htmlData{sym=<id>}{...} so the rendered KaTeX carries
 * a data-sym attribute that the <Formula> component makes hoverable.
 *
 * Authoring rules (enforced by scripts/check-content.ts):
 *  - write differentials as \mathrm{d}x (plain d is "thickness");
 *  - units go in \mathrm{...} or \text{...} (these are never scanned);
 *  - multi-letter symbols use \mathit{FF};
 *  - always brace \frac arguments: \frac{a}{b}.
 */
import type { SymbolContext, SymbolEntry, SymbolsFile } from './types';

const GREEK = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta', 'vartheta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi',
  'varphi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma',
  'Upsilon', 'Phi', 'Psi', 'Omega', 'ell', 'hbar',
]);
/** Commands whose argument is part of the symbol's base: \tilde{n}, \mathbf{J}, \mathit{FF}. */
const BASE_WRAPPERS = new Set(['tilde', 'hat', 'bar', 'vec', 'dot', 'overline', 'widetilde', 'mathbf', 'boldsymbol', 'mathit', 'mathcal']);
/** Commands whose brace groups are never scanned (text, units, existing annotations). */
const SKIP_GROUPS: Record<string, number> = {
  text: 1, mathrm: 1, textrm: 1, operatorname: 1, mbox: 1, textbf: 1, textit: 1, mathsf: 1, htmlData: 2, href: 2, color: 1, textcolor: 1,
};

export interface Atom {
  start: number;
  end: number;
  base: string;
  sub?: string;
  sup?: string;
  subRange?: [number, number];
  supRange?: [number, number];
  /** The atom is the unbraced argument of ^ or _ (e^x, \int_a^b): a single token that must be wrapped in braces. */
  bare?: boolean;
}

const isLetter = (c: string | undefined) => !!c && /[A-Za-z]/.test(c);

function skipSpaces(tex: string, i: number): number {
  while (i < tex.length && tex[i] === ' ') i++;
  return i;
}

/** Read "\name" starting at i (tex[i] === '\\'). Returns [name, indexAfterName]. */
function readCommand(tex: string, i: number): [string, number] {
  let j = i + 1;
  if (isLetter(tex[j])) {
    while (isLetter(tex[j])) j++;
  } else {
    j++; // single non-letter command like \, or \{
  }
  return [tex.slice(i + 1, j), j];
}

/** Index just after the balanced group starting at i (tex[i] === '{'). */
function readGroup(tex: string, i: number): number {
  let depth = 0;
  for (let j = i; j < tex.length; j++) {
    const c = tex[j];
    if (c === '\\') {
      j++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return j + 1;
    }
  }
  return tex.length;
}

/** Index just after one argument (group, command [+ its arg if a base wrapper], or single char). */
function readArg(tex: string, i: number): number {
  i = skipSpaces(tex, i);
  if (tex[i] === '{') return readGroup(tex, i);
  if (tex[i] === '\\') {
    const [name, j] = readCommand(tex, i);
    return BASE_WRAPPERS.has(name) ? readArg(tex, j) : j;
  }
  return Math.min(i + 1, tex.length);
}

/** True if the character before `i` (skipping spaces) is an unbraced script operator. */
function afterScriptOp(tex: string, i: number): boolean {
  let k = i - 1;
  while (k >= 0 && tex[k] === ' ') k--;
  return tex[k] === '^' || tex[k] === '_';
}

function parseAtom(tex: string, start: number, baseEnd: number, out: Atom[]): number {
  if (afterScriptOp(tex, start)) {
    // e^x or \int_a^b: the argument is one token; following scripts belong to the outer expression.
    out.push({ start, end: baseEnd, base: tex.slice(start, baseEnd), bare: true });
    return baseEnd;
  }
  const atom: Atom = { start, end: baseEnd, base: tex.slice(start, baseEnd) };
  let k = baseEnd;
  for (;;) {
    const s = skipSpaces(tex, k);
    const c = tex[s];
    if (c === '_' && atom.sub === undefined) {
      const e = readArg(tex, s + 1);
      atom.sub = tex.slice(s + 1, e);
      atom.subRange = [s + 1, e];
      k = e;
    } else if (c === '^' && atom.sup === undefined) {
      const e = readArg(tex, s + 1);
      atom.sup = tex.slice(s + 1, e);
      atom.supRange = [s + 1, e];
      k = e;
    } else if (c === "'") {
      k = s + 1;
    } else break;
  }
  atom.end = k;
  out.push(atom);
  return k;
}

/** Find all top-level atoms between from and to. Script contents are part of their atom. */
export function scanAtoms(tex: string, from = 0, to = tex.length): Atom[] {
  const out: Atom[] = [];
  let i = from;
  while (i < to) {
    const c = tex[i];
    if (c === '\\') {
      const [name, j] = readCommand(tex, i);
      if (name in SKIP_GROUPS) {
        let k = j;
        for (let g = 0; g < SKIP_GROUPS[name]; g++) k = readArg(tex, k);
        i = k;
        continue;
      }
      if (name === 'left' || name === 'right' || name === 'big' || name === 'Big' || name === 'bigl' || name === 'bigr') {
        const k = skipSpaces(tex, j);
        i = tex[k] === '\\' ? readCommand(tex, k)[1] : k + 1;
        continue;
      }
      if (GREEK.has(name)) {
        i = parseAtom(tex, i, j, out);
        continue;
      }
      if (BASE_WRAPPERS.has(name)) {
        i = parseAtom(tex, i, readArg(tex, j), out);
        continue;
      }
      i = j;
      continue;
    }
    if (isLetter(c)) {
      i = parseAtom(tex, i, i + 1, out);
      continue;
    }
    i++;
  }
  return out;
}

/** Normalise a LaTeX fragment for dictionary matching: drop \mathrm/\text wrappers, braces and spaces. */
export function normalize(s: string): string {
  return s
    .replace(/\\(mathrm|text|textrm|rm|mathit|mathbf|boldsymbol|operatorname)\s*/g, '')
    .replace(/\\[,;:! ]/g, '')
    .replace(/[{}\s]/g, '');
}

export function atomKeys(a: Atom): { full: string; noSup: string; base: string } {
  const base = normalize(a.base);
  const noSup = base + (a.sub !== undefined ? '_' + normalize(a.sub) : '');
  const full = noSup + (a.sup !== undefined ? '^' + normalize(a.sup) : '');
  return { full, noSup, base };
}

/** Normalised key for a dictionary entry's latex (same rules as atoms). */
export function entryKey(latex: string): string {
  const atoms = scanAtoms(latex);
  if (atoms.length !== 1) return normalize(latex);
  return atomKeys(atoms[0]).full;
}

export interface SymbolIndex {
  byKey: Map<string, SymbolEntry[]>;
  ignore: Set<string>;
}

export function buildSymbolIndex(file: SymbolsFile): SymbolIndex {
  const byKey = new Map<string, SymbolEntry[]>();
  for (const s of file.symbols) {
    const k = entryKey(s.latex);
    const list = byKey.get(k) ?? [];
    list.push(s);
    byKey.set(k, list);
  }
  return { byKey, ignore: new Set(file.ignore.map(normalize)) };
}

function pick(list: SymbolEntry[] | undefined, ctx: SymbolContext): SymbolEntry | undefined {
  if (!list || list.length === 0) return undefined;
  return list.find((s) => s.contexts.includes(ctx)) ?? list.find((s) => s.contexts.includes('*')) ?? (list.length === 1 ? list[0] : undefined);
}

export interface Resolution {
  entry: SymbolEntry;
  /** Which part of the atom the entry describes. */
  scope: 'full' | 'noSup' | 'base';
}

export function resolveAtom(a: Atom, index: SymbolIndex, ctx: SymbolContext): Resolution | null | 'ignored' {
  const k = atomKeys(a);
  if (index.ignore.has(k.base) && a.sub === undefined) return 'ignored';
  const full = pick(index.byKey.get(k.full), ctx);
  if (full) return { entry: full, scope: 'full' };
  if (a.sup !== undefined) {
    const ns = pick(index.byKey.get(k.noSup), ctx);
    if (ns) return { entry: ns, scope: 'noSup' };
  }
  // n_1, n_2, \Phi_X, J_A ... (numbered or lettered labels) fall back to the base meaning.
  if (a.sub !== undefined && /^([0-9]+|[A-Z])$/.test(normalize(a.sub))) {
    const b = pick(index.byKey.get(k.base), ctx);
    if (b) return { entry: b, scope: 'base' };
  }
  return null;
}

export interface AnnotateResult {
  tex: string;
  found: { key: string; entry: SymbolEntry }[];
  unresolved: string[];
}

/**
 * Wrap every resolvable atom in \htmlData{sym=<id>}{...}.
 * Unresolved atoms are reported (for the build check) and their exponents are scanned in turn,
 * so symbols inside e.g. e^{qV/k_BT} are still found.
 */
export function annotate(tex: string, index: SymbolIndex, ctx: SymbolContext): AnnotateResult {
  const opens = new Map<number, string[]>();
  const closes = new Map<number, number>();
  const found: AnnotateResult['found'] = [];
  const unresolved: string[] = [];

  const visit = (atoms: Atom[]) => {
    for (const a of atoms) {
      const r = resolveAtom(a, index, ctx);
      // Subscripts are labels (R_S, V_{oc}); only exponents can hide real symbols (e^{qV/k_BT}).
      const scripts = [a.supRange].filter(Boolean) as [number, number][];
      if (r === 'ignored') {
        for (const [s, e] of scripts) visit(scanAtoms(tex, s, e));
        continue;
      }
      if (!r) {
        unresolved.push(atomKeys(a).full);
        for (const [s, e] of scripts) visit(scanAtoms(tex, s, e));
        continue;
      }
      found.push({ key: atomKeys(a).full, entry: r.entry });
      const tag = `${a.bare ? '{' : ''}\\htmlData{sym=${r.entry.id}}{`;
      opens.set(a.start, [...(opens.get(a.start) ?? []), tag]);
      closes.set(a.end, (closes.get(a.end) ?? 0) + (a.bare ? 2 : 1));
      // A matched symbol with a non-trivial exponent (e.g. T^{3/2} is fine, but x^{qV/kT} is not):
      // scan the exponent for nested symbols too.
      if (r.scope !== 'full' && a.supRange && /[A-Za-z\\]/.test(a.sup ?? '')) visit(scanAtoms(tex, a.supRange[0], a.supRange[1]));
    }
  };
  visit(scanAtoms(tex));

  let out = '';
  for (let i = 0; i <= tex.length; i++) {
    const c = closes.get(i);
    if (c) out += '}'.repeat(c);
    const o = opens.get(i);
    if (o) out += o.join('');
    if (i < tex.length) out += tex[i];
  }
  return { tex: out, found, unresolved };
}
