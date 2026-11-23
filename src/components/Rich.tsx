/**
 * Rich text for content stored in JSON (questions, glossary, examples).
 * Supports: $inline math$, $$display math$$ (own paragraph), **bold**, *italic*,
 * [[term-id]] / [[term-id|shown text]] glossary terms, [text](/internal-or-https-link),
 * "- " bullet lists and "1. " numbered lists. Blank line = new paragraph.
 */
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { SymbolContext } from '@/lib/types';
import { Formula } from './Formula';
import { Term } from './Term';

const INLINE = /(\$[^$]+\$)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[\[[^\]]+\]\])|(\[[^\]]+\]\([^)\s]+\))/g;

export function renderInline(text: string, ctx?: SymbolContext): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(INLINE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const tok = m[0];
    if (m[1]) out.push(<Formula key={k++} tex={tok.slice(1, -1)} ctx={ctx} />);
    else if (m[2]) out.push(<strong key={k++}>{renderInline(tok.slice(2, -2), ctx)}</strong>);
    else if (m[3]) out.push(<em key={k++}>{renderInline(tok.slice(1, -1), ctx)}</em>);
    else if (m[4]) {
      const [id, shown] = tok.slice(2, -2).split('|');
      out.push(
        <Term key={k++} id={id.trim()}>
          {shown?.trim()}
        </Term>,
      );
    } else if (m[5]) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      const [, label, href] = lm;
      out.push(
        href.startsWith('/') ? (
          <Link key={k++} to={href}>
            {renderInline(label, ctx)}
          </Link>
        ) : (
          <a key={k++} href={href} target="_blank" rel="noreferrer">
            {renderInline(label, ctx)}
          </a>
        ),
      );
    }
    last = i + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Rich({ text, ctx, inline = false, className }: { text: string; ctx?: SymbolContext; inline?: boolean; className?: string }) {
  if (inline) return <span className={className}>{renderInline(text, ctx)}</span>;
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className={['rich', className].filter(Boolean).join(' ')}>
      {blocks.map((b, i) => {
        const t = b.trim();
        if (t.startsWith('$$') && t.endsWith('$$') && t.length > 4) return <Formula key={i} tex={t.slice(2, -2).trim()} display ctx={ctx} />;
        const lines = t.split('\n');
        if (lines.every((l) => /^\s*-\s+/.test(l)))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*-\s+/, ''), ctx)}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\s*\d+\.\s+/.test(l)))
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*\d+\.\s+/, ''), ctx)}</li>
              ))}
            </ol>
          );
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l, ctx)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
