/**
 * <Term> — inline glossary term (layer 1 → 2 → 3).
 *  - soft blue text (no underline, so links stay distinct); hover (mouse), tap (touch) or keyboard focus opens a popover;
 *  - popover: short definition + symbol/unit; "More" expands in place (layer 2:
 *    refresher, example, clickable related terms); link to the full glossary entry (layer 3);
 *  - only the first occurrence per <TermScope> (concept section) is highlighted;
 *  - every opening is counted for "terms you keep looking up".
 */
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
} from '@floating-ui/react';
import { Children, isValidElement, useContext, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { findTerm, foundationById, glossaryById } from '@/lib/content';
import { recordLookup } from '@/lib/storage';
import type { GlossaryEntry } from '@/lib/types';
import { TermRegistry, TermScopeCtx } from './contexts';
import { Tex } from './Math';
import { Rich } from './Rich';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

export function TermScope({ children }: { children: ReactNode }) {
  const ref = useRef<TermRegistry | null>(null);
  if (!ref.current) ref.current = new TermRegistry();
  return <TermScopeCtx.Provider value={ref.current}>{children}</TermScopeCtx.Provider>;
}

/** Proper names keep their capital when a term is used inline without custom text. */
const PROPER = /^(Snell|Fresnel|Planck|Wien|Stefan|Lambert|Beer|Boltzmann|Fermi|Shockley|Auger|Einstein|Poisson|Brewster|SI\b|AM|STC|ARC|J–V|I–V)/;
export const inlineLabel = (term: string) => (PROPER.test(term) || /^[A-Z]{2}/.test(term) ? term : term.charAt(0).toLowerCase() + term.slice(1));

function useFirstInScope(id: string | undefined, ref: RefObject<HTMLElement | null>, always: boolean) {
  const scope = useContext(TermScopeCtx);
  const [first, setFirst] = useState(true);
  useLayoutEffect(() => {
    if (!scope || !id || always || !ref.current) {
      setFirst(true);
      return;
    }
    return scope.register(id, ref.current, setFirst);
  }, [scope, id, always, ref]);
  return first;
}

interface TermProps {
  /** Glossary id. If omitted, the visible text is matched against terms and aliases. */
  id?: string;
  children?: ReactNode;
  /** Underline even if the term already appeared in this section. */
  always?: boolean;
}

export function Term({ id, children, always = false }: TermProps) {
  const label = Children.count(children) ? children : undefined;
  const entry = findTerm(id ?? textOf(children));
  const ref = useRef<HTMLSpanElement>(null);
  const isFirst = useFirstInScope(entry?.id, ref, always);

  if (!entry) {
    if (import.meta.env.DEV) console.warn(`[Term] no glossary entry for "${id ?? textOf(children)}"`);
    return <>{label ?? id}</>;
  }
  return (
    <TermTrigger entry={entry} active={isFirst} innerRef={ref}>
      {label ?? inlineLabel(entry.term)}
    </TermTrigger>
  );
}

function TermTrigger({ entry, children, active, innerRef }: { entry: GlossaryEntry; children: ReactNode; active: boolean; innerRef: RefObject<HTMLSpanElement | null> }) {
  const [open, setOpen] = useState(false);
  // Once the reader clicks inside the popover (e.g. "More"), it stays open until Escape / outside click,
  // even if it grows and moves away from the mouse.
  const [pinned, setPinned] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (o) => {
      setOpen(o);
      if (o) recordLookup(entry.id);
      else setPinned(false);
    },
    placement: 'bottom-start',
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(180, Math.min(availableHeight, 520))}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { enabled: !pinned, mouseOnly: true, delay: { open: 220, close: 120 }, handleClose: safePolygon({ blockPointerEvents: false }) });
  const focus = useFocus(context, { visibleOnly: true });
  const click = useClick(context, { ignoreMouse: true });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, click, dismiss, role]);

  const mergedRef = useMergeRefs([refs.setReference, innerRef]);
  // Same <span> element whether or not this is the section's first occurrence, so the registry keeps tracking it.
  const triggerProps = active ? { className: 'term', tabIndex: 0, role: 'button', 'aria-label': `${textOf(children)}: show definition`, ...getReferenceProps() } : {};
  return (
    <>
      <span ref={active ? mergedRef : innerRef} {...triggerProps}>
        {children}
      </span>
      {active && open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1} returnFocus>
            <div ref={refs.setFloating} style={floatingStyles} className="popover" {...getFloatingProps({ onPointerDown: () => setPinned(true), onKeyDown: () => setPinned(true) })}>
              <TermCard initialId={entry.id} onClose={() => setOpen(false)} />
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

/** The popover body. Related terms navigate within the card (with a back button). */
export function TermCard({ initialId, onClose, startExpanded = false }: { initialId: string; onClose?: () => void; startExpanded?: boolean }) {
  const [stack, setStack] = useState<string[]>([initialId]);
  const [expanded, setExpanded] = useState(startExpanded);
  const entry = glossaryById.get(stack[stack.length - 1]);
  if (!entry) return null;
  const foundation = entry.foundation ? foundationById.get(entry.foundation) : undefined;

  const go = (id: string) => {
    if (!glossaryById.has(id)) return;
    recordLookup(id);
    setStack((s) => [...s, id]);
    setExpanded(true);
  };

  return (
    <div className="term-card">
      <div className="term-card__head">
        {stack.length > 1 && (
          <button type="button" className="icon-btn" aria-label="Back to previous term" onClick={() => setStack((s) => s.slice(0, -1))}>
            ←
          </button>
        )}
        <div className="term-card__title">
          <span className="term-card__name">{entry.term}</span>
          {entry.symbol && <Tex tex={entry.symbol} className="term-card__symbol" />}
        </div>
        {entry.unit && <span className="badge">{entry.unit}</span>}
        <span className={`badge badge--${entry.category}`}>{entry.category === 'prerequisite' ? 'background' : 'course'}</span>
      </div>
      <p className="term-card__short">{entry.short}</p>

      {expanded && (
        <div className="term-card__more">
          <Rich text={entry.long} />
          {entry.example && (
            <div className="term-card__example">
              <span className="eyebrow">Example</span>
              <Rich text={entry.example} />
            </div>
          )}
          {entry.related.length > 0 && (
            <div className="term-card__related">
              <span className="eyebrow">Related</span>
              <div className="chips">
                {entry.related
                  .filter((r) => glossaryById.has(r))
                  .map((r) => (
                    <button key={r} type="button" className="chip" onClick={() => go(r)}>
                      {glossaryById.get(r)!.term}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="term-card__actions">
        <button type="button" className="btn btn--small btn--ghost" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Less' : 'More'}
        </button>
        <Link className="btn btn--small btn--ghost" to={`/glossary#${entry.id}`} onClick={onClose}>
          Full entry →
        </Link>
        {foundation && (
          <Link className="btn btn--small btn--ghost" to={`/foundations/${foundation.id}`} onClick={onClose}>
            Refresh: {foundation.title}
          </Link>
        )}
      </div>
    </div>
  );
}
