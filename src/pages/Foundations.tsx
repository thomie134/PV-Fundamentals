import { Suspense, lazy, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SymbolCtx } from '@/components/contexts';
import { useTrackVisit } from '@/components/Layout';
import { QuestionCard } from '@/components/Question';
import { Term, TermScope } from '@/components/Term';
import { foundationById, foundations, glossaryById, loadFoundationLesson, weekPath, getWeek } from '@/lib/content';
import { lookupStore, useStore } from '@/lib/storage';
import { NotFound } from './NotFound';

export function FoundationsIndex() {
  useTrackVisit('Foundations');
  const lookups = useStore(lookupStore);
  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Background knowledge</span>
        <h1>Foundations</h1>
        <p className="lede">Short refreshers on the maths and physics the course takes for granted. Each has a small interactive and a few quick checks.</p>
      </header>
      <ul className="grid-cards foundation-cards">
        {foundations.map((f) => {
          const hits = f.terms.reduce((s, t) => s + (lookups[t] ?? 0), 0);
          return (
            <li key={f.id}>
              <Link to={`/foundations/${f.id}`} className="card card--link">
                <span className="eyebrow">Lesson {f.order}</span>
                <h2 className="card__title">{f.title}</h2>
                <p className="card__text">{f.summary}</p>
                <span className="card__meta muted small">
                  Used in week {f.weeks.join(', ')}
                  {hits > 0 && ` · you looked up its terms ${hits}×`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FoundationPage() {
  const { id = '' } = useParams();
  const meta = foundationById.get(id);
  const loader = loadFoundationLesson(id);
  const Lesson = useMemo(() => (loader ? lazy(loader) : null), [loader]);
  useTrackVisit(meta ? `Foundations: ${meta.title}` : 'Foundations');
  if (!meta) return <NotFound />;
  const idx = foundations.findIndex((f) => f.id === id);
  const next = foundations[idx + 1];
  return (
    <div className="page page--narrow">
      <header className="page-header">
        <Link to="/foundations" className="small">
          ← All Foundations
        </Link>
        <span className="eyebrow" style={{ display: 'block', marginTop: 'var(--space-4)' }}>
          Foundations · lesson {meta.order}
        </span>
        <h1>{meta.title}</h1>
        <p className="lede">{meta.summary}</p>
        <p className="small muted">
          Needed in{' '}
          {meta.weeks.map((w, i) => (
            <span key={w}>
              {i > 0 && ', '}
              {getWeek(w) ? <Link to={weekPath(w)}>week {w}</Link> : <span title="Not published yet">week {w}</span>}
            </span>
          ))}
        </p>
      </header>
      <TermScope>
        <SymbolCtx.Provider value="math">
          <div className="prose">
            <Suspense fallback={<p className="muted">Loading…</p>}>{Lesson && <Lesson />}</Suspense>
          </div>
        </SymbolCtx.Provider>
      </TermScope>
      {meta.checks.length > 0 && (
        <section className="section">
          <div className="section-title">
            <h2>Quick check</h2>
          </div>
          <div className="stack-lg">
            {meta.checks.map((q, i) => (
              <QuestionCard key={q.id} question={q} number={i + 1} ctx={meta.context ?? 'math'} />
            ))}
          </div>
        </section>
      )}
      {meta.terms.length > 0 && (
        <section className="section">
          <div className="section-title">
            <h2>Terms in this lesson</h2>
          </div>
          <TermScope>
            <ul className="chips chips--terms">
              {meta.terms.map((t) => (
                <li key={t}>
                  <Term id={t} always>
                    {glossaryById.get(t)?.term ?? t}
                  </Term>
                </li>
              ))}
            </ul>
          </TermScope>
        </section>
      )}
      {next && (
        <nav className="week-nav">
          <span />
          <Link to={`/foundations/${next.id}`}>Next lesson: {next.title} →</Link>
        </nav>
      )}
    </div>
  );
}
