/**
 * Particle glyphs shared by all schematic diagrams. Identity is carried by SHAPE
 * (−/+ circle, wavy arrow) as well as colour, so they stay distinguishable for
 * colour-blind readers and in print.
 */
export function Electron({ x, y, r = 8 }: { x: number; y: number; r?: number }) {
  return (
    <g className="glyph glyph--electron" aria-hidden>
      <circle cx={x} cy={y} r={r} fill="var(--dg-electron)" stroke="var(--dg-surface)" strokeWidth={2} />
      <line x1={x - r * 0.45} x2={x + r * 0.45} y1={y} y2={y} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

export function Hole({ x, y, r = 8 }: { x: number; y: number; r?: number }) {
  return (
    <g className="glyph glyph--hole" aria-hidden>
      <circle cx={x} cy={y} r={r} fill="var(--dg-surface)" stroke="var(--dg-hole)" strokeWidth={2.5} />
      <path d={`M${x - r * 0.45},${y}H${x + r * 0.45}M${x},${y - r * 0.45}V${y + r * 0.45}`} stroke="var(--dg-hole)" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

/** Wavy photon arrow from (x1,y1) to (x2,y2). */
export function Photon({ x1, y1, x2, y2, waves = 4, amp = 4, color = 'var(--dg-photon)', width = 2 }: { x1: number; y1: number; x2: number; y2: number; waves?: number; amp?: number; color?: string; width?: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const head = 8;
  const body = len - head;
  const n = 60;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * body;
    const off = Math.sin((t / body) * waves * 2 * Math.PI) * amp;
    const px = x1 + ux * t - uy * off;
    const py = y1 + uy * t + ux * off;
    d += `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
  }
  const bx = x1 + ux * body;
  const by = y1 + uy * body;
  const tri = `M${x2},${y2}L${bx - uy * 5},${by + ux * 5}L${bx + uy * 5},${by - ux * 5}Z`;
  return (
    <g className="glyph glyph--photon" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={tri} fill={color} />
    </g>
  );
}

/** Straight arrow (rays, currents). */
export function Arrow({ x1, y1, x2, y2, color = 'var(--dg-ink)', width = 2, dash, head = 8, opacity }: { x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; dash?: string; head?: number; opacity?: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  return (
    <g aria-hidden opacity={opacity}>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      <path d={`M${x2},${y2}L${bx - uy * head * 0.55},${by + ux * head * 0.55}L${bx + uy * head * 0.55},${by - ux * head * 0.55}Z`} fill={color} />
    </g>
  );
}
