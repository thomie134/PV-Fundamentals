import { createContext, useContext } from 'react';
import type { SymbolContext, WeekMeta } from '@/lib/types';

/** Which meaning formula symbols have in this part of the page. */
export const SymbolCtx = createContext<SymbolContext>('general');
export const useSymbolContext = () => useContext(SymbolCtx);

/**
 * Registry used to underline only the first occurrence of a term per section.
 * Terms register their DOM element after mount; the first one in document order wins.
 * (Decided after mount, so it is robust to lazy loading, StrictMode and collapsed blocks.)
 */
export class TermRegistry {
  private map = new Map<string, Map<HTMLElement, (first: boolean) => void>>();
  register(id: string, el: HTMLElement, cb: (first: boolean) => void) {
    const m = this.map.get(id) ?? new Map<HTMLElement, (first: boolean) => void>();
    m.set(el, cb);
    this.map.set(id, m);
    this.update(id);
    return () => {
      m.delete(el);
      this.update(id);
    };
  }
  private update(id: string) {
    const m = this.map.get(id);
    if (!m) return;
    const els = [...m.keys()].filter((e) => e.isConnected);
    els.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    for (const [el, cb] of m) cb(el === els[0]);
  }
}
export const TermScopeCtx = createContext<TermRegistry | null>(null);

export const WeekCtx = createContext<WeekMeta | null>(null);
export const useWeek = () => useContext(WeekCtx);
