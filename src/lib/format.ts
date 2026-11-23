/** Number formatting for readouts, answers and axes. */

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
export const superscript = (s: string | number) => String(s).replace(/[-0-9]/g, (c) => SUP[c] ?? c);

/**
 * Format with `sig` significant figures; switches to scientific notation (× 10ⁿ) outside 1e-3..1e5.
 */
export function fmt(x: number, sig = 3): string {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '–';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e-3 && a < 1e5) {
    const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(a)));
    return trimMinus(x.toFixed(Math.min(digits, 6)));
  }
  return sci(x, sig);
}

export function sci(x: number, sig = 3): string {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)));
  let m = x / 10 ** e;
  if (Math.abs(Number(m.toFixed(sig - 1))) >= 10) {
    m /= 10;
    return `${trimMinus(m.toFixed(sig - 1))} × 10${superscript(e + 1)}`;
  }
  return `${trimMinus(m.toFixed(sig - 1))} × 10${superscript(e)}`;
}

/** LaTeX version of sci(): "4.25 \\times 10^{21}" */
export function sciTex(x: number, sig = 3): string {
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e-3 && a < 1e5) return fmt(x, sig).replace('−', '-');
  const e = Math.floor(Math.log10(a));
  let m = x / 10 ** e;
  let ee = e;
  if (Math.abs(Number(m.toFixed(sig - 1))) >= 10) {
    m /= 10;
    ee += 1;
  }
  return `${m.toFixed(sig - 1)} \\times 10^{${ee}}`;
}

const trimMinus = (s: string) => s.replace(/^-/, '−');

export const pct = (x: number, digits = 1) => `${trimMinus((x * 100).toFixed(digits))} %`;
