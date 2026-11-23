const v: Record<string, () => number> = {
  'fd-gradient': () => (5e16 - 1e16) / 4e-4,
  'fd-gradient@0': () => (5e16 - 1e16) / 4,
  // y = -x² + C1 x with y(2) = 0 → C1 = 2
  'fd-parabola': () => -1 + 2 * 1,
  'fd-parabola@0': () => -(-1 + 2 * 1),
};
export default v;
