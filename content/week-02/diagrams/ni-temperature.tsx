import { useMemo, useState } from 'react';
import { C, DiagramFrame, Dot, HRule, Legend, Line, Plot, PlotLabel, Readout, Slider, Term, Toggle, VRule, fmt, sample, sci } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { intrinsicDensityAt } from '@/physics/semiconductor';

const T_MIN = 100;
const T_MAX = 1100;
const GAPS = [
  { Eg: 0.66, label: '0.66 eV gap (like Ge)', color: C.aux },
  { Eg: 1.42, label: '1.42 eV gap (like GaAs)', color: C.s2 },
];

/** Temperature where n_i first reaches `target` (bisection on the monotonic curve). */
function crossing(target: number, Eg: number) {
  let lo = T_MIN;
  let hi = 3000;
  if (intrinsicDensityAt(hi, Eg) < target) return null;
  if (intrinsicDensityAt(lo, Eg) >= target) return lo;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (intrinsicDensityAt(mid, Eg) < target) lo = mid;
    else hi = mid;
  }
  return hi;
}

export default function NiTemperature({ meta }: { meta: DiagramMeta }) {
  const [T, setT] = useState(300);
  const [logN, setLogN] = useState(16);
  const [showOthers, setShowOthers] = useState(false);
  const Eg = 1.12;
  const ND = 10 ** logN;

  const si = useMemo(() => sample((t) => intrinsicDensityAt(t, Eg), T_MIN, T_MAX, 300), []);
  const others = useMemo(() => GAPS.map((g) => sample((t) => intrinsicDensityAt(t, g.Eg), T_MIN, T_MAX, 300)), []);
  const ni = intrinsicDensityAt(T, Eg);
  const Tx = crossing(ND, Eg);

  return (
    <DiagramFrame
      meta={meta}
      ctx="semiconductor"
      legend={
        <Legend
          items={[
            { label: 'c-Si (1.12 eV gap)', color: C.accent },
            ...(showOthers ? GAPS.map((g) => ({ label: g.label, color: g.color })) : []),
            { label: <>doping level N<sub>D</sub></>, color: C.ink2, dash: true },
          ]}
        />
      }
      controls={
        <>
          <Slider label={<Term id="kelvin">Temperature T</Term>} value={T} min={T_MIN} max={T_MAX} step={5} onChange={setT} format={(v) => `${v.toFixed(0)} K (${(v - 273).toFixed(0)} °C)`} marks={[{ value: 300, label: '300 K' }, { value: 1000, label: '727 °C (ex. 7.6)' }]} />
          <Slider label={<><Term id="donor">Doping</Term> N<sub>D</sub></>} value={logN} min={12} max={19} step={0.1} unit="cm⁻³" onChange={setLogN} format={(v) => sci(10 ** v, 2)} marks={[{ value: Math.log10(1.5e16), label: 'ex. 7.6' }, { value: 17, label: 'instr. 2' }]} />
          <Toggle label="Compare other bandgaps" checked={showOthers} onChange={setShowOthers} />
        </>
      }
      readouts={
        <>
          <Readout label={<><Term id="intrinsic-carrier-density">n<sub>i</sub></Term> at this T</>} value={sci(ni, 3)} unit="cm⁻³" emphasis />
          <Readout label={<>n<sub>i</sub> compared with N<sub>D</sub></>} value={ni >= ND ? <>{fmt(ni / ND, 2)} × N<sub>D</sub></> : <>N<sub>D</sub> = {sci(ND / ni, 2)} × n<sub>i</sub></>} note={ni >= 0.1 * ND ? 'intrinsic behaviour takes over' : <>doping dominates: n ≈ N<sub>D</sub></>} />
          <Readout label={<>n<sub>i</sub> reaches N<sub>D</sub> at</>} value={Tx ? fmt(Tx, 3) : '–'} unit={Tx ? 'K' : undefined} note={Tx ? `${(Tx - 273).toFixed(0)} °C` : undefined} />
        </>
      }
      formulas={[
        { tex: 'n_i = \\sqrt{N_C N_V}\\,\\exp\\left(-\\frac{E_G}{2k_BT}\\right)', label: 'Eq. 6.9' },
        { tex: 'N_C, N_V \\propto T^{3/2}', label: <>Eq. 6.7 (book ex. 7.6: N<sub>C</sub> ≈ 6.2 × 10¹⁵ T³ᐟ² cm⁻³)</> },
      ]}
      caption="Curves: eq. 6.9 with the formula-sheet effective densities of states scaled as T³ᐟ² and a constant bandgap (a simplification: the real gap shrinks a little with T). Matches lecture 2 slide 51."
      notice={
        <>
          <p>
            <strong>Twenty decades.</strong> On a log axis n<sub>i</sub> rises from about 10⁻¹⁰ cm⁻³ at 100 K to 10¹⁰ at 300 K: the bandgap in the exponent makes every bit of thermal energy
            count. Near room temperature n<sub>i</sub> roughly doubles every 10 K.
          </p>
          <p>
            <strong>Doped silicon turns intrinsic when it gets hot.</strong> As long as n<sub>i</sub> ≪ N<sub>D</sub>, the electrons come from the donors and n ≈ N<sub>D</sub>. When n<sub>i</sub> reaches
            the doping level, thermally broken bonds take over and n ≈ p ≈ n<sub>i</sub>. For book ex. 7.6 (1.5 × 10¹⁶ cm⁻³) that happens around 700–750 K, so at 727 °C (1000 K) the slab is
            effectively intrinsic. This is one reason solar cells (and electronics) lose performance when hot.
          </p>
          <p>
            <strong>Bigger gap, far fewer carriers.</strong> Switch on the comparison: 0.3 eV more bandgap means orders of magnitude fewer intrinsic carriers.
          </p>
        </>
      }
    >
      <Plot
        ariaLabel={`Intrinsic carrier density versus temperature; at ${T} K it is ${ni.toExponential(1)} per cubic centimetre`}
        x={{ domain: [T_MIN, T_MAX], label: <Term id="kelvin">Temperature</Term>, unit: 'K' }}
        y={{ domain: [1e-10, 1e20], log: true, label: <Term id="intrinsic-carrier-density">Intrinsic carrier density</Term>, unit: 'cm⁻³' }}
        aspect={0.7}
        hover={{
          series: [{ label: 'c-Si', color: C.accent, points: si, format: (v) => sci(v, 2) }, ...(showOthers ? others.map((pts, i) => ({ label: GAPS[i].label, color: GAPS[i].color, points: pts, format: (v: number) => sci(v, 2) })) : [])],
          xFormat: (v) => `${v.toFixed(0)} K`,
        }}
      >
        <HRule y={ND} color={C.ink2} dash="6 4" />
        <PlotLabel x={T_MIN} y={ND} dx={6} dy={-3} valign="bottom" className="plot__label--plain">
          N<sub>D</sub> = {sci(ND, 2)}
        </PlotLabel>
        {showOthers && others.map((pts, i) => <Line key={i} points={pts} color={GAPS[i].color} width={2} />)}
        <Line points={si} color={C.accent} width={2.5} />
        {Tx && Tx <= T_MAX && <VRule x={Tx} color={C.ink2} dash="3 4" width={1.25} />}
        <Dot x={T} y={ni} color={C.accent} />
      </Plot>
    </DiagramFrame>
  );
}
