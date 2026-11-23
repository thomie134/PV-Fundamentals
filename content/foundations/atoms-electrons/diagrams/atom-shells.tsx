import { useState } from 'react';
import { C, DiagramFrame, Electron, Hole, Readout, Segmented, Term, useMeasure } from '@/diagrams/kit';
import type { DiagramMeta } from '@/lib/types';

type El = 'B' | 'Si' | 'P' | 'As';
const ELEMENTS: Record<El, { Z: number; shells: number[]; config: string; role: string; why: string; name: string }> = {
  B: { Z: 5, shells: [2, 3], config: '1s² 2s² 2p¹', role: 'acceptor', why: 'one bond stays incomplete → hole', name: 'Boron' },
  Si: { Z: 14, shells: [2, 8, 4], config: '1s² 2s² 2p⁶ 3s² 3p²', role: 'host', why: 'four complete bonds', name: 'Silicon' },
  P: { Z: 15, shells: [2, 8, 5], config: '1s² 2s² 2p⁶ 3s² 3p³', role: 'donor', why: 'fifth electron set free', name: 'Phosphorus' },
  As: { Z: 33, shells: [2, 8, 18, 5], config: '[Ar] 3d¹⁰ 4s² 4p³', role: 'donor', why: 'fifth electron set free', name: 'Arsenic' },
};

export default function AtomShells({ meta }: { meta: DiagramMeta }) {
  const [el, setEl] = useState<El>('P');
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const e = ELEMENTS[el];
  const valence = e.shells[e.shells.length - 1];
  const W = Math.max(width, 260);
  const H = 250;
  const twoCol = W >= 460;
  const atomCx = twoCol ? W * 0.25 : W / 2;
  const latticeCx = twoCol ? W * 0.72 : W / 2;
  const showLattice = twoCol;
  const rStep = Math.min(26, (twoCol ? W * 0.22 : W * 0.4) / (e.shells.length + 0.6));

  return (
    <DiagramFrame
      meta={meta}
      ctx="semiconductor"
      layout="below"
      controls={
        <Segmented
          label="Element"
          value={el}
          onChange={setEl}
          options={(Object.keys(ELEMENTS) as El[]).map((k) => ({ value: k, label: k }))}
        />
      }
      readouts={
        <>
          <Readout label={<Term id="atomic-number">Atomic number Z</Term>} value={e.Z} note={`${e.Z} protons, ${e.Z} electrons`} />
          <Readout label="Configuration" value={e.config} />
          <Readout label={<Term id="valence-electron">Valence electrons</Term>} value={valence} emphasis />
          <Readout label="In a Si crystal" value={e.role} note={e.why} />
        </>
      }
      caption={showLattice ? 'Left: shell model (inner shells grey, outer shell coloured). Right: the atom in the silicon bonding model; each line is one bonding electron.' : 'Shell model: inner shells grey, outer shell coloured. Widen the screen to see the bonding model.'}
      notice={
        <>
          <p>
            <strong>Only the outer shell counts.</strong> B, Si and P differ by one valence electron each, and that single electron decides whether the atom is a host, a donor or an
            acceptor. Arsenic has many more electrons in total, but also 5 in its outer shell, so it behaves like phosphorus.
          </p>
          <p>
            <strong>Neutral throughout.</strong> Swapping Si for P adds one electron <em>and</em> one proton. The crystal only gets a mobile charge once the loosely bound fifth electron
            leaves, and then the P ion left behind balances it.
          </p>
        </>
      }
    >
      <div ref={ref} className="schematic" style={{ height: H }}>
        {width > 0 && (
          <svg width={W} height={H} role="img" aria-label={`${e.name}: ${e.Z} electrons, ${valence} valence electrons`}>
            {/* shell model */}
            <circle cx={atomCx} cy={H / 2} r={13} fill={C.ink} />
            <text x={atomCx} y={H / 2} dy="0.35em" textAnchor="middle" style={{ fill: 'var(--dg-surface)' }} className="label-strong">
              {el}
            </text>
            {e.shells.map((count, si) => {
              const r = 13 + rStep * (si + 1);
              const outer = si === e.shells.length - 1;
              return (
                <g key={si}>
                  <circle cx={atomCx} cy={H / 2} r={r} fill="none" stroke={outer ? C.accent : C.grid} strokeWidth={outer ? 2 : 1.5} />
                  {Array.from({ length: count }, (_, k) => {
                    const a = (2 * Math.PI * k) / count - Math.PI / 2;
                    const x = atomCx + r * Math.cos(a);
                    const y = H / 2 + r * Math.sin(a);
                    return outer ? <Electron key={k} x={x} y={y} r={5.5} /> : <circle key={k} cx={x} cy={y} r={2.6} fill={C.ink2} />;
                  })}
                </g>
              );
            })}
            {/* bonding model */}
            {showLattice && <Lattice cx={latticeCx} cy={H / 2} el={el} />}
          </svg>
        )}
      </div>
    </DiagramFrame>
  );
}

function Lattice({ cx, cy, el }: { cx: number; cy: number; el: El }) {
  const d = 62;
  const nb = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const v = ELEMENTS[el].shells.at(-1)!;
  return (
    <g>
      {nb.map(([dx, dy], i) => {
        const x2 = cx + dx * d;
        const y2 = cy + dy * d;
        const ox = dy * 4;
        const oy = dx * 4;
        const broken = v === 3 && i === 1;
        return (
          <g key={i}>
            <line x1={cx + ox} y1={cy + oy} x2={x2 + ox} y2={y2 + oy} stroke={C.ink2} strokeWidth={2} />
            {!broken && <line x1={cx - ox} y1={cy - oy} x2={x2 - ox} y2={y2 - oy} stroke={C.ink2} strokeWidth={2} />}
            {broken && <Hole x={(cx + x2) / 2 - ox} y={(cy + y2) / 2 - oy - 8} r={7} />}
            <circle cx={x2} cy={y2} r={14} fill="var(--dg-surface)" stroke={C.ink2} strokeWidth={1.5} />
            <text x={x2} y={y2} dy="0.35em" textAnchor="middle">
              Si
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={15} fill="var(--dg-surface)" stroke={el === 'Si' ? C.ink2 : C.accent} strokeWidth={2.5} />
      <text x={cx} y={cy} dy="0.35em" textAnchor="middle" className="label-strong">
        {el}
      </text>
      {v === 5 && (
        <>
          <Electron x={cx + 34} y={cy - 32} r={7} />
          <text x={cx + 46} y={cy - 46}>
            5th electron: free
          </text>
        </>
      )}
      {v === 3 && (
        <text x={cx + 18} y={cy - 22}>
          missing electron
        </text>
      )}
    </g>
  );
}
