/**
 * <Formula> — KaTeX formula whose symbols are hoverable (mouse), tappable (touch)
 * and keyboard reachable (Tab to the formula's first symbol, ←/→ between symbols,
 * Enter toggles, Escape closes). Symbols are found automatically via the symbol
 * dictionary + the current SymbolContext (see lib/latexSymbols.ts).
 */
import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { glossaryById, symbolById, symbolIndex } from '@/lib/content';
import { annotate } from '@/lib/latexSymbols';
import { recordLookup } from '@/lib/storage';
import type { SymbolContext, SymbolEntry } from '@/lib/types';
import { useSymbolContext } from './contexts';
import { Tex, renderTex } from './Math';

interface FormulaProps {
  tex: string;
  display?: boolean;
  ctx?: SymbolContext;
  className?: string;
  /** Accessible description for screen readers (KaTeX also emits MathML). */
  label?: string;
}

export function Formula({ tex, display = false, ctx, className, label }: FormulaProps) {
  const inherited = useSymbolContext();
  const context = ctx ?? inherited;
  const html = useMemo(() => renderTex(annotate(tex, symbolIndex, context).tex, display), [tex, context, display]);
  const box = useRef<HTMLElement>(null);
  const [active, setActive] = useState<{ el: HTMLElement; entry: SymbolEntry } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const { refs, floatingStyles } = useFloating({
    open: !!active,
    placement: 'top',
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    elements: { reference: active?.el ?? null },
  });

  const clear = () => window.clearTimeout(timer.current);
  const openFor = useCallback((el: HTMLElement, deliberate: boolean) => {
    clear();
    const entry = symbolById.get(el.dataset.sym ?? '');
    if (!entry) return;
    setActive({ el, entry });
    if (deliberate && entry.glossary) recordLookup(entry.glossary);
  }, []);
  const closeSoon = (ms = 140) => {
    clear();
    timer.current = window.setTimeout(() => setActive(null), ms);
  };

  // Make symbols focusable with a roving tabindex.
  useLayoutEffect(() => {
    const syms = Array.from(box.current?.querySelectorAll<HTMLElement>('[data-sym]') ?? []);
    syms.forEach((el, i) => {
      const entry = symbolById.get(el.dataset.sym ?? '');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', i === 0 ? '0' : '-1');
      el.setAttribute('aria-label', entry ? `${entry.name}${entry.unit && entry.unit !== '–' ? `, unit ${entry.unit}` : ''}` : 'symbol');
      el.setAttribute('aria-haspopup', 'dialog');
      el.classList.add('sym');
    });
  }, [html]);

  // Close on outside press / Escape.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || refs.floating.current?.contains(t)) return;
      setActive(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActive(null);
        active.el.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, refs.floating]);

  useEffect(() => clear, []);

  const symFrom = (t: EventTarget | null) => (t instanceof Element ? (t.closest('[data-sym]') as HTMLElement | null) : null);
  const Tag = display ? 'div' : 'span';

  return (
    <>
      <Tag
        ref={box as never}
        className={['formula', display ? 'formula--display' : 'formula--inline', className].filter(Boolean).join(' ')}
        aria-label={label}
        dangerouslySetInnerHTML={{ __html: html }}
        onPointerOver={(e) => {
          if (e.pointerType !== 'mouse') return;
          const el = symFrom(e.target);
          if (el) {
            clear();
            timer.current = window.setTimeout(() => openFor(el, false), active ? 0 : 160);
          }
        }}
        onPointerOut={(e) => {
          if (e.pointerType !== 'mouse') return;
          if (symFrom(e.target)) closeSoon();
        }}
        onClick={(e) => {
          const el = symFrom(e.target);
          if (!el) return;
          if (active?.el === el) setActive(null);
          else openFor(el, true);
        }}
        onFocus={(e) => {
          const el = symFrom(e.target);
          if (el && el.matches(':focus-visible')) openFor(el, false);
        }}
        onBlur={(e) => {
          if (!refs.floating.current?.contains(e.relatedTarget as Node)) closeSoon(80);
        }}
        onKeyDown={(e) => {
          const el = symFrom(e.target);
          if (!el) return;
          const syms = Array.from(box.current!.querySelectorAll<HTMLElement>('[data-sym]'));
          const i = syms.indexOf(el);
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const next = syms[(i + (e.key === 'ArrowRight' ? 1 : -1) + syms.length) % syms.length];
            syms.forEach((s) => s.setAttribute('tabindex', s === next ? '0' : '-1'));
            next.focus();
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (active?.el === el) setActive(null);
            else openFor(el, true);
          }
        }}
      />
      {active && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="popover popover--symbol"
            role="dialog"
            aria-label={active.entry.name}
            onPointerEnter={clear}
            onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
          >
            <SymbolCard entry={active.entry} onNavigate={() => setActive(null)} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export function SymbolCard({ entry, onNavigate }: { entry: SymbolEntry; onNavigate?: () => void }) {
  const g = entry.glossary ? glossaryById.get(entry.glossary) : undefined;
  return (
    <div className="symbol-card">
      <div className="symbol-card__head">
        <Tex tex={entry.latex} className="symbol-card__tex" />
        <span className="symbol-card__name">{entry.name}</span>
      </div>
      <dl className="symbol-card__facts">
        <div>
          <dt>Unit</dt>
          <dd>{entry.unit}</dd>
        </div>
        {entry.typical && (
          <div>
            <dt>Typical</dt>
            <dd>{entry.typical}</dd>
          </div>
        )}
      </dl>
      {entry.note && <p className="symbol-card__note">{entry.note}</p>}
      {g && (
        <Link className="symbol-card__link" to={`/glossary#${g.id}`} onClick={onNavigate}>
          More about {g.term.toLowerCase()} →
        </Link>
      )}
    </div>
  );
}

/** Shorthand for MDX: <F t="..."/> */
export const F = ({ t, d, ctx }: { t: string; d?: boolean; ctx?: SymbolContext }) => <Formula tex={t} display={d} ctx={ctx} />;
export { Tex };
