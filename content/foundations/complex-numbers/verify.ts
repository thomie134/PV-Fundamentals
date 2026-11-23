import { alphaFromKappa } from '@/physics/optics';
const v: Record<string, () => number> = {
  'fc-alpha': () => alphaFromKappa(0.015, 650e-9) / 100,
};
export default v;
