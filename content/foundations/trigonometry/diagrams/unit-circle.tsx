import { useState } from 'react';
import { C, DiagramFrame, Readout, Slider, Term, fmt, useMeasure } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';

export default function UnitCircle({ meta }: { meta: DiagramMeta }) {
  const [deg, setDeg] = useState(30);
  const [x, setX] = useState('0.5');
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const th = (deg * Math.PI) / 180;
  const s = Math.sin(th);
  const c = Math.cos(th);
  const W = Math.max(width, 240);
  const H = 300;
  const R = Math.min(W - 80, H - 60);
  const ox = 40;
  const oy = H - 30;
  const px = ox + R * c;
  const py = oy - R * s;
  const xv = Number(x.replace(',', '.'));
  const asin = Number.isFinite(xv) && Math.abs(xv) <= 1 ? (Math.asin(xv) * 180) / Math.PI : null;

  return (
    <DiagramFrame
      meta={meta}
      ctx="math"
      controls={
        <>
          <Slider label="Angle θ" value={deg} min={0} max={90} step={0.5} unit="°" onChange={setDeg} format={(v) => v.toFixed(1)} />
          <label className="slider">
            <span className="slider__label">
              <Term id="sine-cosine">arcsin</Term> of:
            </span>
            <input className="input" inputMode="decimal" value={x} onChange={(e) => setX(e.target.value)} aria-label="Value for arcsin" />
          </label>
        </>
      }
      readouts={
        <>
          <Readout label="sin θ (height)" value={fmt(s, 3)} />
          <Readout label="cos θ (width)" value={fmt(c, 3)} />
          <Readout label={<Term id="radian">θ in radians</Term>} value={fmt(th, 3)} unit="rad" />
          <Readout label={`arcsin(${x || '…'})`} value={asin === null ? 'no angle' : fmt(asin, 4)} unit={asin === null ? undefined : '°'} emphasis note={asin === null ? 'sin can’t exceed 1 → in optics: total internal reflection' : undefined} />
        </>
      }
      formulas={[{ tex: '\\sin\\theta = \\frac{\\text{opposite}}{\\text{hypotenuse}}' }, { tex: '\\cos\\theta = \\frac{\\text{adjacent}}{\\text{hypotenuse}}' }]}
      notice={
        <>
          <p>
            On a circle of radius 1, the point at angle θ sits at height sin θ and horizontal distance cos θ. Both stay between 0 and 1 here, so arcsin only
            accepts values up to 1.
          </p>
          <p>
            In optics, θ is measured from the <strong>normal</strong>. If you put the normal along the vertical axis, ‘cos θ’ is the projection onto the normal:
            that is why the path through a layer of thickness d is d/cos θ.
          </p>
        </>
      }
    >
      <div ref={ref} className="schematic" style={{ height: H }}>
        {width > 0 && (
          <svg width={W} height={H} role="img" aria-label={`Unit circle at ${deg} degrees: sine ${s.toFixed(2)}, cosine ${c.toFixed(2)}`}>
            <path d={`M${ox},${oy - R} A${R},${R} 0 0 1 ${ox + R},${oy}`} fill="none" stroke="var(--dg-grid)" strokeWidth={2} />
            <line x1={ox} y1={oy} x2={ox + R + 14} y2={oy} stroke="var(--dg-axis)" />
            <line x1={ox} y1={oy} x2={ox} y2={oy - R - 14} stroke="var(--dg-axis)" />
            <path d={`M${ox} ${oy} L${px} ${py} L${px} ${oy} Z`} fill="var(--dg-wash)" />
            <line x1={ox} y1={oy} x2={px} y2={py} stroke={C.ink} strokeWidth={2} />
            <line x1={px} y1={oy} x2={px} y2={py} stroke={C.accent} strokeWidth={3} strokeLinecap="round" />
            <line x1={ox} y1={oy} x2={px} y2={oy} stroke={C.aux} strokeWidth={3} strokeLinecap="round" />
            <path d={`M${ox + 34},${oy} A34,34 0 0 0 ${ox + 34 * c},${oy - 34 * s}`} fill="none" stroke={C.ink2} strokeWidth={1.5} />
            <circle cx={px} cy={py} r={5} fill={C.ink} stroke="var(--dg-surface)" strokeWidth={2} />
            <text x={ox + 42} y={oy - 8}>θ</text>
            <text x={px + 8} y={(py + oy) / 2} className="label-strong">
              sin θ = {s.toFixed(2)}
            </text>
            <text x={(ox + px) / 2} y={oy + 18} textAnchor="middle" className="label-strong">
              cos θ = {c.toFixed(2)}
            </text>
            <text x={(ox + px) / 2 - 10} y={(oy + py) / 2 - 8} textAnchor="end">
              1
            </text>
          </svg>
        )}
      </div>
    </DiagramFrame>
  );
}
