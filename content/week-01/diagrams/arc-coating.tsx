import { useMemo, useState } from 'react';
import g173 from '@content/data/astm-g173.json';
import { C, DiagramFrame, Dot, Legend, Line, Plot, PlotLabel, Readout, Segmented, Slider, Term, VRule, fmt, sample } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { NM } from '@/physics/constants';
import { siOptical } from '@/physics/materials';
import { coatingNoInterference, optimalArcIndex, quarterWaveThickness, reflectanceNormal, thinFilmReflectance } from '@/physics/optics';
import { interp, spectralPhotonFlux, trapz } from '@/physics/radiation';

type Mode = 'index' | 'interference';

const COATINGS = [
  { label: 'MgF₂ 1.38', n: 1.38 },
  { label: 'ITO 1.87', n: 1.87 },
  { label: 'Si₃N₄ 2.0', n: 2.0 },
  { label: 'TiO₂ 2.49', n: 2.49 },
];

/** AM1.5 photon-flux weights on a 5 nm grid, 400–1100 nm (for the photon-weighted reflectance). */
const GRID = Array.from({ length: 141 }, (_, i) => 400 + 5 * i);
const WEIGHT = GRID.map((w) => spectralPhotonFlux(interp(g173.wavelength, g173.am15g, w), w * NM));

export default function ArcCoating({ meta }: { meta: DiagramMeta }) {
  const [mode, setMode] = useState<Mode>('index');
  const [nc, setNc] = useState(1.87);
  const [ns, setNs] = useState(3.57);
  const [d, setD] = useState(75);

  /* ---- index view ---- */
  const idx = useMemo(() => {
    const pts = sample((n) => n, 1, 3.6, 200);
    return {
      R1: pts.map(([n]) => [n, 100 * coatingNoInterference(1, n, ns).R1] as [number, number]),
      R2: pts.map(([n]) => [n, 100 * coatingNoInterference(1, n, ns).R2] as [number, number]),
      Rt: pts.map(([n]) => [n, 100 * coatingNoInterference(1, n, ns).Rtot] as [number, number]),
      book: pts.map(([n]) => [n, 100 * (1 - coatingNoInterference(1, n, ns).transmitted)] as [number, number]),
    };
  }, [ns]);
  const c = coatingNoInterference(1, nc, ns);
  const nOpt = optimalArcIndex(1, ns);
  const bare = reflectanceNormal(1, ns);

  /* ---- interference view (substrate: c-Si, Green 2008 n + iκ) ---- */
  const spec = useMemo(() => {
    const R = (w: number) => {
      const s = siOptical(w);
      return thinFilmReflectance(w * NM, 1, nc, d * NM, s.n, s.kappa);
    };
    const coated = sample(R, 350, 1100, 220).map(([w, r]) => [w, 100 * r] as [number, number]);
    const bareSi = sample((w) => 100 * reflectanceNormal(1, siOptical(w).n), 350, 1100, 120);
    const weighted = trapz(GRID, GRID.map((w, i) => R(w) * WEIGHT[i])) / trapz(GRID, WEIGHT);
    const weightedBare = trapz(GRID, GRID.map((w, i) => reflectanceNormal(1, siOptical(w).n) * WEIGHT[i])) / trapz(GRID, WEIGHT);
    return { coated, bareSi, weighted, weightedBare };
  }, [nc, d]);
  const lambdaMin = 4 * nc * d;

  return (
    <DiagramFrame
      meta={meta}
      ctx="optics"
      legend={
        mode === 'index' ? (
          <Legend
            items={[
              { label: 'R₁ + R₂ (instruction method)', color: C.accent },
              { label: 'R₁ air/coating', color: C.aux },
              { label: 'R₂ coating/absorber', color: C.s2 },
              { label: '1 − (1 − R₁)(1 − R₂) (book)', color: C.ink2, dash: true },
            ]}
          />
        ) : (
          <Legend
            items={[
              { label: `Coated: n = ${nc.toFixed(2)}, d = ${d.toFixed(0)} nm`, color: C.accent },
              { label: 'Bare c-Si', color: C.ink2, dash: true },
            ]}
          />
        )
      }
      controls={
        <>
          <Segmented
            label="View"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'index', label: 'Index (no interference)' },
              { value: 'interference', label: 'Interference' },
            ]}
          />
          <Slider
            label={
              <>
                <Term id="anti-reflective-coating">Coating index</Term> n<sub>c</sub>
              </>
            }
            value={nc}
            min={1}
            max={mode === 'index' ? 3.6 : 2.6}
            step={0.01}
            onChange={setNc}
            format={(v) => v.toFixed(2)}
            marks={COATINGS.map((x) => ({ value: x.n, label: x.label }))}
          />
          {mode === 'index' ? (
            <Slider label="Absorber index nₛ" value={ns} min={1.5} max={4.5} step={0.01} onChange={setNs} format={(v) => v.toFixed(2)} marks={[{ value: 3.57, label: 'c-Si @1000 nm' }, { value: 4.3, label: 'c-Si @500 nm' }]} />
          ) : (
            <Slider label={<Term id="quarter-wave-thickness">Coating thickness d</Term>} value={d} min={0} max={200} step={1} unit="nm" onChange={setD} format={(v) => v.toFixed(0)} marks={[40, 60, 80, 100].map((v) => ({ value: v, label: `${v} nm` }))} />
          )}
        </>
      }
      readouts={
        mode === 'index' ? (
          <>
            <Readout label="R₁ (air/coating)" value={fmt(100 * c.R1, 3)} unit="%" />
            <Readout label="R₂ (coating/absorber)" value={fmt(100 * c.R2, 3)} unit="%" />
            <Readout label={<>R<sub>tot</sub> = R₁ + R₂</>} value={fmt(100 * c.Rtot, 3)} unit="%" emphasis />
            <Readout label="Bare absorber" value={fmt(100 * bare, 3)} unit="%" />
            <Readout label="Best index √(n₀nₛ)" value={fmt(nOpt, 3)} />
            <Readout label="Book: 1 − (1−R₁)(1−R₂)" value={fmt(100 * (1 - c.transmitted), 3)} unit="%" />
          </>
        ) : (
          <>
            <Readout label={<>Reflection minimum at λ = 4n<sub>c</sub>d</>} value={d > 0 ? fmt(lambdaMin, 3) : '–'} unit={d > 0 ? 'nm' : undefined} emphasis />
            <Readout label="d for a minimum at 600 nm" value={fmt(quarterWaveThickness(600, nc), 3)} unit="nm" />
            <Readout label="Photon-weighted R, coated" value={fmt(100 * spec.weighted, 3)} unit="%" note="AM1.5, 400–1100 nm" />
            <Readout label="Photon-weighted R, bare" value={fmt(100 * spec.weightedBare, 3)} unit="%" />
          </>
        )
      }
      formulas={
        mode === 'index'
          ? [
              { tex: 'R = \\left(\\frac{n_1 - n_2}{n_1 + n_2}\\right)^2', label: 'Normal incidence (eq. 4.15), at each interface' },
              { tex: 'R_{\\mathrm{tot}} = R_1 + R_2', label: 'Instruction 1 Q1(f), no interference' },
              { tex: 'n_c = \\sqrt{n_0 n_s}', label: 'Best single layer (eq. 10.32)' },
            ]
          : [{ tex: 'n_c d = \\frac{\\lambda_0}{4}', label: 'Quarter-wave condition (eq. 10.38)' }]
      }
      caption={mode === 'interference' ? 'Interference view: standard thin-film formula (beyond the formula sheet) with c-Si optical data from Green (2008); weights from the ASTM G173 AM1.5 photon flux.' : undefined}
      notice={
        mode === 'index' ? (
          <>
            <p>
              <strong>Two smaller steps beat one big one.</strong> R₁ grows with the coating index while R₂ shrinks. Their sum has a minimum at n<sub>c</sub> = √(n₀nₛ)
              ≈ 1.89 for c-Si. ITO (1.87) sits almost exactly there, which is why it wins in instruction 1 Q1(f): 19.0 % instead of 31.6 % for bare silicon.
            </p>
            <p>
              <strong>Two ways of adding.</strong> The dashed curve is the book’s 1 − (1 − R₁)(1 − R₂): the light that does not make it through both interfaces. It is
              slightly lower than R₁ + R₂ because the second reflection only acts on light that survived the first. For exam questions like Q1, use R₁ + R₂.
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>A dip that moves.</strong> The reflection minimum sits where the round trip through the coating is half a wavelength: λ = 4n<sub>c</sub>d. Thicker
              coatings move the dip to the red. Lecture 1’s Si₃N₄ wafers of 40, 60, 80 and 100 nm (slide 70: purple, green, dark blue, turquoise) put the dip
              at roughly 320, 480, 640 and 800 nm: the colour you see is the light that is *not* suppressed.
            </p>
            <p>
              <strong>Which coating is best?</strong> The one that keeps the most *photons* out of the reflection, not the one with the lowest R at a single
              wavelength. Watch the photon-weighted R: for n<sub>c</sub> = 2 it is lowest for d ≈ 70–80 nm, a dip near 600 nm where the AM1.5 photon flux is high.
            </p>
            <p>
              With n<sub>c</sub> ≈ √nₛ the dip goes all the way to zero; with a ‘wrong’ index it stays above zero, which is why the index rule (eq. 10.32) and the
              thickness rule (eq. 10.38) work together.
            </p>
          </>
        )
      }
    >
      {mode === 'index' ? (
        <Plot
          ariaLabel="Reflectance versus coating index"
          x={{ domain: [1, 3.6], label: <>Coating index n<sub>c</sub></> }}
          y={{ domain: [0, 45], label: <Term id="reflectance">Reflectance at normal incidence</Term>, unit: '%' }}
          aspect={0.75}
          hover={{
            series: [
              { label: 'R₁ + R₂', color: C.accent, points: idx.Rt, format: (v) => `${v.toFixed(1)} %` },
              { label: 'R₁', color: C.aux, points: idx.R1, format: (v) => `${v.toFixed(1)} %` },
              { label: 'R₂', color: C.s2, points: idx.R2, format: (v) => `${v.toFixed(1)} %` },
            ],
            xFormat: (v) => `n = ${v.toFixed(2)}`,
          }}
        >
          <Line points={idx.R1} color={C.aux} width={1.75} />
          <Line points={idx.R2} color={C.s2} width={1.75} />
          <Line points={idx.book} color={C.ink2} dash="5 5" width={1.5} />
          <Line points={idx.Rt} color={C.accent} width={2.5} />
          <VRule x={nOpt} color={C.ink2} />
          <PlotLabel x={nOpt} y={42} dx={6} valign="top">
            √(n₀nₛ) = {nOpt.toFixed(2)}
          </PlotLabel>
          <Dot x={nc} y={100 * c.Rtot} color={C.accent} />
        </Plot>
      ) : (
        <Plot
          ariaLabel="Reflectance spectrum of a coated silicon surface"
          x={{ domain: [350, 1100], label: <Term id="wavelength">Wavelength</Term>, unit: 'nm' }}
          y={{ domain: [0, 60], label: <Term id="reflectance">Reflectance</Term>, unit: '%' }}
          aspect={0.75}
          hover={{
            series: [
              { label: 'coated', color: C.accent, points: spec.coated, format: (v) => `${v.toFixed(1)} %` },
              { label: 'bare', color: C.ink2, points: spec.bareSi, format: (v) => `${v.toFixed(1)} %` },
            ],
            xFormat: (v) => `${v.toFixed(0)} nm`,
          }}
        >
          <Line points={spec.bareSi} color={C.ink2} dash="5 5" width={1.5} />
          <Line points={spec.coated} color={C.accent} width={2.5} />
          {d > 0 && lambdaMin >= 350 && lambdaMin <= 1100 && (
            <>
              <VRule x={lambdaMin} color={C.ink2} />
              <PlotLabel x={lambdaMin} y={57} dx={6} valign="top">
                λ = 4n<sub>c</sub>d = {lambdaMin.toFixed(0)} nm
              </PlotLabel>
            </>
          )}
        </Plot>
      )}
    </DiagramFrame>
  );
}
