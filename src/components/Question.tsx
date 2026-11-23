/**
 * Practice question card: MCQ, numeric (with typical-mistake detection) and multi-part
 * exam-style questions. Stepped hints, full worked solutions, progress in localStorage,
 * links to the concept it tests and the Foundations lessons it leans on.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { findConcept, foundationById, weekPath } from '@/lib/content';
import { gradeNumeric, type Grade } from '@/lib/grading';
import { fmt, sci } from '@/lib/format';

const sci4 = (v: number) => (Math.abs(v) !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e5) ? sci(v, 4) : fmt(v, 4));
import { progressStore, recordAnswer, settingsStore, useStore } from '@/lib/storage';
import type { McqOption, NumericAnswer, Question, QuestionPart, SymbolContext } from '@/lib/types';
import { SymbolCtx } from './contexts';
import { Rich } from './Rich';
import { TermScope } from './Term';

export interface QuestionCardProps {
  question: Question;
  number?: number;
  /** Exam mode: no hints, no feedback; scores reported via onExamScore. */
  exam?: boolean;
  /** Exam mode: called whenever the (partial) score of this question changes. */
  onExamScore?: (id: string, earned: number, max: number) => void;
  /** Show results + solutions (exam review). */
  reveal?: boolean;
  /** Override the symbol context (Foundations checks). */
  ctx?: SymbolContext;
}

/** Points of a question: its own `points`, else the sum of its parts, else 2 (MCQ) or 3 (numeric). */
export function questionPoints(q: Question): number {
  if (q.type === 'multi') return q.parts.reduce((s, p) => s + partPoints(p), 0);
  return q.points ?? (q.type === 'mcq' ? 2 : 3);
}
const partPoints = (p: QuestionPart) => p.points ?? (p.kind === 'mcq' ? 1 : 2);

const Difficulty = ({ d }: { d: 1 | 2 | 3 }) => (
  <span className="difficulty" aria-label={`Difficulty ${d} of 3`} title={['', 'Warm-up', 'Exam level', 'Challenging'][d]}>
    {[1, 2, 3].map((i) => (
      <span key={i} className={i <= d ? 'on' : ''} />
    ))}
  </span>
);

export function QuestionCard({ question: q, number, exam = false, onExamScore, reveal = false, ctx: ctxOverride }: QuestionCardProps) {
  const progress = useStore(progressStore);
  const rec = progress[q.id];
  const found = findConcept(q.concept);
  const ctx: SymbolContext = ctxOverride ?? found?.concept.context ?? 'general';
  const [lastWrong, setLastWrong] = useState(false);

  const pts = questionPoints(q);
  const report = (correct: boolean) => {
    if (exam) onExamScore?.(q.id, correct ? pts : 0, pts);
    else {
      recordAnswer(q.id, correct);
      setLastWrong(!correct);
    }
  };

  return (
    <article className="qcard" id={`q-${q.id}`} aria-labelledby={`q-${q.id}-title`}>
      <TermScope>
        <SymbolCtx.Provider value={ctx}>
          <header className="qcard__head">
            <h4 id={`q-${q.id}-title`} className="qcard__title">
              {number !== undefined && <span className="qcard__num">Q{number}</span>}
              <span className="badge">{q.type === 'mcq' ? 'Concept check' : q.type === 'numeric' ? 'Numeric' : 'Exam-style'}</span>
              <span className="qcard__topic">{q.topic}</span>
            </h4>
            <div className="qcard__meta">
              {(q.points || exam) && <span className="muted">{pts} pts</span>}
              <Difficulty d={q.difficulty} />
              {!exam && rec && (
                <span className={`status ${rec.correct ? 'status--good' : 'status--bad'}`}>{rec.correct ? '✓ correct' : '✗ missed'}</span>
              )}
            </div>
          </header>
          <Rich text={q.prompt} ctx={ctx} className="qcard__prompt" />

          {q.type === 'mcq' && <McqBody options={q.options} exam={exam} reveal={reveal} onResult={report} ctx={ctx} />}
          {q.type === 'numeric' && <NumericBody answer={q.answer} exam={exam} reveal={reveal} onResult={report} />}
          {q.type === 'multi' && <MultiBody parts={q.parts} exam={exam} reveal={reveal} onResult={report} onPartial={(e, m) => onExamScore?.(q.id, e, m)} ctx={ctx} />}

          {!exam && <Hints hints={q.hints} ctx={ctx} />}
          {(!exam || reveal) && <Solution steps={q.solution} ctx={ctx} />}

          {!exam && lastWrong && q.prerequisites.length > 0 && <BeginnerFoundationNudge ids={q.prerequisites} />}

          {!exam && (
            <footer className="qcard__foot">
              {found && (
                <Link to={`${weekPath(found.week.week)}#${found.concept.id}`}>
                  Concept: {found.concept.title}
                </Link>
              )}
              {q.prerequisites.map((p) => {
                const f = foundationById.get(p);
                return f ? (
                  <Link key={p} to={`/foundations/${p}`} className="muted">
                    Foundations: {f.title}
                  </Link>
                ) : null;
              })}
              {q.source && <span className="muted">{q.source}</span>}
            </footer>
          )}
        </SymbolCtx.Provider>
      </TermScope>
    </article>
  );
}

function BeginnerFoundationNudge({ ids }: { ids: string[] }) {
  const { beginner } = useStore(settingsStore);
  if (!beginner) return null;
  return (
    <aside className="callout callout--hint">
      <div className="callout__title">✦ This question leans on background knowledge</div>
      <div className="callout__body">
        Refresh it first:{' '}
        {ids.map((id, i) => {
          const f = foundationById.get(id);
          return f ? (
            <span key={id}>
              {i > 0 && ', '}
              <Link to={`/foundations/${id}`}>{f.title}</Link>
            </span>
          ) : null;
        })}
      </div>
    </aside>
  );
}

/* ---------------- Bodies ---------------- */

function McqBody({ options, exam, reveal, onResult, ctx }: { options: McqOption[]; exam: boolean; reveal: boolean; onResult: (c: boolean) => void; ctx: SymbolContext }) {
  const [sel, setSel] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const name = useId();
  const chosen = options.find((o) => o.id === sel);
  const showResult = (checked && !exam) || reveal;
  return (
    <div className="mcq">
      <div role="radiogroup" aria-label="Answer options" className="mcq__options">
        {options.map((o, i) => {
          const state = showResult && (o.correct ? 'correct' : o.id === sel ? 'wrong' : '');
          return (
            <label key={o.id} className={`mcq__opt ${sel === o.id ? 'is-selected' : ''} ${state ? `is-${state}` : ''}`}>
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={sel === o.id}
                disabled={reveal || (showResult && !exam && chosen?.correct)}
                onChange={() => {
                  setSel(o.id);
                  setChecked(false);
                  if (exam) onResult(!!o.correct);
                }}
              />
              <span className="mcq__letter" aria-hidden>
                {String.fromCharCode(65 + i)}
              </span>
              <Rich text={o.text} ctx={ctx} inline />
            </label>
          );
        })}
      </div>
      {!exam && (
        <div className="row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!sel || (checked && chosen?.correct)}
            onClick={() => {
              setChecked(true);
              onResult(!!chosen?.correct);
            }}
          >
            Check
          </button>
          {checked && !chosen?.correct && <span className="muted">Pick another option to try again.</span>}
        </div>
      )}
      {showResult && chosen && (
        <Feedback good={!!chosen.correct}>
          <Rich text={chosen.feedback} ctx={ctx} />
        </Feedback>
      )}
      {reveal && !chosen && <Feedback good={false}>Not answered.</Feedback>}
    </div>
  );
}

function NumericBody({ answer, exam, reveal, onResult }: { answer: NumericAnswer; exam: boolean; reveal: boolean; onResult: (c: boolean) => void }) {
  const [val, setVal] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const inputId = useId();
  const check = () => {
    const g = gradeNumeric(val, answer);
    setGrade(g);
    onResult(g.correct);
  };
  return (
    <div className="numeric">
      <div className="numeric__row">
        <label htmlFor={inputId} className="visually-hidden">
          Your answer in {answer.unit}
        </label>
        <input
          id={inputId}
          className="input numeric__input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 4.2e21"
          value={val}
          readOnly={reveal}
          onChange={(e) => {
            setVal(e.target.value);
            if (exam) {
              const g = gradeNumeric(e.target.value, answer);
              onResult(g.correct);
            }
          }}
          onKeyDown={(e) => e.key === 'Enter' && !exam && val && check()}
        />
        <span className="numeric__unit">{answer.unit}</span>
        {!exam && (
          <button type="button" className="btn btn--primary" disabled={!val} onClick={check}>
            Check
          </button>
        )}
      </div>
      {!exam && grade && <GradeFeedback grade={grade} answer={answer} />}
      {reveal && <GradeFeedback grade={gradeNumeric(val, answer)} answer={answer} showAnswer />}
      {!exam && !grade && <p className="numeric__help muted">Scientific notation: 4.2e21 or 4.2×10^21. Tolerance ±{((answer.tolerance ?? 0.03) * 100).toFixed(0)} %.</p>}
    </div>
  );
}

function GradeFeedback({ grade, answer, showAnswer = false }: { grade: Grade; answer: NumericAnswer; showAnswer?: boolean }) {
  const ans = (
    <span className="num">
      {formatAnswer(answer.value)} {answer.unit}
    </span>
  );
  if (grade.correct)
    return (
      <Feedback good>
        Correct. Reference answer: {ans}.
      </Feedback>
    );
  return (
    <Feedback good={false}>
      {grade.message ? <Rich text={grade.message} inline /> : 'Not quite. Use a hint, or compare your steps with the solution.'}
      {showAnswer && <> Reference answer: {ans}.</>}
    </Feedback>
  );
}

const formatAnswer = (v: number) => sci4(v);

function MultiBody({
  parts,
  exam,
  reveal,
  onResult,
  onPartial,
  ctx,
}: {
  parts: QuestionPart[];
  exam: boolean;
  reveal: boolean;
  onResult: (c: boolean) => void;
  onPartial?: (earned: number, max: number) => void;
  ctx: SymbolContext;
}) {
  /** Score per part, 0–1 (open parts can be ½ via self-assessment). */
  const [results, setResults] = useState<Record<string, number>>({});
  const max = parts.reduce((s, p) => s + partPoints(p), 0);
  const touched = useRef(false);
  const update = (pid: string, score: number) => {
    touched.current = true;
    setResults((r) => ({ ...r, [pid]: score }));
  };
  // Report outside the state updater (never set parent state during render).
  useEffect(() => {
    if (!touched.current) return;
    if (exam) onPartial?.(parts.reduce((s, p) => s + (results[p.id] ?? 0) * partPoints(p), 0), max);
    else if (Object.keys(results).length === parts.length) onResult(parts.every((p) => results[p.id] === 1));
  }, [results]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ol className="parts">
      {parts.map((p) => (
        <li key={p.id} className="part">
          <div className="part__head">
            <span className="part__label">{p.label}</span>
            <span className="muted">{partPoints(p)} pts</span>
            {results[p.id] !== undefined && (!exam || reveal) && (
              <span className={`status ${results[p.id] === 1 ? 'status--good' : results[p.id] > 0 ? 'status--half' : 'status--bad'}`}>
                {results[p.id] === 1 ? '✓' : results[p.id] > 0 ? '½' : '✗'}
              </span>
            )}
          </div>
          <Rich text={p.prompt} ctx={ctx} />
          {p.kind === 'numeric' && <NumericBody answer={p.answer} exam={exam} reveal={reveal} onResult={(ok) => update(p.id, ok ? 1 : 0)} />}
          {p.kind === 'mcq' && <McqBody options={p.options} exam={exam} reveal={reveal} onResult={(ok) => update(p.id, ok ? 1 : 0)} ctx={ctx} />}
          {p.kind === 'open' && <OpenBody solution={p.solution} onScore={(v) => update(p.id, v)} exam={exam} reveal={reveal} ctx={ctx} />}
          {!exam && p.hints && <Hints hints={p.hints} ctx={ctx} small />}
          {(!exam || reveal) && p.kind !== 'open' && <Solution steps={p.solution} ctx={ctx} small />}
        </li>
      ))}
    </ol>
  );
}

function OpenBody({ solution, onScore, exam, reveal, ctx }: { solution: string[]; onScore: (v: number) => void; exam: boolean; reveal: boolean; ctx: SymbolContext }) {
  const [shown, setShown] = useState(false);
  const [self, setSelf] = useState<number | null>(null);
  const [text, setText] = useState('');
  const examWriting = exam && !reveal;
  const showModel = shown || reveal;
  const rate = (v: number) => {
    setSelf(v);
    onScore(v);
  };
  return (
    <div className="open">
      {(exam || !showModel) && (
        <textarea
          className="input open__text"
          rows={3}
          placeholder={exam ? 'Write your answer (you mark it yourself after submitting).' : 'Optional: jot down your answer first.'}
          value={text}
          readOnly={reveal}
          onChange={(e) => setText(e.target.value)}
          aria-label="Your answer"
        />
      )}
      {!examWriting && !showModel && (
        <button type="button" className="btn" onClick={() => setShown(true)}>
          Show model answer
        </button>
      )}
      {!examWriting && showModel && (
        <>
          <div className="solution__body">
            <span className="eyebrow">Model answer</span>
            {solution.map((s, i) => (
              <Rich key={i} text={s} ctx={ctx} />
            ))}
          </div>
          <div className="row">
            <span className="muted">Did your answer contain these points?</span>
            {(
              [
                [1, 'Yes'],
                [0.5, 'Partly'],
                [0, 'Not really'],
              ] as const
            ).map(([v, label]) => (
              <button key={label} type="button" className={`btn btn--small ${self === v ? 'btn--primary' : ''}`} aria-pressed={self === v} onClick={() => rate(v)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Hints, solution, feedback ---------------- */

const HINT_LABELS = ['Nudge', 'Formula', 'First step'];

function Hints({ hints, ctx, small = false }: { hints: string[]; ctx: SymbolContext; small?: boolean }) {
  const [n, setN] = useState(0);
  if (!hints.length) return null;
  return (
    <div className={`hints ${small ? 'hints--small' : ''}`}>
      {hints.slice(0, n).map((h, i) => (
        <div key={i} className="hint">
          <span className="hint__label">{HINT_LABELS[i] ?? `Hint ${i + 1}`}</span>
          <Rich text={h} ctx={ctx} />
        </div>
      ))}
      {n < hints.length && (
        <button type="button" className="btn btn--ghost btn--small" onClick={() => setN(n + 1)}>
          {n === 0 ? 'Need a hint?' : `Next hint: ${HINT_LABELS[n] ?? n + 1}`} ({n + 1}/{hints.length})
        </button>
      )}
    </div>
  );
}

function Solution({ steps, ctx, small = false }: { steps: string[]; ctx: SymbolContext; small?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  return (
    <div className={`solution ${small ? 'solution--small' : ''}`}>
      <button type="button" className="btn btn--ghost btn--small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide solution' : 'Show worked solution'}
      </button>
      {open && (
        <ol className="solution__body">
          {steps.map((s, i) => (
            <li key={i}>
              <Rich text={s} ctx={ctx} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Feedback({ good, children }: { good: boolean; children: ReactNode }) {
  return (
    <div className={`feedback ${good ? 'feedback--good' : 'feedback--bad'}`} role="status">
      <span className="feedback__icon" aria-hidden>
        {good ? '✓' : '✗'}
      </span>
      <div>{children}</div>
    </div>
  );
}
