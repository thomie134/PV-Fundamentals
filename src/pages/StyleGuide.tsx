/**
 * Style guide: the design tokens and diagram rules, rendered live from tokens.css.
 * Every page and diagram follows this. Change tokens there, not in components.
 */
import { useState } from 'react';
import { GoDeeper, Flag, KeyIdea, Note } from '@/components/Blocks';
import { Readout, Segmented, Slider, Toggle } from '@/components/Controls';
import { SymbolCtx } from '@/components/contexts';
import { Formula } from '@/components/Formula';
import { Term, TermScope } from '@/components/Term';
import { Arrow, C, Electron, Hole, Legend, Line, Photon, Plot, PlotLabel, Area, VRule, Dot, sample } from '@/diagrams/kit';
import { useTrackVisit } from '@/components/Layout';

const SWATCHES: { group: string; items: [string, string][] }[] = [
  {
    group: 'Surfaces & ink',
    items: [
      ['--bg', 'Page background'],
      ['--surface-1', 'Cards, diagram surface'],
      ['--surface-2', 'Subtle fill'],
      ['--border', 'Hairlines'],
      ['--text-primary', 'Primary text'],
      ['--text-secondary', 'Secondary text'],
      ['--text-muted', 'Muted text'],
    ],
  },
  {
    group: 'Accent (the one accent)',
    items: [
      ['--accent', 'Accent: buttons, focus, primary curve'],
      ['--accent-strong', 'Links / accent text'],
      ['--accent-soft', 'Selected / wash'],
    ],
  },
  {
    group: 'Status (always with icon + label)',
    items: [
      ['--good', 'Correct'],
      ['--bad', 'Wrong'],
      ['--warn', 'Flag / heads-up'],
    ],
  },
  {
    group: 'Diagram roles',
    items: [
      ['--dg-accent', 'Primary curve · holes (+)'],
      ['--dg-electron', 'Electrons (−)'],
      ['--dg-photon', 'Photons / light'],
      ['--dg-aux', 'Comparison series'],
      ['--dg-cb-fill', 'Conduction band wash'],
      ['--dg-vb-fill', 'Valence band wash'],
      ['--dg-grid', 'Gridlines'],
      ['--dg-axis', 'Axis ticks'],
    ],
  },
];

const TYPE: [string, string, string][] = [
  ['--text-3xl', '40px', 'Hero'],
  ['--text-2xl', '32px', 'Page title (h1)'],
  ['--text-xl', '24px', 'Section (h2)'],
  ['--text-lg', '20px', 'Concept (h3)'],
  ['--text-md', '17px', 'Prose body'],
  ['--text-base', '16px', 'UI body'],
  ['--text-sm', '14px', 'Controls, readouts, popovers'],
  ['--text-xs', '12px', 'Ticks, captions, eyebrows'],
];

const SPACE = ['1', '2', '3', '4', '6', '8', '12', '16'];

export default function StyleGuide() {
  useTrackVisit('Style guide');
  const [T, setT] = useState(5800);
  const [mode, setMode] = useState<'a' | 'b'>('a');
  const [on, setOn] = useState(true);
  const curve = sample((x) => Math.exp(-x / (T / 2000)), 0, 10, 120);
  const ref = sample((x) => Math.exp(-x / 2.9), 0, 10, 120);

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Design system</span>
        <h1>Style guide</h1>
        <p className="lede">The tokens, components and diagram conventions used on every page. Calm, consistent, and built so the physics is the loudest thing on screen.</p>
      </header>

      <section className="section">
        <h2 className="sg-h">Principles</h2>
        <ul className="sg-principles">
          <li>
            <strong>Physics first.</strong> Data marks carry colour; text, axes and chrome stay neutral.
          </li>
          <li>
            <strong>One accent.</strong> Blue is the only UI accent and the primary diagram colour. Other hues are reserved for physical roles.
          </li>
          <li>
            <strong>Progressive depth.</strong> Main text stays short; detail lives in popovers, “Go deeper” blocks and the glossary.
          </li>
          <li>
            <strong>Motion explains.</strong> Sliders update instantly; only discrete changes animate (≤ 200 ms). Reduced-motion is respected.
          </li>
          <li>
            <strong>Every interaction works three ways:</strong> mouse hover, touch tap, keyboard (Tab / arrows / Enter / Escape).
          </li>
        </ul>
      </section>

      <section className="section">
        <h2 className="sg-h">Colour</h2>
        {SWATCHES.map((g) => (
          <div key={g.group} className="sg-group">
            <h3 className="sg-sub">{g.group}</h3>
            <ul className="sg-swatches">
              {g.items.map(([v, label]) => (
                <li key={v}>
                  <span className="sg-swatch" style={{ background: `var(${v})` }} />
                  <code>{v}</code>
                  <span className="muted small">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="small muted">
          Diagram role colours come from a palette validated for colour-vision deficiency (light and dark selected separately). Red↔yellow is weak for
          deuteranopia in dark mode, so electrons, holes and photons always differ by shape and carry direct labels too.
        </p>
      </section>

      <section className="section">
        <h2 className="sg-h">Type</h2>
        <p className="muted">Inter (variable) for everything; JetBrains Mono with tabular figures for numbers in readouts; KaTeX for maths.</p>
        <ul className="sg-type">
          {TYPE.map(([v, px, use]) => (
            <li key={v}>
              <span style={{ fontSize: `var(${v})`, fontWeight: v.includes('xl') ? 620 : 400 }}>Photon flux</span>
              <span className="muted small">
                <code>{v}</code> · {px} · {use}
              </span>
            </li>
          ))}
        </ul>
        <h3 className="sg-sub">Spacing (4 px base)</h3>
        <ul className="sg-space">
          {SPACE.map((s) => (
            <li key={s}>
              <span style={{ width: `var(--space-${s})` }} />
              <code>--space-{s}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2 className="sg-h">Background-knowledge layers</h2>
        <TermScope>
          <SymbolCtx.Provider value="optics">
            <div className="prose sg-demo">
              <p>
                <strong>Layer 1 → 2 → 3.</strong> Light slows down in a medium with a higher <Term id="refractive-index" />. Hover, tap or Tab to the
                blue term; press <em>More</em> for the refresher, or follow the link to the full glossary entry. Only the first occurrence per section
                is highlighted: the <Term id="refractive-index">refractive index</Term> again is plain text.
              </p>
              <p>Symbols in every formula are hoverable too (Tab to the formula, then use ← →):</p>
              <Formula tex="n_1 \sin\theta_i = n_2 \sin\theta_t" display />
              <Formula tex="R = \frac{1}{2}\left(r_s^2 + r_p^2\right)" display />
            </div>
          </SymbolCtx.Provider>
        </TermScope>
      </section>

      <section className="section">
        <h2 className="sg-h">Content blocks</h2>
        <div className="prose sg-demo stack">
          <KeyIdea>One sentence that captures the concept.</KeyIdea>
          <Note>Supporting information that is useful but not essential.</Note>
          <Flag>Used when the lecture and the book differ, or a source contains an error.</Flag>
          <GoDeeper title="Go deeper: derivations, extra context and book references">
            <p>Collapsed by default so the main flow stays readable.</p>
          </GoDeeper>
        </div>
      </section>

      <section className="section">
        <h2 className="sg-h">Controls & readouts</h2>
        <div className="sg-controls">
          <Slider label="Temperature" value={T} min={3000} max={8000} step={50} unit="K" onChange={setT} marks={[{ value: 5800, label: 'Sun' }]} />
          <Segmented label="View" value={mode} onChange={setMode} options={[{ value: 'a', label: 'Power' }, { value: 'b', label: 'Photons' }]} />
          <Toggle label="Show reference" checked={on} onChange={setOn} />
          <div className="diagram__readouts">
            <Readout label="Readout" value="31.6" unit="%" />
            <Readout label="Emphasised readout" value="4.25 × 10²¹" unit="m⁻² s⁻¹" emphasis />
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="sg-h">Diagram style</h2>
        <ul className="sg-rules">
          <li>Lines 2 px, round caps; reference/comparison lines dashed; markers ≥ 5 px radius with a 2 px surface ring.</li>
          <li>Area fills are the series hue at ~10–16 % opacity. Gridlines: horizontal hairlines only, recessive grey, never dashed.</li>
          <li>Axis titles in sentence case with the unit in brackets; titles and region labels are glossary terms.</li>
          <li>A legend appears for ≥ 2 series; key curves are also labelled directly. Text never takes the series colour.</li>
          <li>Every plot has a crosshair tooltip (hover or drag on touch). Readouts and the formula used sit next to the figure.</li>
          <li>Each diagram: title → “Try this” prompt → figure | controls, readouts, formula → “What you should notice, and why”.</li>
        </ul>
        <div className="diagram sg-diagram">
          <Legend
            items={[
              { label: 'Live curve', color: C.accent },
              { label: 'Reference', color: C.ink2, dash: true },
            ]}
          />
          <Plot
            ariaLabel="Example plot"
            x={{ domain: [0, 10], label: <Term id="wavelength" always>Wavelength</Term>, unit: 'arb.' }}
            y={{ domain: [0, 1.05], label: 'Intensity', unit: 'norm.' }}
            aspect={0.45}
            hover={{ series: [{ label: 'Live', color: C.accent, points: curve }, { label: 'Reference', color: C.ink2, points: ref }] }}
          >
            <Area points={curve} />
            {on && <Line points={ref} color={C.ink2} dash="5 5" />}
            <Line points={curve} />
            <VRule x={4} />
            <Dot x={4} y={Math.exp(-4 / (T / 2000))} />
            <PlotLabel x={4} y={1} dx={6} valign="top">
              marker
            </PlotLabel>
          </Plot>
        </div>
        <h3 className="sg-sub">Particles and rays</h3>
        <svg width="360" height="80" className="sg-glyphs" role="img" aria-label="Electron, hole, photon and ray glyphs">
          <Electron x={30} y={40} />
          <text x={46} y={44} className="sg-glyph-label">electron</text>
          <Hole x={130} y={40} />
          <text x={146} y={44} className="sg-glyph-label">hole</text>
          <Photon x1={200} y1={56} x2={250} y2={24} />
          <text x={256} y={30} className="sg-glyph-label">photon</text>
          <Arrow x1={200} y1={70} x2={350} y2={70} color={C.ink2} width={1.5} />
        </svg>
      </section>
    </div>
  );
}
