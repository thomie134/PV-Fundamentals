import { pathLength } from '@/physics/optics';
const v: Record<string, () => number> = {
  'ft-arcsin': () => (Math.asin(0.5) * 180) / Math.PI,
  'ft-path': () => pathLength(100, 20),
};
export default v;
