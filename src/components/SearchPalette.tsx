/**
 * Global search palette: ⌘K / Ctrl+K or "/" opens it, arrows move, Enter opens, Escape closes.
 * Full-screen sheet on phones.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { search, type SearchItem } from '@/lib/search';
import { Tex } from './Math';

const SUGGESTIONS = ['Fermi level', 'diffusion length', 'Snell', 'photon flux', 'law of mass action', 'lifetime', 'anti-reflective coating', 'quasi-Fermi'];

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const groups = useMemo(() => search(q), [q]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (open) {
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.select());
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (item: SearchItem) => {
    onClose();
    navigate(item.href);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    }
  };

  let idx = -1;
  return (
    <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search the site" onKeyDown={onKey}>
        <div className="palette__bar">
          <span aria-hidden className="palette__icon">
            ⌕
          </span>
          <input
            ref={inputRef}
            className="palette__input"
            type="search"
            placeholder="Search concepts, terms, formulas, diagrams, questions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="palette-results"
            aria-activedescendant={flat[active] ? `pal-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="btn btn--ghost btn--small palette__close" onClick={onClose}>
            Esc
          </button>
        </div>
        <div className="palette__results" id="palette-results" role="listbox" ref={listRef}>
          {!q.trim() && (
            <div className="palette__empty">
              <p className="muted small">Try:</p>
              <div className="chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => setQ(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {q.trim() && flat.length === 0 && <p className="palette__empty muted">No results for “{q}”. Try a shorter word or a symbol name.</p>}
          {groups.map((g) => (
            <div key={g.kind} className="palette__group" role="group" aria-label={g.label}>
              <div className="palette__group-label">{g.label}</div>
              {g.items.map((item) => {
                idx += 1;
                const i = idx;
                return (
                  <div
                    key={item.kind + item.href + item.title}
                    id={`pal-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={`palette__item ${i === active ? 'is-active' : ''}`}
                    onMouseMove={() => i !== active && setActive(i)}
                    onClick={() => go(item)}
                  >
                    <span className="palette__title">
                      {item.title}
                      {item.tex && item.tex.length < 70 && (
                        <span className="palette__tex">
                          <Tex tex={item.tex} />
                        </span>
                      )}
                    </span>
                    <span className="palette__sub">{item.sub}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="palette__foot muted small">
          <span>↑↓ to move</span>
          <span>Enter to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}

/** Global shortcut: ⌘K / Ctrl+K anywhere, "/" when not typing. */
export function useSearchShortcut(setOpen: (o: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
}
