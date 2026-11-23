import { NM } from '@/physics/constants';
import { frequency, wavelengthNmFromEV } from '@/physics/radiation';
const v: Record<string, () => number> = {
  'fw-frequency': () => frequency(600 * NM),
  'fw-gap-wavelength': () => wavelengthNmFromEV(1.12),
};
export default v;
