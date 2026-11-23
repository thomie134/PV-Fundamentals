/**
 * <DiagramFrame> — the one layout every interactive diagram uses:
 * title + "what to try" → figure | panel (controls, live readouts, formula used)
 * → expandable "what you should notice and why".
 */
import { useState, type ReactNode } from 'react';
import { SymbolCtx } from '@/components/contexts';
import { Formula } from '@/components/Formula';
import { TermScope } from '@/components/Term';
import type { DiagramMeta, SymbolContext } from '@/lib/types';

export interface FrameFormula {
  tex: string;
  label?: ReactNode;
}

export interface DiagramFrameProps {
  meta: DiagramMeta;
  ctx: SymbolContext;
  controls?: ReactNode;
  readouts?: ReactNode;
  formulas?: FrameFormula[];
  notice: ReactNode;
  /** Small print under the figure (data sources etc.). */
  caption?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
  /** 'side' (default): panel to the right on wide screens. 'below': full-width figure, panel underneath. */
  layout?: 'side' | 'below';
}

export function DiagramFrame({ meta, ctx, controls, readouts, formulas, notice, caption, legend, children, layout = 'side' }: DiagramFrameProps) {
  const [open, setOpen] = useState(false);
  return (
    <TermScope>
      <SymbolCtx.Provider value={ctx}>
        <figure className={`diagram diagram--${layout}`} id={`diagram-${meta.id}`} aria-labelledby={`diagram-${meta.id}-title`}>
          <header className="diagram__head">
            <span className="eyebrow">Interactive</span>
            <h4 id={`diagram-${meta.id}-title`} className="diagram__title">
              {meta.title}
            </h4>
            <p className="diagram__try">
              <span className="diagram__try-icon" aria-hidden>
                ✦
              </span>
              <span>
                <strong>Try this:</strong> {meta.tryThis}
              </span>
            </p>
          </header>
          <div className="diagram__body">
            <div className="diagram__figure">
              {legend}
              {children}
              {caption && <figcaption className="diagram__caption">{caption}</figcaption>}
            </div>
            <div className="diagram__panel">
              {controls && <div className="diagram__controls">{controls}</div>}
              {readouts && (
                <div className="diagram__readouts" aria-live="polite">
                  {readouts}
                </div>
              )}
              {formulas && formulas.length > 0 && (
                <div className="diagram__formulas">
                  <span className="eyebrow">Formula used</span>
                  {formulas.map((f, i) => (
                    <div key={i} className="diagram__formula">
                      {f.label && <div className="diagram__formula-label">{f.label}</div>}
                      <Formula tex={f.tex} display />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={`diagram__notice ${open ? 'is-open' : ''}`}>
            <button type="button" className="deeper__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <span className="deeper__icon" aria-hidden>
                ?
              </span>
              <span className="deeper__title">What you should notice, and why</span>
              <span className="deeper__chev" aria-hidden>
                ▾
              </span>
            </button>
            {open && <div className="deeper__body prose">{notice}</div>}
          </div>
        </figure>
      </SymbolCtx.Provider>
    </TermScope>
  );
}
