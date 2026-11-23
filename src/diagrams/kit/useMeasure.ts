import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Measure an element's content box; re-renders on resize. */
export function useMeasure<T extends HTMLElement>(): [(el: T | null) => void, { width: number; height: number }] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [el, setEl] = useState<T | null>(null);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: T | null) => setEl(node), []);
  useLayoutEffect(() => {
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (Math.abs(s.width - r.width) < 0.5 && Math.abs(s.height - r.height) < 0.5 ? s : { width: r.width, height: r.height }));
    };
    update();
    ro.current = new ResizeObserver(update);
    ro.current.observe(el);
    return () => ro.current?.disconnect();
  }, [el]);
  return [ref, size];
}
