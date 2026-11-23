/**
 * Content building blocks used in MDX and pages: GoDeeper, Concept, callouts,
 * beginner-only hints, step-by-step reveal and the lazy Diagram loader.
 */
import { Component, Suspense, lazy, useId, useState, type ComponentType, type ReactNode } from 'react';
import { diagramLoader, diagramMeta } from '@/lib/content';
import { settingsStore, useStore } from '@/lib/storage';
import type { DiagramMeta, SourceRef, SymbolContext } from '@/lib/types';
import { SymbolCtx, useWeek } from './contexts';
import { TermScope } from './Term';

/* ---------------- GoDeeper ---------------- */

export function GoDeeper({ title = 'Go deeper', kind = 'deeper', children, defaultOpen = false }: { title?: string; kind?: 'deeper' | 'derivation' | 'book'; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const icon = kind === 'derivation' ? '∂' : kind === 'book' ? '📖' : '＋';
  return (
    <div className={`deeper ${open ? 'is-open' : ''}`}>
      <button type="button" className="deeper__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span className="deeper__icon" aria-hidden>
          {icon}
        </span>
        <span className="deeper__title">{title}</span>
        <span className="deeper__chev" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div id={id} className="deeper__body prose">
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------------- Concept ---------------- */

export function SourceLine({ sources }: { sources: SourceRef[] }) {
  if (!sources.length) return null;
  return (
    <p className="source-line">
      <span className="eyebrow">Source</span>{' '}
      {sources.map((s, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {s.ref}
        </span>
      ))}
    </p>
  );
}

/** A key-concept section. Title, symbol context and sources come from the week's meta.json. */
export function Concept({ id, children }: { id: string; children: ReactNode }) {
  const week = useWeek();
  const meta = week?.concepts.find((c) => c.id === id);
  return (
    <section id={id} className="concept" aria-labelledby={`${id}-title`}>
      <TermScope>
        <SymbolCtx.Provider value={meta?.context ?? 'general'}>
          <h3 id={`${id}-title`} className="concept__title">
            <a href={`#${id}`} className="anchor" aria-hidden tabIndex={-1}>
              #
            </a>
            {meta?.title ?? id}
          </h3>
          <div className="prose">{children}</div>
          {meta && <SourceLine sources={meta.sources} />}
        </SymbolCtx.Provider>
      </TermScope>
    </section>
  );
}

/** Sets the symbol context for a region (e.g. a Foundations lesson section). */
export function Ctx({ c, children }: { c: SymbolContext; children: ReactNode }) {
  return <SymbolCtx.Provider value={c}>{children}</SymbolCtx.Provider>;
}

/* ---------------- Callouts ---------------- */

export function KeyIdea({ children, title = 'Key idea' }: { children: ReactNode; title?: string }) {
  return (
    <aside className="callout callout--key">
      <div className="callout__title">{title}</div>
      <div className="callout__body">{children}</div>
    </aside>
  );
}

export function Note({ children, title = 'Note' }: { children: ReactNode; title?: string }) {
  return (
    <aside className="callout callout--note">
      <div className="callout__title">{title}</div>
      <div className="callout__body">{children}</div>
    </aside>
  );
}

/** Lecture vs book difference, erratum, or something uncertain: always visible. */
export function Flag({ children, title = 'Heads-up: sources differ' }: { children: ReactNode; title?: string }) {
  return (
    <aside className="callout callout--flag" role="note">
      <div className="callout__title">⚑ {title}</div>
      <div className="callout__body">{children}</div>
    </aside>
  );
}

/** Extra scaffolding shown only in beginner mode. */
export function Hint({ children, title = 'Refresher' }: { children: ReactNode; title?: string }) {
  const { beginner } = useStore(settingsStore);
  if (!beginner) return null;
  return (
    <aside className="callout callout--hint">
      <div className="callout__title">✦ {title}</div>
      <div className="callout__body">{children}</div>
    </aside>
  );
}

/* ---------------- Step reveal ---------------- */

export interface Step {
  title: ReactNode;
  body: ReactNode;
  why?: ReactNode;
}

export function StepReveal({ steps, answer }: { steps: Step[]; answer?: ReactNode }) {
  const [shown, setShown] = useState(0);
  const { beginner } = useStore(settingsStore);
  const all = shown >= steps.length;
  return (
    <div className="steps">
      <ol className="steps__list">
        {steps.slice(0, shown).map((s, i) => (
          <li key={i} className="steps__item">
            <div className="steps__num" aria-hidden>
              {i + 1}
            </div>
            <div className="steps__content">
              <div className="steps__title">{s.title}</div>
              <div className="steps__body">{s.body}</div>
              {s.why && <WhyBlock defaultOpen={beginner}>{s.why}</WhyBlock>}
            </div>
          </li>
        ))}
      </ol>
      {all && answer && <div className="steps__answer">{answer}</div>}
      <div className="steps__controls">
        {!all ? (
          <>
            <button type="button" className="btn btn--primary" onClick={() => setShown((n) => n + 1)}>
              {shown === 0 ? 'Show first step' : `Next step (${shown + 1}/${steps.length})`}
            </button>
            {shown < steps.length - 1 && (
              <button type="button" className="btn btn--ghost" onClick={() => setShown(steps.length)}>
                Show all
              </button>
            )}
          </>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={() => setShown(0)}>
            Hide steps
          </button>
        )}
      </div>
    </div>
  );
}

function WhyBlock({ children, defaultOpen }: { children: ReactNode; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="why">
      <button type="button" className="why__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide why' : 'Why?'}
      </button>
      {open && <div className="why__body">{children}</div>}
    </div>
  );
}

/* ---------------- Diagram loader ---------------- */

const lazyCache = new Map<string, ComponentType<{ meta: DiagramMeta }>>();
function getLazy(id: string) {
  if (!lazyCache.has(id)) {
    const loader = diagramLoader(id);
    if (!loader) return null;
    lazyCache.set(id, lazy(loader));
  }
  return lazyCache.get(id)!;
}

class DiagramBoundary extends Component<{ id: string; children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <div className="diagram diagram--error" role="alert">
          Diagram “{this.props.id}” failed to load: {this.state.error.message}
        </div>
      );
    return this.props.children;
  }
}

/** <Diagram id="interface-optics" /> — id = file name in content/.../diagrams/, meta from meta.json. */
export function Diagram({ id }: { id: string }) {
  const meta = diagramMeta(id);
  const Comp = getLazy(id);
  if (!meta || !Comp)
    return (
      <div className="diagram diagram--error" role="alert">
        Unknown diagram “{id}”.
      </div>
    );
  return (
    <DiagramBoundary id={id}>
      <Suspense fallback={<div className="diagram diagram--loading" aria-busy="true" />}>
        <Comp meta={meta} />
      </Suspense>
    </DiagramBoundary>
  );
}
