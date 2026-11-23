import { useMemo, useState } from 'react';
import { Arrow, C, DiagramFrame, Dot, Legend, Line, Plot, PlotLabel, Readout, Slider, Term, VRule, fmt, sample, useMeasure } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';
import { criticalAngle, fresnel } from '@/physics/optics';

const PRESETS = [
  { label: 'Air → c-Si', n1: 1.0, n2: 3.57 },
  { label: 'c-Si → air', n1: 3.57, n2: 1.0 },
  { label: 'Air → glass', n1: 1.0, n2: 1.5 },
  { label: 'c-Si → glass', n1: 3.57, n2: 1.5 },
];

const rad = (d: number) => (d * Math.PI) / 180;

/** Ray picture: incident, reflected and refracted rays with widths proportional to power. */
function RayPicture({ n1, n2, theta }: { n1: number; n2: number; theta: number }) {
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const W = Math.max(width, 240);
  const H = 300;
  const x0 = W / 2;
  const y0 = H / 2;
  const Lr = Math.min(W * 0.42, 150);
  const f = fresnel(n1, n2, theta);
  const crit = criticalAngle(n2, n1); // light going from n1 into lower n2
  const shade = (n: number) => `color-mix(in srgb, var(--dg-accent) ${Math.round(4 + (n - 1) * 7)}%, var(--dg-surface))`;
  const inc = { x: x0 - Lr * Math.sin(rad(theta)), y: y0 - Lr * Math.cos(rad(theta)) };
  const refl = { x: x0 + Lr * Math.sin(rad(theta)), y: y0 - Lr * Math.cos(rad(theta)) };
  const tr = f.thetaT === null ? null : { x: x0 + Lr * Math.sin(rad(f.thetaT)), y: y0 + Lr * Math.cos(rad(f.thetaT)) };
  const arc = (r: number, from: number, to: number, down: boolean) => {
    const s = down ? 1 : -1;
    const a = { x: x0 + r * Math.sin(rad(from)), y: y0 + s * r * Math.cos(rad(from)) };
    const b = { x: x0 + r * Math.sin(rad(to)), y: y0 + s * r * Math.cos(rad(to)) };
    const sweep = (to > from) === down ? 0 : 1;
    return `M${a.x},${a.y} A${r},${r} 0 0 ${sweep} ${b.x},${b.y}`;
  };
  return (
    <div ref={ref} className="schematic" style={{ height: H }}>
      {width > 0 && (
        <svg width={W} height={H} role="img" aria-label={`Ray diagram: light from n = ${n1} into n = ${n2} at ${theta.toFixed(1)} degrees; ${f.tir ? 'total internal reflection' : `refracted at ${f.thetaT!.toFixed(1)} degrees`}`}>
          <rect x={0} y={0} width={W} height={y0} fill={shade(n1)} />
          <rect x={0} y={y0} width={W} height={H - y0} fill={shade(n2)} />
          <line x1={0} x2={W} y1={y0} y2={y0} stroke="var(--dg-ink-2)" strokeWidth={1} />
          {/* escape cone: rays inside it can leave the denser medium */}
          {crit !== null && (
            <path
              d={`M${x0},${y0} L${x0 - Lr * Math.sin(rad(crit))},${y0 - Lr * Math.cos(rad(crit))} A${Lr},${Lr} 0 0 1 ${x0 + Lr * Math.sin(rad(crit))},${y0 - Lr * Math.cos(rad(crit))} Z`}
              fill="var(--dg-wash-photon)"
              stroke="var(--dg-photon)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          <line x1={x0} x2={x0} y1={14} y2={H - 14} stroke="var(--dg-ink-2)" strokeDasharray="4 4" strokeWidth={1} />
          <Arrow x1={inc.x} y1={inc.y} x2={x0 - 2 * Math.sin(rad(theta))} y2={y0 - 2 * Math.cos(rad(theta))} color="var(--dg-photon)" width={3} head={10} />
          <Arrow x1={x0} y1={y0} x2={refl.x} y2={refl.y} color="var(--dg-photon)" width={1 + 4 * f.R} opacity={0.35 + 0.65 * Math.sqrt(f.R)} head={9} />
          {tr && <Arrow x1={x0} y1={y0} x2={tr.x} y2={tr.y} color="var(--dg-photon)" width={1 + 3 * (1 - f.R)} opacity={0.35 + 0.65 * Math.sqrt(1 - f.R)} head={9} />}
          {theta > 2 && <path d={arc(42, 0, -theta, false)} fill="none" stroke="var(--dg-ink)" strokeWidth={1.25} />}
          {tr && f.thetaT! > 2 && <path d={arc(42, 0, f.thetaT!, true)} fill="none" stroke="var(--dg-ink)" strokeWidth={1.25} />}
          <text x={x0 - 50 - 8 * Math.sin(rad(theta / 2))} y={y0 - 50} textAnchor="end" className="label-strong">
            θᵢ = {theta.toFixed(1)}°
          </text>
          {tr ? (
            <text x={x0 + 52} y={y0 + 58} className="label-strong">
              θₜ = {f.thetaT!.toFixed(1)}°
            </text>
          ) : (
            <text x={x0 + 12} y={y0 + 34} className="label-strong">
              no refracted ray: total internal reflection
            </text>
          )}
          <text x={W - 10} y={y0 - 12} textAnchor="end">
            R = {(100 * f.R).toFixed(1)} %
          </text>
          {tr && (
            <text x={W - 10} y={y0 + 22} textAnchor="end">
              1 − R = {(100 * (1 - f.R)).toFixed(1)} %
            </text>
          )}
        </svg>
      )}
      <span className="schematic-label" style={{ left: 64, top: 22 }}>
        <Term id="refractive-index">n₁</Term> = {n1.toFixed(2)}
      </span>
      <span className="schematic-label" style={{ left: 64, top: H - 22 }}>
        n₂ = {n2.toFixed(2)}
      </span>
      <span className="schematic-label" style={{ left: (W || 240) / 2 + 30, top: 22 }}>
        <Term id="surface-normal">normal</Term>
      </span>
      {crit !== null && (
        <span className="schematic-label" style={{ left: (W || 240) / 2, top: y0 - Lr - 12 }}>
          <Term id="critical-angle">escape cone</Term> ±{crit.toFixed(1)}°
        </span>
      )}
    </div>
  );
}

export default function InterfaceOptics({ meta }: { meta: DiagramMeta }) {
  const [n1, setN1] = useState(1.0);
  const [n2, setN2] = useState(3.57);
  const [theta, setTheta] = useState(30);
  const f = fresnel(n1, n2, theta);
  const crit = criticalAngle(n2, n1);

  const curves = useMemo(() => {
    const pts = sample((t) => t, 0, 89.9, 300).map(([t]) => ({ t, ...fresnel(n1, n2, t) }));
    return {
      R: pts.map((p) => [p.t, 100 * p.R] as [number, number]),
      Rs: pts.map((p) => [p.t, 100 * p.Rs] as [number, number]),
      Rp: pts.map((p) => [p.t, 100 * p.Rp] as [number, number]),
    };
  }, [n1, n2]);

  const presetMarks = PRESETS.map((p) => ({ ...p, active: Math.abs(p.n1 - n1) < 1e-6 && Math.abs(p.n2 - n2) < 1e-6 }));

  return (
    <DiagramFrame
      meta={meta}
      ctx="optics"
      layout="below"
      controls={
        <>
          <div className="slider">
            <span className="slider__label">Media</span>
            <div className="slider__marks">
              {presetMarks.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="chip chip--small"
                  aria-pressed={p.active}
                  onClick={() => {
                    setN1(p.n1);
                    setN2(p.n2);
                  }}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                className="chip chip--small"
                onClick={() => {
                  setN1(n2);
                  setN2(n1);
                }}
              >
                ⇅ Swap media
              </button>
            </div>
          </div>
          <Slider label={<Term id="angle-of-incidence">Angle of incidence θᵢ</Term>} value={theta} min={0} max={90} step={0.5} unit="°" onChange={setTheta} format={(v) => v.toFixed(1)} />
          <Slider label="n₁ (incident side)" value={n1} min={1} max={4.5} step={0.01} onChange={setN1} format={(v) => v.toFixed(2)} />
          <Slider label="n₂ (other side)" value={n2} min={1} max={4.5} step={0.01} onChange={setN2} format={(v) => v.toFixed(2)} />
        </>
      }
      readouts={
        <>
          <Readout label="Refraction angle θₜ" value={f.thetaT === null ? 'none (TIR)' : fmt(f.thetaT, 3)} unit={f.thetaT === null ? undefined : '°'} />
          <Readout label={<Term id="critical-angle">Critical angle</Term>} value={crit === null ? '– (n₁ ≤ n₂)' : fmt(crit, 3)} unit={crit === null ? undefined : '°'} />
          <Readout label="Rₛ = rₛ²" value={fmt(100 * f.Rs, 3)} unit="%" />
          <Readout label="Rₚ = rₚ²" value={fmt(100 * f.Rp, 3)} unit="%" />
          <Readout label={<Term id="reflectance">Reflectance R (unpolarised)</Term>} value={fmt(100 * f.R, 3)} unit="%" emphasis />
          <Readout label="Transmitted 1 − R" value={fmt(100 * (1 - f.R), 3)} unit="%" />
        </>
      }
      formulas={[
        { tex: 'n_1 \\sin\\theta_i = n_2 \\sin\\theta_t', label: 'Snell’s law (eq. 4.11)' },
        { tex: 'R = \\frac{1}{2}\\left(r_s^2 + r_p^2\\right)', label: 'Unpolarised reflectance (eq. 4.14), r from eq. 4.12b/4.13b' },
        { tex: '\\sin\\theta_{\\mathrm{crit}} = \\frac{n_2}{n_1}', label: 'Critical angle for n₁ > n₂ (sheet eq. 4.19 writes it with the lower index on top)' },
      ]}
      notice={
        <>
          <p>
            <strong>Air → c-Si:</strong> R stays at about 32 % from 0° all the way to 60°, then shoots up to 100 % at grazing incidence. That is why instruction
            1 Q1(b) gives 31.6 %, 31.7 % and 32.4 % for 0°, 30° and 60°. Meanwhile θₜ never exceeds 16.3°: the high index squeezes all light into a narrow cone.
          </p>
          <p>
            <strong>s and p split.</strong> At normal incidence Rₛ = Rₚ. At larger angles s-light is reflected more and p-light less; Rₚ even drops to zero at
            Brewster’s angle (≈ 74° for c-Si). For unpolarised sunlight only the average matters.
          </p>
          <p>
            <strong>c-Si → air:</strong> beyond the critical angle (16.3°) the refracted ray disappears and R jumps to 100 %: total internal reflection. Light
            *inside* the silicon can only leave through the narrow escape cone, which is what light trapping exploits. Note the asymmetry: from air, light
            always gets in (at any angle); from silicon, most directions are trapped.
          </p>
        </>
      }
    >
      <div className="io-grid">
        <RayPicture n1={n1} n2={n2} theta={theta} />
        <div>
          <Legend
            items={[
              { label: 'R (unpolarised)', color: C.accent },
              { label: 'Rₛ', color: C.aux },
              { label: 'Rₚ', color: C.s2 },
            ]}
          />
          <Plot
            ariaLabel="Reflectance versus angle of incidence"
            x={{ domain: [0, 90], label: <Term id="angle-of-incidence">Angle of incidence θᵢ</Term>, unit: '°', ticks: [0, 15, 30, 45, 60, 75, 90] }}
            y={{ domain: [0, 100], label: <Term id="reflectance">Reflectance</Term>, unit: '%' }}
            aspect={0.75}
            minHeight={240}
            maxHeight={320}
            hover={{
              series: [
                { label: 'R', color: C.accent, points: curves.R, format: (v) => `${v.toFixed(1)} %` },
                { label: 'Rₛ', color: C.aux, points: curves.Rs, format: (v) => `${v.toFixed(1)} %` },
                { label: 'Rₚ', color: C.s2, points: curves.Rp, format: (v) => `${v.toFixed(1)} %` },
              ],
              xFormat: (v) => `${v.toFixed(1)}°`,
            }}
          >
            <Line points={curves.Rs} color={C.aux} width={1.75} />
            <Line points={curves.Rp} color={C.s2} width={1.75} />
            <Line points={curves.R} color={C.accent} width={2.5} />
            {crit !== null && (
              <>
                <VRule x={crit} color={C.ink2} />
                <PlotLabel x={crit} y={50} dx={6} anchor="start">
                  θ<sub>crit</sub>
                </PlotLabel>
              </>
            )}
            <Dot x={theta} y={100 * f.R} color={C.accent} />
          </Plot>
        </div>
      </div>
    </DiagramFrame>
  );
}
