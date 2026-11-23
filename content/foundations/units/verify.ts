import { Q } from '@/physics/constants';
const v: Record<string, () => number> = {
  'fu-ev-to-j': () => 2.5 * Q,
  'fu-ma-cm2': () => (12e-3) / (1e-4),
};
export default v;
