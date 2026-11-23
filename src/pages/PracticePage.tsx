/**
 * Practice hub: mixed practice, review of missed questions, a timed exam simulation and
 * single-question deep links (?q=<id>). All state is local; progress goes to localStorage.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QuestionCard, questionPoints } from '@/components/Question';
import { useTrackVisit } from '@/components/Layout';
import { allQuestions, findConcept, questionById, weekPath, weeks } from '@/lib/content';
import { examStore, progressStore, recordAnswer, useStore, type ExamRecord } from '@/lib/storage';
import type { Question } from '@/lib/types';

type Mode = 'mixed' | 'missed' | 'exam';
type TypeFilter = 'all' | Question['type'];

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function PracticePage() {
  useTrackVisit('Practice');
  const [params, setParams] = useSearchParams();
  const single = params.get('q');
  const mode = (params.get('mode') as Mode) || 'mixed';
  const progress = useStore(progressStore);
  const missedCount = allQuestions.filter((q) => progress[q.id]?.missed).length;
  const [examRunning, setExamRunning] = useState(false);

  const setMode = (m: Mode) => setParams({ mode: m });

  if (single) {
    const q = questionById.get(single);
    const c = q ? findConcept(q.concept) : undefined;
    return (
      <div className="page page--narrow">
        <header className="page-header">
          <span className="eyebrow">Practice question</span>
          <h1>{q ? q.topic : 'Question not found'}</h1>
          <p className="row">
            <Link to="/practice">← All practice modes</Link>
            {c && <Link to={`${weekPath(c.week.week)}#q-${single}`}>See it in week {c.week.week}</Link>}
          </p>
        </header>
        {q && <QuestionCard question={q} />}
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <span className="eyebrow">Practice</span>
        <h1>Practice & exam simulation</h1>
        <p className="lede">Mix questions from several weeks, go back to the ones you missed, or sit a timed exam without hints.</p>
      </header>
      <div className="segmented__track practice-tabs" role="tablist" aria-label="Practice mode">
        {(
          [
            ['mixed', 'Mixed practice'],
            ['missed', `Review missed (${missedCount})`],
            ['exam', 'Exam simulation'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className="segmented__opt"
            disabled={examRunning && m !== 'exam'}
            title={examRunning && m !== 'exam' ? 'Finish or abandon the exam first' : undefined}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'mixed' && <MixedPractice />}
      {mode === 'missed' && <ReviewMissed />}
      {mode === 'exam' && <ExamSimulation onRunningChange={setExamRunning} />}
    </div>
  );
}

/* ---------------- Shared: week picker ---------------- */

function WeekPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <fieldset className="picker">
      <legend className="picker__label">Weeks</legend>
      <div className="chips">
        {weeks.map((w) => {
          const on = value.includes(w.week);
          return (
            <button
              key={w.week}
              type="button"
              className={`chip chip--toggle ${on ? 'is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== w.week) : [...value, w.week].sort())}
            >
              W{w.week} · {w.title}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ---------------- Stepper through a list of questions ---------------- */

function Stepper({ ids, startedAt, onDone, doneLabel = 'Finish' }: { ids: string[]; startedAt: number; onDone: () => void; doneLabel?: string }) {
  const [i, setI] = useState(0);
  const progress = useStore(progressStore);
  const top = useRef<HTMLDivElement>(null);
  const q = questionById.get(ids[i]);
  const answered = ids.filter((id) => (progress[id]?.at ?? 0) >= startedAt);
  const correct = answered.filter((id) => progress[id]?.correct);
  const go = (n: number) => {
    setI(n);
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };
  if (!q) return null;
  return (
    <div className="stepper" ref={top}>
      <div className="stepper__bar">
        <span className="stepper__count">
          Question {i + 1} of {ids.length}
        </span>
        <ol className="stepper__dots" aria-label="Questions in this session">
          {ids.map((id, k) => {
            const r = progress[id];
            const state = (r?.at ?? 0) >= startedAt ? (r?.correct ? 'good' : 'bad') : '';
            return (
              <li key={id}>
                <button type="button" className={`dot ${state ? `dot--${state}` : ''} ${k === i ? 'is-current' : ''}`} aria-label={`Question ${k + 1}${state ? (state === 'good' ? ', correct' : ', wrong') : ''}`} aria-current={k === i ? 'step' : undefined} onClick={() => go(k)} />
              </li>
            );
          })}
        </ol>
        <span className="muted small">
          {correct.length}/{answered.length} correct so far
        </span>
      </div>
      <QuestionCard key={q.id} question={q} number={i + 1} />
      <div className="row stepper__nav">
        <button type="button" className="btn" disabled={i === 0} onClick={() => go(i - 1)}>
          ← Previous
        </button>
        {i < ids.length - 1 ? (
          <button type="button" className="btn btn--primary" onClick={() => go(i + 1)}>
            Next →
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={onDone}>
            {doneLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Mixed practice ---------------- */

function MixedPractice() {
  const [sel, setSel] = useState<number[]>(weeks.map((w) => w.week));
  const [type, setType] = useState<TypeFilter>('all');
  const [count, setCount] = useState(10);
  const [preferNew, setPreferNew] = useState(true);
  const [session, setSession] = useState<{ ids: string[]; at: number } | null>(null);
  const [summary, setSummary] = useState(false);
  const progress = useStore(progressStore);

  const pool = allQuestions.filter((q) => sel.includes(q.week) && (type === 'all' || q.type === type));
  const start = () => {
    const shuffled = shuffle(pool);
    // Prefer questions that are new or were missed; fill up with the rest.
    const ordered = preferNew ? [...shuffled.filter((q) => !progress[q.id]?.correct), ...shuffled.filter((q) => progress[q.id]?.correct)] : shuffled;
    setSession({ ids: ordered.slice(0, count).map((q) => q.id), at: Date.now() });
    setSummary(false);
  };

  if (session && !summary) return <Stepper ids={session.ids} startedAt={session.at} onDone={() => setSummary(true)} />;
  if (session && summary) {
    const answered = session.ids.filter((id) => (progress[id]?.at ?? 0) >= session.at);
    const correct = answered.filter((id) => progress[id]?.correct).length;
    return (
      <section className="card session-summary">
        <h2 className="card__title">Session done</h2>
        <p className="big-number">
          {correct}/{session.ids.length}
          <span className="muted small"> correct ({answered.length} answered)</span>
        </p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={start}>
            New mixed set
          </button>
          <Link className="btn" to="/practice?mode=missed">
            Review what I missed
          </Link>
          <button type="button" className="btn btn--ghost" onClick={() => setSession(null)}>
            Change settings
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="card practice-setup">
      <WeekPicker value={sel} onChange={setSel} />
      <fieldset className="picker">
        <legend className="picker__label">Question type</legend>
        <div className="segmented__track" role="radiogroup">
          {(
            [
              ['all', 'All'],
              ['mcq', 'Concept checks'],
              ['numeric', 'Numeric'],
              ['multi', 'Exam-style'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={type === v} className="segmented__opt" onClick={() => setType(v)}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="picker">
        <legend className="picker__label">Number of questions</legend>
        <div className="segmented__track" role="radiogroup">
          {[5, 10, 20].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={count === n} className="segmented__opt" onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="toggle-row">
        <input type="checkbox" checked={preferNew} onChange={(e) => setPreferNew(e.target.checked)} /> Prefer questions I haven’t got right yet
      </label>
      <div className="row">
        <button type="button" className="btn btn--primary" disabled={pool.length === 0} onClick={start}>
          Start ({Math.min(count, pool.length)} of {pool.length} available)
        </button>
      </div>
    </section>
  );
}

/* ---------------- Review missed ---------------- */

function ReviewMissed() {
  const progress = useStore(progressStore);
  const [session, setSession] = useState<{ ids: string[]; at: number } | null>(null);
  const missed = allQuestions.filter((q) => progress[q.id]?.missed);

  if (session)
    return (
      <Stepper
        ids={session.ids}
        startedAt={session.at}
        doneLabel="Done reviewing"
        onDone={() => setSession(null)}
      />
    );
  if (missed.length === 0)
    return (
      <section className="card">
        <h2 className="card__title">Nothing to review</h2>
        <p className="muted">Every question you answered last was right. Questions you get wrong (in practice or in an exam simulation) land here until you answer them correctly.</p>
        <Link className="btn btn--primary" to="/practice?mode=mixed">
          Do a mixed set
        </Link>
      </section>
    );
  const byWeek = weeks.map((w) => ({ w, qs: missed.filter((q) => q.week === w.week) })).filter((x) => x.qs.length);
  return (
    <section className="card">
      <h2 className="card__title">{missed.length} questions to review</h2>
      <p className="muted">A question leaves this list as soon as you answer it correctly.</p>
      <ul className="review-list">
        {byWeek.map(({ w, qs }) => (
          <li key={w.week}>
            <strong>Week {w.week}</strong> <span className="muted">· {qs.map((q) => q.topic).join(', ')}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--primary" onClick={() => setSession({ ids: shuffle(missed).map((q) => q.id), at: Date.now() })}>
        Start reviewing
      </button>
    </section>
  );
}

/* ---------------- Exam simulation ---------------- */

const DURATIONS = [
  { min: 30, label: '30 min' },
  { min: 60, label: '1 hour' },
  { min: 90, label: '1.5 hours' },
  { min: 180, label: '3 hours (full exam)' },
];
/** Estimated working time per question (minutes). Recalibrate when past exams arrive. */
export const estMinutes = (q: Question) => (q.type === 'mcq' ? 2.5 : q.type === 'numeric' ? 5 : 1.2 * questionPoints(q));

/**
 * Compose an exam by time: ~45 % exam-style multi-part, ~30 % numeric, ~25 % concept checks,
 * taken round-robin over the selected weeks (random starting week) so every week appears.
 */
export function composeExam(weekList: number[], minutes: number): Question[] {
  const pool = allQuestions.filter((q) => weekList.includes(q.week));
  const picked: Question[] = [];
  const offset = Math.floor(Math.random() * Math.max(1, weekList.length));
  const fill = (type: Question['type'], budget: number) => {
    const perWeek = weekList.map((_, i) => weekList[(i + offset) % weekList.length]).map((w) => shuffle(pool.filter((q) => q.type === type && q.week === w)));
    let used = 0;
    let k = 0;
    let misses = 0;
    while (perWeek.some((l) => l.length) && misses < perWeek.length * 4) {
      const list = perWeek[k++ % perWeek.length];
      const q = list[0];
      if (!q) continue;
      const t = estMinutes(q);
      // Accept if it fits (10 % slack), or if nothing of this type was taken yet and it is not wildly too long.
      if (used + t <= budget * 1.1 || (used === 0 && t <= budget * 1.6)) {
        picked.push(list.shift()!);
        used += t;
        misses = 0;
      } else {
        list.shift();
        misses++;
      }
      if (used >= budget * 0.9) break;
    }
    return used;
  };
  const usedMulti = fill('multi', minutes * 0.45);
  const usedNum = fill('numeric', minutes * 0.75 - usedMulti);
  fill('mcq', minutes - usedMulti - usedNum);
  const order: Record<Question['type'], number> = { mcq: 0, numeric: 1, multi: 2 };
  return picked.sort((a, b) => order[a.type] - order[b.type] || a.week - b.week);
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

function ExamSimulation({ onRunningChange }: { onRunningChange: (r: boolean) => void }) {
  const [sel, setSel] = useState<number[]>(weeks.map((w) => w.week));
  const [minutes, setMinutes] = useState(60);
  const [exam, setExam] = useState<{ qs: Question[]; start: number; minutes: number } | null>(null);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, { earned: number; max: number }>>({});
  const [now, setNow] = useState(Date.now());
  const { exams } = useStore(examStore);
  const running = !!exam && submittedAt === null;

  useEffect(() => onRunningChange(running), [running, onRunningChange]);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('beforeunload', warn);
    };
  }, [running]);

  const left = exam ? Math.round((exam.start + exam.minutes * 60000 - now) / 1000) : 0;
  const max = exam ? exam.qs.reduce((s, q) => s + questionPoints(q), 0) : 0;
  const earned = Object.values(scores).reduce((s, x) => s + x.earned, 0);
  const answered = exam ? exam.qs.filter((q) => scores[q.id]).length : 0;

  const submit = () => {
    if (!exam || submittedAt) return;
    const at = Date.now();
    setSubmittedAt(at);
    for (const q of exam.qs) {
      const s = scores[q.id];
      if (s) recordAnswer(q.id, s.earned >= s.max);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => {
    if (running && left <= 0) submit();
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the stored record up to date while open parts are self-assessed after submitting.
  useEffect(() => {
    if (!exam || !submittedAt) return;
    const rec: ExamRecord = {
      at: exam.start,
      weeks: [...new Set(exam.qs.map((q) => q.week))].sort(),
      minutes: exam.minutes,
      used: Math.min(exam.minutes, Math.round((submittedAt - exam.start) / 60000)),
      earned,
      max,
      items: exam.qs.map((q) => ({ id: q.id, earned: scores[q.id]?.earned ?? 0, max: questionPoints(q) })),
    };
    examStore.set((s) => ({ exams: [rec, ...s.exams.filter((e) => e.at !== rec.at)].slice(0, 20) }));
  }, [exam, submittedAt, earned, max, scores]);

  const begin = () => {
    setExam({ qs: composeExam(sel, minutes), start: Date.now(), minutes });
    setScores({});
    setSubmittedAt(null);
    setNow(Date.now());
  };
  const onScore = (id: string, e: number, m: number) => setScores((s) => ({ ...s, [id]: { earned: e, max: m } }));

  if (!exam)
    return (
      <>
        <section className="card practice-setup">
          <WeekPicker value={sel} onChange={setSel} />
          <fieldset className="picker">
            <legend className="picker__label">Duration</legend>
            <div className="segmented__track" role="radiogroup">
              {DURATIONS.map((d) => (
                <button key={d.min} type="button" role="radio" aria-checked={minutes === d.min} className="segmented__opt" onClick={() => setMinutes(d.min)}>
                  {d.label}
                </button>
              ))}
            </div>
          </fieldset>
          <ul className="exam-rules muted small">
            <li>Concept checks first, then numeric questions, then exam-style multi-part questions, spread over the selected weeks. The mix is sized to the time (≈ 2.5 min per concept check, 5 min per numeric question, 1.2 min per point of an exam-style question).</li>
            <li>No hints, no feedback and no solutions until you submit. Keep the equation sheet (the Formulas page, “On the sheet”) and a calculator next to you, as in the real exam.</li>
            <li>Open parts (sketches, explanations) you mark yourself after submitting.</li>
            <li>The real exam (25 Jan 2027, 9:00–12:00) format will be recalibrated as soon as past exams are added.</li>
          </ul>
          <button type="button" className="btn btn--primary" disabled={sel.length === 0} onClick={begin}>
            Start the exam
          </button>
        </section>
        {exams.length > 0 && <ExamHistory exams={exams} />}
      </>
    );

  return (
    <div className="exam">
      <div className={`exam-bar ${running && left < 300 ? 'is-urgent' : ''}`} role="status">
        {running ? (
          <>
            <span className="exam-bar__time num" aria-label={`Time left ${mmss(left)}`}>
              ⏱ {mmss(left)}
            </span>
            <span className="muted small">
              {answered}/{exam.qs.length} answered · {max} points
            </span>
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => {
                if (answered < exam.qs.length && !window.confirm(`${exam.qs.length - answered} question(s) unanswered. Submit anyway?`)) return;
                submit();
              }}
            >
              Submit
            </button>
          </>
        ) : (
          <>
            <span className="exam-bar__time">
              Score {Math.round(earned * 10) / 10} / {max} ({Math.round((100 * earned) / Math.max(1, max))} %)
            </span>
            <span className="muted small">Mark the open parts below; the score updates.</span>
            <button type="button" className="btn btn--small" onClick={() => setExam(null)}>
              Back to setup
            </button>
          </>
        )}
      </div>

      {submittedAt && <ExamSummary qs={exam.qs} scores={scores} used={Math.round((submittedAt - exam.start) / 60000)} minutes={exam.minutes} />}

      <div className="stack-lg">
        {exam.qs.map((q, i) => (
          <QuestionCard key={`${exam.start}-${q.id}`} question={q} number={i + 1} exam onExamScore={onScore} reveal={!!submittedAt} />
        ))}
      </div>
      {running && (
        <div className="row exam-submit">
          <button type="button" className="btn btn--primary" onClick={submit}>
            Submit the exam
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              if (window.confirm('Abandon this exam? Nothing will be saved.')) setExam(null);
            }}
          >
            Abandon
          </button>
        </div>
      )}
    </div>
  );
}

function ExamSummary({ qs, scores, used, minutes }: { qs: Question[]; scores: Record<string, { earned: number; max: number }>; used: number; minutes: number }) {
  const rows = weeks
    .map((w) => {
      const list = qs.filter((q) => q.week === w.week);
      const max = list.reduce((s, q) => s + questionPoints(q), 0);
      const got = list.reduce((s, q) => s + (scores[q.id]?.earned ?? 0), 0);
      return { w, max, got, list };
    })
    .filter((r) => r.max > 0);
  const weakest = qs
    .filter((q) => (scores[q.id]?.earned ?? 0) < questionPoints(q))
    .map((q) => findConcept(q.concept))
    .filter(Boolean)
    .reduce<Map<string, { title: string; href: string; n: number }>>((m, c) => {
      const key = c!.concept.id;
      const prev = m.get(key);
      m.set(key, { title: c!.concept.title, href: `${weekPath(c!.week.week)}#${key}`, n: (prev?.n ?? 0) + 1 });
      return m;
    }, new Map());
  return (
    <section className="card exam-summary">
      <h2 className="card__title">Result</h2>
      <p className="muted small">
        Time used: {used} of {minutes} min.
      </p>
      <ul className="exam-weeks">
        {rows.map((r) => (
          <li key={r.w.week}>
            <span>
              Week {r.w.week}: {r.w.title}
            </span>
            <span className="progress progress--inline" aria-hidden>
              <span className="progress__good" style={{ width: `${(100 * r.got) / r.max}%` }} />
            </span>
            <span className="num">
              {Math.round(r.got * 10) / 10}/{r.max}
            </span>
          </li>
        ))}
      </ul>
      {weakest.size > 0 && (
        <>
          <h3 className="small-heading">Concepts to revisit</h3>
          <ul className="link-list">
            {[...weakest.values()]
              .sort((a, b) => b.n - a.n)
              .map((c) => (
                <li key={c.href}>
                  <Link to={c.href}>{c.title}</Link> <span className="muted small">· {c.n} question{c.n > 1 ? 's' : ''} lost points</span>
                </li>
              ))}
          </ul>
        </>
      )}
      <p className="muted small">Questions you got wrong are now in “Review missed”. Solutions are shown under each question below.</p>
    </section>
  );
}

function ExamHistory({ exams }: { exams: ExamRecord[] }) {
  return (
    <section className="card">
      <h2 className="card__title">Previous simulations</h2>
      <ul className="exam-history">
        {exams.slice(0, 8).map((e) => (
          <li key={e.at}>
            <span>{new Date(e.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span className="muted small">
              weeks {e.weeks.join(', ')} · {e.used}/{e.minutes} min
            </span>
            <span className="num">{Math.round((100 * e.earned) / Math.max(1, e.max))} %</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default PracticePage;
