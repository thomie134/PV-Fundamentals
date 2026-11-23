import { bandIrradiance } from '@/physics/radiation';
const v: Record<string, () => number> = {
  'fi-rectangle': () => bandIrradiance(0.5, 400, 1000),
  'fi-x-dx': () => (3 ** 2 - 1 ** 2) / 2,
};
export default v;
