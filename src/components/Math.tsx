import katex from 'katex';
import { useMemo } from 'react';

/** Plain KaTeX rendering without symbol hover (used inside popovers and labels). */
export function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => renderTex(tex, display), [tex, display]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function renderTex(tex: string, display = false): string {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
    trust: (ctx) => ctx.command === '\\htmlData',
  });
}
