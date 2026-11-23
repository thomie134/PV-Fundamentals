/**
 * Independent computation of every numeric answer in week-02/questions.json (and of typical-mistake values).
 * Keys: "<qid>", "<qid>#<part>", "<key>@<i>". Checked by src/test/questions.test.ts.
 * Unless a question gives other data: formula-sheet constants and c-Si properties at 300 K.
 */
import { KB, Q } from '@/physics/constants';
import { atomDensityCm3, ecMinusEf, efMinusEv, equilibriumDensities, intrinsicDensity, intrinsicDensityAt, intrinsicFermiLevel, kTeV, quasiFermiSplitting } from '@/physics/semiconductor';

const NC = 3.22e19;
const NV = 1.83e19;
const EG = 1.12;
const kT = kTeV(300);
const ni = intrinsicDensity();
const niI = 9.68e9; // instruction 2 value, given in some prompts

/* M1: fictional semiconductor X */
const X = { Eg: 1.4, Nc: 4.0e18, Nv: 1.0e19, a: 5.65e-10, NA: 1e16 };
const niX = intrinsicDensity(X.Eg, X.Nc, X.Nv, 300);

/* M3: n-type 1e15 heated to 500 K */
const ni500 = intrinsicDensityAt(500);
const d500 = equilibriumDensities(1e15, 0, ni500);

/* M4: illuminated n-type */
const ND4 = 5e16;
const D4 = 1e14;
const ni4 = 9.5e9;

const v: Record<string, () => number> = {
  // numeric
  'w2-atoms-cm3': () => atomDensityCm3(5.43e-10),
  'w2-atoms-cm3@0': () => 8 / (5.43e-10) ** 3, // per m³
  'w2-atoms-cm3@1': () => atomDensityCm3(5.43e-10, 4),
  'w2-kt': () => kT,
  'w2-ni-300': () => ni,
  'w2-ni-300@0': () => Math.sqrt(NC * NV) * Math.exp(-EG / kT), // forgot the 2
  'w2-ni-300@1': () => NC * NV * Math.exp(-EG / kT), // gave n_i² instead of n_i
  'w2-ecef-intrinsic': () => -intrinsicFermiLevel(),
  'w2-ecef-intrinsic@0': () => EG / 2,
  'w2-ecef-intrinsic@1': () => EG + intrinsicFermiLevel(), // E_F − E_V
  'w2-minority-p': () => equilibriumDensities(1e17, 0, niI).p,
  'w2-minority-p@0': () => niI / 1e17,
  'w2-minority-p@1': () => niI,
  'w2-ecef-1e17': () => ecMinusEf(1e17),
  'w2-ecef-1e17@0': () => EG - ecMinusEf(1e17),
  'w2-ecef-1e17@1': () => kT * Math.log10(NC / 1e17),
  'w2-book-6-8': () => (1.5e10 ** 2) / 1e16,
  'w2-book-6-8@0': () => 1.5e10 / 1e16,
  'w2-fermi-shift': () => ecMinusEf(1e15) - ecMinusEf(1e17),
  'w2-fermi-shift@0': () => kT * 2, // used log10 ratio (2) without ln
  'w2-atoms-per-electron': () => 5.0e22 / 1e17,
  'w2-atoms-per-electron@0': () => 5.0e22 / niI,
  'w2-qfl-split': () => quasiFermiSplitting(1e16 + 1e15, 1e15, ni),
  'w2-qfl-split@0': () => EG - efMinusEv(1e16), // dark E_F distance used as splitting
  'w2-ef-ev-p': () => efMinusEv(1e16),
  'w2-ef-ev-p@0': () => EG - efMinusEv(1e16),

  // M1 semiconductor X
  'w2-exam-x#a': () => atomDensityCm3(X.a),
  'w2-exam-x#b': () => niX,
  'w2-exam-x#c': () => -intrinsicFermiLevel(X.Eg, X.Nc, X.Nv),
  'w2-exam-x#c@0': () => X.Eg / 2,
  'w2-exam-x#d': () => (niX * niX) / X.NA,
  'w2-exam-x#e': () => kT * Math.log(X.Nv / X.NA),

  // M2 boron-doped c-Si
  'w2-exam-boron#b': () => 1e16,
  'w2-exam-boron#c': () => (niI * niI) / 1e16,
  'w2-exam-boron#c@0': () => niI,
  'w2-exam-boron#d': () => efMinusEv(1e16),
  'w2-exam-boron#d@0': () => EG - efMinusEv(1e16),
  'w2-exam-boron#e': () => EG + intrinsicFermiLevel() - efMinusEv(1e16),

  // M3 temperature
  'w2-exam-hot#a': () => intrinsicDensityAt(300),
  'w2-exam-hot#b': () => ni500,
  'w2-exam-hot#b@0': () => intrinsicDensity(EG, NC, NV, 500), // forgot T^{3/2} scaling
  'w2-exam-hot#c': () => d500.n,
  'w2-exam-hot#d': () => d500.p,

  // M4 illuminated n-type
  'w2-exam-light#a': () => (ni4 * ni4) / ND4,
  'w2-exam-light#b': () => ecMinusEf(ND4 + D4),
  'w2-exam-light#c': () => efMinusEv(D4 + (ni4 * ni4) / ND4),
  'w2-exam-light#c@0': () => efMinusEv((ni4 * ni4) / ND4),
  'w2-exam-light#d': () => EG - ecMinusEf(ND4 + D4) - efMinusEv(D4 + (ni4 * ni4) / ND4),
};

/** kT in J, for the solution text of w2-kt. */
export const kTJ = KB * 300;
export const qC = Q;
export default v;
