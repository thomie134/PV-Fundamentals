import { thicknessForAbsorptance } from '@/physics/optics';
const v: Record<string, () => number> = {
  'fe-thickness-90': () => thicknessForAbsorptance(100, 0.9) * 1e4, // α in cm⁻¹ → t in cm → µm
  'fe-two-depths': () => 100 * Math.exp(-2),
};
export default v;
