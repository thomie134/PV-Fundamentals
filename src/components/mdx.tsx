/** Components available inside every .mdx content file (no imports needed). */
import { isValidElement, type ComponentProps, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Concept, Ctx, Diagram, Flag, GoDeeper, Hint, KeyIdea, Note } from './Blocks';
import { F, Formula } from './Formula';
import { Term } from './Term';

function MathCode(props: ComponentProps<'code'>) {
  const cls = props.className ?? '';
  if (cls.includes('math-inline')) return <Formula tex={String(props.children)} />;
  if (cls.includes('math-display')) return <Formula tex={String(props.children)} display />;
  return <code {...props} />;
}

function MathPre(props: ComponentProps<'pre'>) {
  const child = props.children as ReactNode;
  if (isValidElement(child)) {
    const p = child.props as { className?: string; children?: ReactNode };
    if (p.className?.includes('math-display')) return <Formula tex={String(p.children)} display />;
  }
  return <pre {...props} />;
}

/** Internal links ("/foundations/units", "#concept") use the router; external links open in a new tab. */
function A({ href = '', children, ...rest }: ComponentProps<'a'>) {
  if (href.startsWith('/')) return <Link to={href}>{children}</Link>;
  if (href.startsWith('#')) return <a href={href} {...rest}>{children}</a>;
  return (
    <a href={href} target="_blank" rel="noreferrer" {...rest}>
      {children}
    </a>
  );
}

function Table(props: ComponentProps<'table'>) {
  return (
    <div className="table-wrap">
      <table {...props} />
    </div>
  );
}

export const mdxComponents = {
  code: MathCode,
  pre: MathPre,
  table: Table,
  a: A,
  Term,
  T: Term,
  Formula,
  F,
  Concept,
  Ctx,
  Diagram,
  GoDeeper,
  Hint,
  KeyIdea,
  Note,
  Flag,
};
