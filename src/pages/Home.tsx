import { Link } from 'react-router-dom';
import { allQuestions, foundationById, glossaryById, questionsForWeek, weekPath, weeks } from '@/lib/content';
import { examStore, lastVisitedStore, lookupStore, progressStore, useStore } from '@/lib/storage';

const PLANNED = [
  { week: 4, title: 'p-n junction (dark)', chapters: 'Ch. 8' },
  { week: 5, title: 'p-n junction (light)', chapters: 'Ch. 9' },
  { week: 6, title: 'Losses & limits', chapters: 'Ch. 10' },
  { week: 7, title: 'PV system design', chapters: 'Ch. 20' },
  { week: 8, title: 'Energy transition (bonus)', chapters: '–' },
];

export function Home() {
  const progress = useStore(progressStore);
  const lookups = useStore(lookupStore);
  const { last } = useStore(lastVisitedStore);
  const topTerms = Object.entries(lookups)
    .filter(([id]) => glossaryById.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const missed = Object.entries(progress).filter(([, r]) => r.missed).length;
  const examDays = Math.max(0, Math.ceil((new Date('2027-01-25T09:00:00').getTime() - Date.now()) / 86400000));

  return (
    <div className="page">
      <header className="page-header home-hero">
        <span className="eyebrow">TU Delft · SET4376 · exam 25 January 2027 ({examDays} days)</span>
        <h1>PV Fundamentals, interactively</h1>
        <p className="lede">Play with the physics of solar cells: change a slider, watch the formula respond, then test yourself with exam-style questions.</p>
        <div className="row hero-actions">
          {last ? (
            <Link to={last.path} className="btn btn--primary">
              Continue: {last.title} →
            </Link>
          ) : (
            <Link to={weekPath(weeks[0]?.week ?? 1)} className="btn btn--primary">
              Start with week 1 →
            </Link>
          )}
          <Link to="/foundations" className="btn">
            Refresh the basics
          </Link>
        </div>
      </header>

      <Dashboard />

      <section className="section">
        <div className="section-title">
          <h2>Weeks</h2>
        </div>
        <ul className="grid-cards">
          {weeks.map((w) => {
            const qs = questionsForWeek(w.week);
            const done = qs.filter((q) => progress[q.id]?.correct).length;
            const wrong = qs.filter((q) => progress[q.id] && !progress[q.id].correct).length;
            return (
              <li key={w.week}>
                <Link to={weekPath(w.week)} className="card card--link week-card">
                  <span className="eyebrow">
                    Week {w.week} · {w.chapters}
                  </span>
                  <h3 className="card__title">{w.title}</h3>
                  <p className="card__text">{w.subtitle}</p>
                  <div className="progress" aria-hidden>
                    <span className="progress__good" style={{ width: `${qs.length ? (done / qs.length) * 100 : 0}%` }} />
                    <span className="progress__bad" style={{ width: `${qs.length ? (wrong / qs.length) * 100 : 0}%` }} />
                  </div>
                  <span className="card__meta muted small">
                    {done}/{qs.length} correct{w.status === 'draft' ? ' · draft' : ''}
                  </span>
                </Link>
              </li>
            );
          })}
          {PLANNED.filter((p) => !weeks.some((w) => w.week === p.week)).map((p) => (
            <li key={p.week}>
              <div className="card card--planned" aria-disabled>
                <span className="eyebrow">
                  Week {p.week} · {p.chapters}
                </span>
                <h3 className="card__title">{p.title}</h3>
                <p className="card__text muted">Added when the material is released.</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="home-cols section">
        <section className="card">
          <h2 className="card__title">Terms you keep looking up</h2>
          {topTerms.length === 0 ? (
            <p className="muted">Nothing yet. Hover or tap the blue terms while you study; the ones you open most will show up here.</p>
          ) : (
            <ul className="lookup-list">
              {topTerms.map(([id, n]) => {
                const g = glossaryById.get(id)!;
                const f = g.foundation ? foundationById.get(g.foundation) : undefined;
                return (
                  <li key={id}>
                    <Link to={`/glossary#${id}`}>{g.term}</Link>
                    <span className="muted small"> · {n}×</span>
                    {f && (
                      <Link to={`/foundations/${f.id}`} className="small lookup-list__f">
                        Refresh: {f.title}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="card__title">Quick links</h2>
          <ul className="link-list">
            <li>
              <Link to="/glossary">Glossary</Link> <span className="muted">· every term, searchable</span>
            </li>
            <li>
              <Link to="/foundations">Foundations</Link> <span className="muted">· maths & physics refreshers</span>
            </li>
            <li>
              <Link to="/formulas">Formulas & constants</Link> <span className="muted">· what is on the equation sheet</span>
            </li>
            <li>
              <Link to="/practice?mode=missed">Review missed</Link> <span className="muted">· {missed} question{missed === 1 ? '' : 's'}</span>
            </li>
            <li>
              <Link to="/style-guide">Style guide</Link> <span className="muted">· design tokens & diagram rules</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

function Dashboard() {
  const progress = useStore(progressStore);
  const { exams } = useStore(examStore);
  const total = allQuestions.length;
  const answered = allQuestions.filter((q) => progress[q.id]).length;
  const correct = allQuestions.filter((q) => progress[q.id]?.correct).length;
  const missed = allQuestions.filter((q) => progress[q.id]?.missed).length;
  const attempts = allQuestions.reduce((s, q) => s + (progress[q.id]?.attempts ?? 0), 0);
  const firstTry = allQuestions.filter((q) => progress[q.id]?.correct && (progress[q.id]?.wrongs ?? 0) === 0).length;
  const last = exams[0];

  // Concept mastery: share of a concept's questions answered correctly (latest attempt).
  const concepts = weeks.flatMap((w) =>
    w.concepts.map((c) => {
      const qs = allQuestions.filter((q) => q.concept === c.id);
      const got = qs.filter((q) => progress[q.id]?.correct).length;
      const tried = qs.filter((q) => progress[q.id]).length;
      const wrongs = qs.reduce((s, q) => s + (progress[q.id]?.wrongs ?? 0), 0);
      const open = qs.filter((q) => progress[q.id]?.missed).length;
      return { w, c, qs: qs.length, got, tried, wrongs, open };
    }),
  );
  const weak = concepts
    .filter((x) => x.open > 0 || (x.wrongs > 0 && x.got < x.qs))
    .sort((a, b) => b.open - a.open || b.wrongs - a.wrongs || a.got / a.qs - b.got / b.qs)
    .slice(0, 5);

  return (
    <section className="section dashboard" aria-label="Your progress">
      <div className="stat-row">
        <div className="stat">
          <span className="stat__value num">
            {correct}
            <span className="stat__of">/{total}</span>
          </span>
          <span className="stat__label">questions correct</span>
          <div className="progress" aria-hidden>
            <span className="progress__good" style={{ width: `${(100 * correct) / Math.max(1, total)}%` }} />
            <span className="progress__bad" style={{ width: `${(100 * (answered - correct)) / Math.max(1, total)}%` }} />
          </div>
        </div>
        <div className="stat">
          <span className="stat__value num">{answered ? Math.round((100 * firstTry) / answered) : 0} %</span>
          <span className="stat__label">right first time</span>
          <span className="muted small">
            {attempts} attempt{attempts === 1 ? '' : 's'} in total
          </span>
        </div>
        <Link to="/practice?mode=missed" className="stat stat--link">
          <span className="stat__value num">{missed}</span>
          <span className="stat__label">to review →</span>
          <span className="muted small">answered wrong last time</span>
        </Link>
        <Link to="/practice?mode=exam" className="stat stat--link">
          <span className="stat__value num">{last ? `${Math.round((100 * last.earned) / Math.max(1, last.max))} %` : '–'}</span>
          <span className="stat__label">{last ? 'last exam simulation →' : 'try an exam simulation →'}</span>
          <span className="muted small">{last ? `${exams.length} taken · weeks ${last.weeks.join(', ')}` : 'timed, no hints'}</span>
        </Link>
      </div>

      <div className="home-cols">
        <div className="card">
          <h2 className="card__title">Mastery per concept</h2>
          <p className="muted small">Share of each concept’s practice questions you answered correctly (latest attempt).</p>
          {weeks.map((w) => (
            <div key={w.week} className="mastery-week">
              <Link to={weekPath(w.week)} className="mastery-week__title">
                Week {w.week}: {w.title}
              </Link>
              <ul className="mastery">
                {concepts
                  .filter((x) => x.w.week === w.week && x.qs > 0)
                  .map((x) => (
                    <li key={x.c.id}>
                      <Link to={`${weekPath(w.week)}#${x.c.id}`} className="mastery__name">
                        {x.c.title}
                      </Link>
                      <span className="progress progress--inline" aria-hidden>
                        <span className="progress__good" style={{ width: `${(100 * x.got) / x.qs}%` }} />
                        <span className="progress__bad" style={{ width: `${(100 * (x.tried - x.got)) / x.qs}%` }} />
                      </span>
                      <span className="num small mastery__count">
                        {x.got}/{x.qs}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="stack">
          <div className="card">
            <h2 className="card__title">Weak spots</h2>
            {weak.length === 0 ? (
              <p className="muted">No weak spots yet. Answer some practice questions and the concepts that trip you up show here.</p>
            ) : (
              <ul className="link-list">
                {weak.map((x) => (
                  <li key={x.c.id}>
                    <Link to={`${weekPath(x.w.week)}#${x.c.id}`}>{x.c.title}</Link>
                    <span className="muted small">
                      {' '}
                      · week {x.w.week} · {x.open > 0 ? `${x.open} to review` : `${x.wrongs} wrong attempt${x.wrongs === 1 ? '' : 's'} before`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h2 className="card__title">Practise</h2>
            <ul className="practice-links">
              <li>
                <Link to="/practice?mode=mixed" className="btn btn--primary">
                  Mixed practice
                </Link>
                <span className="muted small">random questions from the weeks you choose</span>
              </li>
              <li>
                <Link to="/practice?mode=missed" className="btn">
                  Review missed ({missed})
                </Link>
                <span className="muted small">until you get them right</span>
              </li>
              <li>
                <Link to="/practice?mode=exam" className="btn">
                  Exam simulation
                </Link>
                <span className="muted small">timed, no hints, scored</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
