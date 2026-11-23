import { useEffect, useRef, useState } from 'react';

export interface NavItem {
  id: string;
  label: string;
  /** Optional count shown after the label (e.g. "4/27" questions). */
  meta?: string;
  children?: { id: string; label: string }[];
}

/**
 * Scroll-spy: returns the id of the last element (in `ids` order) whose top has passed the
 * reading line just below the sticky header, plus overall reading progress 0–1.
 * Elements that mount late (lazy MDX) are picked up because ids are re-queried on every frame.
 */
export function useScrollSpy(ids: string[], offset = 120) {
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const key = ids.join('|');

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | null = null;
      let best = -Infinity;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        // Last heading above the reading line wins; ties resolved by document position.
        if (top - offset <= 0 && top > best) {
          best = top;
          current = id;
        }
      }
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      // At the very bottom, short final sections can never reach the reading line: select the last one.
      if (max > 0 && window.scrollY >= max - 2) current = ids.filter((id) => document.getElementById(id)).at(-1) ?? current;
      setActive(current ?? ids[0] ?? null);
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Content (MDX, diagrams) loads lazily and shifts positions: re-check when the DOM grows.
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, offset]);

  return { active, progress };
}

/** Desktop sidebar + mobile “On this page” bar, both driven by the same scroll-spy. */
export function PageNav({ items, eyebrow }: { items: NavItem[]; eyebrow: string }) {
  const ids = items.flatMap((t) => [t.id, ...(t.children?.map((c) => c.id) ?? [])]);
  const { active, progress } = useScrollSpy(ids);
  const activeTop = items.find((t) => t.id === active || t.children?.some((c) => c.id === active));
  const activeChild = activeTop?.children?.find((c) => c.id === active);
  const sideRef = useRef<HTMLElement>(null);

  // Keep the highlighted entry visible when the sidebar itself scrolls.
  useEffect(() => {
    const box = sideRef.current;
    const el = box?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!box || !el) return;
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.top < b.top + 40 || r.bottom > b.bottom - 40) box.scrollTo({ top: box.scrollTop + r.top - b.top - b.height / 3 });
  }, [active]);

  const index = activeTop ? items.indexOf(activeTop) : 0;

  return (
    <>
      <aside className="toc" aria-label="On this page" ref={sideRef}>
        <span className="eyebrow">{eyebrow}</span>
        <div className="toc__progress" aria-hidden>
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <ol>
          {items.map((t, i) => {
            const isActive = t === activeTop;
            const done = i < index;
            return (
              <li key={t.id} className={`toc__item${isActive ? ' is-active' : ''}${done ? ' is-done' : ''}`}>
                <a href={`#${t.id}`} aria-current={t.id === active ? 'location' : undefined}>
                  <span className="toc__num" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="toc__label">{t.label}</span>
                  {t.meta && <span className="toc__meta">{t.meta}</span>}
                </a>
                {t.children && isActive && (
                  <ol className="toc__sub">
                    {t.children.map((c) => (
                      <li key={c.id}>
                        <a href={`#${c.id}`} aria-current={c.id === active ? 'location' : undefined}>
                          {c.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      </aside>
      <MobileNav items={items} index={index} activeTop={activeTop} activeChild={activeChild} active={active} progress={progress} />
    </>
  );
}

function MobileNav({
  items,
  index,
  activeTop,
  activeChild,
  active,
  progress,
}: {
  items: NavItem[];
  index: number;
  activeTop?: NavItem;
  activeChild?: { id: string; label: string };
  active: string | null;
  progress: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div className="pagenav" ref={ref}>
      <button type="button" className="pagenav__bar" aria-expanded={open} aria-controls="pagenav-list" onClick={() => setOpen((o) => !o)}>
        <span className="pagenav__step">
          {index + 1}/{items.length}
        </span>
        <span className="pagenav__label">
          {activeTop?.label ?? items[0]?.label}
          {activeChild && <span className="pagenav__child"> · {activeChild.label}</span>}
        </span>
        <span className="pagenav__chev" aria-hidden>
          ▾
        </span>
        <span className="pagenav__progress" aria-hidden style={{ transform: `scaleX(${progress})` }} />
      </button>
      {open && (
        <ol id="pagenav-list" className="pagenav__list">
          {items.map((t, i) => (
            <li key={t.id}>
              <a href={`#${t.id}`} onClick={() => setOpen(false)} aria-current={t === activeTop ? 'location' : undefined} className={t === activeTop ? 'is-active' : undefined}>
                <span className="toc__num" aria-hidden>
                  {i + 1}
                </span>
                <span className="toc__label">{t.label}</span>
                {t.meta && <span className="toc__meta">{t.meta}</span>}
              </a>
              {t.children && t === activeTop && (
                <ol className="pagenav__sub">
                  {t.children.map((c) => (
                    <li key={c.id}>
                      <a href={`#${c.id}`} onClick={() => setOpen(false)} className={c.id === active ? 'is-active' : undefined}>
                        {c.label}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
