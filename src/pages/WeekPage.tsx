import { Suspense, lazy, useMemo, type ComponentType } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GoDeeper, StepReveal } from '@/components/Blocks';
import { SymbolCtx, WeekCtx } from '@/components/contexts';
import { useTrackVisit } from '@/components/Layout';
import { QuestionCard } from '@/components/Question';
import { PageNav, type NavItem } from '@/components/PageNav';
import { Rich } from '@/components/Rich';
import { Term, TermScope } from '@/components/Term';
import {
  diagramMeta,
  examplesForWeek,
  findConcept,
  foundationById,
  getWeek,
  glossaryById,
  loadConcepts,
  loadIntuition,
  misconceptionsForWeek,
  questionsForWeek,
  weekPath,
  weeks,
} from '@/lib/content';
import { progressStore, useStore } from '@/lib/storage';
import type { WeekMeta, WeekNote, WorkedExample } from '@/lib/types';
import { NotFound } from './NotFound';

const NOTE_LABEL: Record<WeekNote['type'], string> = {
  difference: 'Lecture vs book',
  erratum: 'Erratum in source',
  flag: 'Uncertain / check',
  external: 'External source',
};

export function WeekPage() {
  const n = Number(useParams().n);
  const week = getWeek(n);
  if (!week) return <NotFound />;
  return <WeekContent key={n} week={week} />;
}

function useLazyMdx(loader: (() => Promise<{ default: ComponentType }>) | undefined) {
  return useMemo(() => (loader ? lazy(loader) : null), [loader]);
}

function WeekContent({ week }: { week: WeekMeta & { diagrams?: { id: string }[] } }) {
  useTrackVisit(`Week ${week.week}: ${week.title}`);
  const Intuition = useLazyMdx(loadIntuition(week.week));
  const Concepts = useLazyMdx(loadConcepts(week.week));
  const questions = questionsForWeek(week.week);
  const examples = examplesForWeek(week.week);
  const misconceptions = misconceptionsForWeek(week.week);
  const progress = useStore(progressStore);
  const answered = questions.filter((q) => progress[q.id]).length;
  const correct = questions.filter((q) => progress[q.id]?.correct).length;
  const diagrams = (week.diagrams ?? []).map((d) => diagramMeta(d.id)!).filter(Boolean);
  const prevWeek = weeks.find((w) => w.week === week.week - 1);
  const nextWeek = weeks.find((w) => w.week === week.week + 1);

  const toc: NavItem[] = [
    { id: 'before', label: 'Before you start' },
    { id: 'intuition', label: 'Intuition first' },
    { id: 'concepts', label: 'Key concepts', children: week.concepts.map((c) => ({ id: c.id, label: c.title })) },
    { id: 'diagrams', label: 'Interactive diagrams', meta: String(diagrams.length) },
    { id: 'misconceptions', label: 'Common misconceptions', meta: String(misconceptions.length) },
    { id: 'examples', label: 'Worked examples', meta: String(examples.length) },
    { id: 'practice', label: 'Practice questions', meta: `${correct}/${questions.length}` },
    { id: 'sources', label: 'Sources & notes' },
  ];

  return (
    <WeekCtx.Provider value={week}>
      <div className="week-layout">
        <PageNav items={toc} eyebrow={`Week ${week.week}`} />

        <article className="week">
          <header className="page-header week__header">
            <span className="eyebrow">
              Week {week.week} · {week.chapters} · lecture {week.lectureDate}
            </span>
            <h1>{week.title}</h1>
            <p className="lede">{week.subtitle}</p>
            {questions.length > 0 && (
              <div className="week__progress" aria-label={`${answered} of ${questions.length} practice questions answered, ${correct} correct`}>
                <div className="progress">
                  <span style={{ width: `${(correct / questions.length) * 100}%` }} className="progress__good" />
                  <span style={{ width: `${((answered - correct) / questions.length) * 100}%` }} className="progress__bad" />
                </div>
                <span className="muted">
                  {correct}/{questions.length} questions correct
                </span>
              </div>
            )}
          </header>

          {/* 1. Before you start */}
          <section id="before" className="section">
            <SectionTitle n={1} title="Before you start" />
            <TermScope>
              <div className="before">
                <div>
                  <h3 className="before__h">Terms this week assumes</h3>
                  <p className="muted small">Hover or tap to refresh each one.</p>
                  <ul className="chips chips--terms">
                    {week.prerequisites.terms.map((t) => (
                      <li key={t}>
                        <Term id={t} always>
                          {glossaryById.get(t)?.term ?? t}
                        </Term>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="before__h">Foundations to refresh</h3>
                  <ul className="link-list">
                    {week.prerequisites.foundations.map((id) => {
                      const f = foundationById.get(id);
                      return f ? (
                        <li key={id}>
                          <Link to={`/foundations/${id}`}>{f.title}</Link>
                          <span className="muted"> — {f.summary}</span>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
                {week.prerequisites.skills.length > 0 && (
                  <div>
                    <h3 className="before__h">Skills you will use</h3>
                    <ul className="checklist">
                      {week.prerequisites.skills.map((s) => (
                        <li key={s}>
                          <Rich text={s} inline ctx="math" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </TermScope>
          </section>

          {/* 2. Intuition */}
          <section id="intuition" className="section">
            <SectionTitle n={2} title="Intuition first" />
            <TermScope>
              <SymbolCtx.Provider value="general">
                <div className="prose intuition">
                  <Suspense fallback={<p className="muted">Loading…</p>}>{Intuition && <Intuition />}</Suspense>
                </div>
              </SymbolCtx.Provider>
            </TermScope>
          </section>

          {/* 3 + 4. Key concepts with diagrams inline */}
          <section id="concepts" className="section">
            <SectionTitle n={3} title="Key concepts" />
            <p className="section-intro muted">
              Each concept comes with its interactive diagram right where it is explained. Expand <em>Go deeper</em> blocks for derivations and
              book references.
            </p>
            <Suspense fallback={<p className="muted">Loading concepts…</p>}>{Concepts && <Concepts />}</Suspense>
          </section>

          <section id="diagrams" className="section">
            <SectionTitle n={4} title="Interactive diagrams" />
            <p className="section-intro muted">All diagrams of this week. They live inside the concept they belong to.</p>
            <ul className="diagram-index">
              {diagrams.map((d) => {
                const c = d.concept ? findConcept(d.concept) : undefined;
                return (
                  <li key={d.id}>
                    <a href={`#diagram-${d.id}`} className="diagram-index__card">
                      <span className="diagram-index__title">{d.title}</span>
                      <span className="diagram-index__try">{d.tryThis}</span>
                      {c && <span className="muted small">in “{c.concept.title}”</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 5. Misconceptions */}
          <section id="misconceptions" className="section">
            <SectionTitle n={5} title="Common misconceptions" />
            <TermScope>
              <ul className="misconceptions">
                {misconceptions.map((m) => {
                  const c = m.concept ? findConcept(m.concept) : undefined;
                  const f = m.foundation ? foundationById.get(m.foundation) : undefined;
                  return (
                    <li key={m.id} className="misconception">
                      <p className="misconception__wrong">
                        <span aria-hidden>✗</span> <Rich text={m.wrong} inline ctx={c?.concept.context} />
                      </p>
                      <p className="misconception__right">
                        <span aria-hidden>✓</span> <Rich text={m.right} inline ctx={c?.concept.context} />
                      </p>
                      {m.tip && <p className="misconception__tip muted">{m.tip}</p>}
                      {(c || f) && (
                        <p className="misconception__links small">
                          {c && <a href={`#${c.concept.id}`}>Concept: {c.concept.title}</a>}
                          {f && <Link to={`/foundations/${f.id}`}>Foundations: {f.title}</Link>}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </TermScope>
          </section>

          {/* 6. Worked examples */}
          <section id="examples" className="section">
            <SectionTitle n={6} title="Worked examples" />
            <p className="section-intro muted">From the instruction session. Try each step yourself before revealing it.</p>
            <div className="stack-lg">
              {examples.map((ex) => (
                <ExampleCard key={ex.id} ex={ex} />
              ))}
            </div>
          </section>

          {/* 7. Practice */}
          <section id="practice" className="section">
            <SectionTitle n={7} title="Practice questions" />
            <p className="section-intro muted">
              Concept checks, numeric questions and exam-style questions modelled on the instruction session. Your progress is saved in this browser.
            </p>
            <div className="stack-lg">
              {questions.map((q, i) => (
                <QuestionCard key={q.id} question={q} number={i + 1} />
              ))}
            </div>
          </section>

          {/* 8. Sources */}
          <section id="sources" className="section">
            <SectionTitle n={8} title="Sources & notes" />
            <div className="table-wrap">
              <table className="sources-table">
                <thead>
                  <tr>
                    <th>Concept</th>
                    <th>Lecture</th>
                    <th>Instruction</th>
                    <th>Book & other</th>
                  </tr>
                </thead>
                <tbody>
                  {week.concepts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <a href={`#${c.id}`}>{c.title}</a>
                      </td>
                      <td>{c.sources.filter((s) => s.kind === 'lecture').map((s) => s.ref).join('; ') || '–'}</td>
                      <td>{c.sources.filter((s) => s.kind === 'instruction').map((s) => s.ref).join('; ') || '–'}</td>
                      <td>
                        {c.sources
                          .filter((s) => !['lecture', 'instruction'].includes(s.kind))
                          .map((s) => s.ref)
                          .join('; ') || '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {week.notes.length > 0 && (
              <>
                <h3 className="notes-title">Flags: where sources differ or contain errors</h3>
                <ul className="notes">
                  {week.notes.map((note, i) => (
                    <li key={i} className={`note note--${note.type}`}>
                      <span className="badge">{NOTE_LABEL[note.type]}</span>
                      <Rich text={note.text} inline />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <nav className="week-nav" aria-label="Week navigation">
            {prevWeek ? <Link to={weekPath(prevWeek.week)}>← Week {prevWeek.week}: {prevWeek.title}</Link> : <span />}
            {nextWeek && <Link to={weekPath(nextWeek.week)}>Week {nextWeek.week}: {nextWeek.title} →</Link>}
          </nav>
        </article>
      </div>
    </WeekCtx.Provider>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="section-title">
      <span className="section-num" aria-hidden>
        {n}
      </span>
      <h2>{title}</h2>
    </div>
  );
}

function ExampleCard({ ex }: { ex: WorkedExample }) {
  return (
    <article className="example" id={`example-${ex.id}`}>
      <TermScope>
        <SymbolCtx.Provider value={ex.context}>
          <header className="example__head">
            <span className="eyebrow">{ex.source}</span>
            <h3>{ex.title}</h3>
          </header>
          <Rich text={ex.prompt} ctx={ex.context} className="example__prompt" />
          <StepReveal
            steps={ex.steps.map((s) => ({
              title: s.title,
              body: <Rich text={s.body} ctx={ex.context} />,
              why: s.why ? <Rich text={s.why} ctx={ex.context} /> : undefined,
            }))}
            answer={
              <>
                <span className="eyebrow">Answer</span>
                <Rich text={ex.answer} ctx={ex.context} />
              </>
            }
          />
          {ex.note && (
            <GoDeeper title="Note on the official answer" kind="book">
              <Rich text={ex.note} ctx={ex.context} />
            </GoDeeper>
          )}
        </SymbolCtx.Provider>
      </TermScope>
    </article>
  );
}
