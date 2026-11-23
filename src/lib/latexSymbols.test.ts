import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { annotate, buildSymbolIndex, scanAtoms, atomKeys } from './latexSymbols';
import type { SymbolsFile } from './types';

const file: SymbolsFile = {
  ignore: ['e', 'i'],
  symbols: [
    { id: 'n-refr', latex: 'n', contexts: ['optics'], name: 'refractive index', unit: '–' },
    { id: 'n-elec', latex: 'n', contexts: ['semiconductor'], name: 'electron concentration', unit: 'cm⁻³' },
    { id: 'ni', latex: 'n_i', contexts: ['*'], name: 'intrinsic carrier concentration', unit: 'cm⁻³' },
    { id: 'kB', latex: 'k_B', contexts: ['*'], name: 'Boltzmann constant', unit: 'J/K' },
    { id: 'T', latex: 'T', contexts: ['*'], name: 'temperature', unit: 'K' },
    { id: 'theta-i', latex: '\\theta_i', contexts: ['*'], name: 'angle of incidence', unit: '°' },
    { id: 'phi0', latex: '\\Phi^0_{\\mathrm{ph},\\lambda}', contexts: ['*'], name: 'spectral photon flux', unit: 'm⁻² s⁻¹ m⁻¹' },
    { id: 'lambda', latex: '\\lambda', contexts: ['*'], name: 'wavelength', unit: 'm' },
    { id: 'q', latex: 'q', contexts: ['*'], name: 'elementary charge', unit: 'C' },
    { id: 'V', latex: 'V', contexts: ['*'], name: 'voltage', unit: 'V' },
    { id: 'FF', latex: '\\mathit{FF}', contexts: ['*'], name: 'fill factor', unit: '–' },
    { id: 'ntilde', latex: '\\tilde{n}', contexts: ['*'], name: 'complex refractive index', unit: '–' },
  ],
};
const idx = buildSymbolIndex(file);

describe('scanAtoms', () => {
  it('splits k_BT into two atoms and keeps scripts with their base', () => {
    const atoms = scanAtoms('k_BT');
    expect(atoms.map((a) => atomKeys(a).full)).toEqual(['k_B', 'T']);
  });
  it('treats \\mathrm and \\text as non-symbols', () => {
    expect(scanAtoms('5\\,\\mathrm{W\\,m^{-2}} \\text{ per } x')).toHaveLength(1);
  });
  it('normalises subscript spelling', () => {
    const [a] = scanAtoms('\\Phi^{0}_{\\mathrm{ph}, \\lambda}');
    expect(atomKeys(a).full).toBe('\\Phi_ph,\\lambda^0');
  });
});

describe('annotate', () => {
  it('picks the meaning that fits the context', () => {
    expect(annotate('n', idx, 'optics').found[0].entry.id).toBe('n-refr');
    expect(annotate('n', idx, 'semiconductor').found[0].entry.id).toBe('n-elec');
  });
  it('matches n_i^2 as n_i (exponent is not part of the symbol)', () => {
    const r = annotate('n_i^2', idx, 'semiconductor');
    expect(r.found.map((f) => f.entry.id)).toEqual(['ni']);
    expect(r.tex).toBe('\\htmlData{sym=ni}{n_i^2}');
  });
  it('falls back from n_1 to n', () => {
    expect(annotate('n_1 \\sin\\theta_i', idx, 'optics').found.map((f) => f.entry.id)).toEqual(['n-refr', 'theta-i']);
  });
  it('finds symbols inside an exponent of an ignored base', () => {
    const r = annotate('e^{qV/k_BT}', idx, 'semiconductor');
    expect(r.found.map((f) => f.entry.id)).toEqual(['q', 'V', 'kB', 'T']);
  });
  it('reports unresolved atoms', () => {
    expect(annotate('x + n_i', idx, 'semiconductor').unresolved).toEqual(['x']);
  });
  it('handles accents and multi-letter symbols', () => {
    expect(annotate('\\tilde{n} = n + i\\kappa', idx, 'optics').found[0].entry.id).toBe('ntilde');
    expect(annotate('\\mathit{FF}', idx, 'cell').found[0].entry.id).toBe('FF');
  });
  it('produces LaTeX that KaTeX renders with data-sym attributes', () => {
    const r = annotate('\\Phi^0_{\\mathrm{ph},\\lambda} = I \\frac{\\lambda}{hc}', idx, 'radiation');
    const html = katex.renderToString(r.tex, { trust: (c) => c.command === '\\htmlData', strict: 'ignore', throwOnError: true });
    expect(html).toContain('data-sym="phi0"');
    expect(html).toContain('data-sym="lambda"');
  });
  it('places a closing brace before an adjacent opening tag', () => {
    expect(annotate('k_BT', idx, 'general').tex).toBe('\\htmlData{sym=kB}{k_B}\\htmlData{sym=T}{T}');
  });
});

describe('unbraced script arguments', () => {
  const idx = buildSymbolIndex({
    ignore: ['e'],
    symbols: [
      { id: 'x', latex: 'x', contexts: ['*'], name: 'x', unit: '' },
      { id: 'a', latex: 'a', contexts: ['*'], name: 'a', unit: '' },
      { id: 'b', latex: 'b', contexts: ['*'], name: 'b', unit: '' },
    ],
  });
  it('wraps e^x as e^{\\htmlData…{x}}', () => {
    expect(annotate('e^x', idx, 'math').tex).toBe('e^{\\htmlData{sym=x}{x}}');
  });
  it('keeps the limits of \\int_a^b separate', () => {
    expect(annotate('\\int_a^b', idx, 'math').tex).toBe('\\int_{\\htmlData{sym=a}{a}}^{\\htmlData{sym=b}{b}}');
  });
});
