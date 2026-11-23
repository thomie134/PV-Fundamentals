import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import constantsData from '@content/constants.json';
import { Formula } from '@/components/Formula';
import { Tex } from '@/components/Math';
import { Rich } from '@/components/Rich';
import { TermScope } from '@/components/Term';
import { useTrackVisit } from '@/components/Layout';
import { allFormulas, diagramMeta, findConcept, weekPath, weeks } from '@/lib/content';
import { normalizeText } from '@/lib/search';
import type { FormulaEntry } from '@/lib/types';

type SheetFilter = 'all' | 'sheet' | 'learn';

interface ConstRow {
  id: string;
  latex: string;
  name: string;
  display: string;
  onSheet?: boolean;
  note?: string;
}

export function FormulasPage() {
  useTrackVisit('Formulas & constants');
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState<SheetFilter>('all');
  const [week, setWeek] = useState<number | 'all'>('all');

  const filtered = useMemo(() => {
    const tokens = normalizeText(q).split(' ').filter(Boolean);
    return allFormulas.filter((f) => {
      if (week !== 'all' && f.week !== week) return false;
      if (sheet === 'sheet' && !f.sheet) return false;
      if (sheet === 'learn' && f.sheet) return false;
      if (!tokens.length) return true;
      const hay = normalizeText([f.title, f.topic, f.when, f.note ?? '', f.eq ? `eq ${f.eq} ${f.eq}` : '', f.latex].join(' '));
      return tokens.every((t) => hay.includes(t));
    });
  }, [q, sheet, week]);

  const byWeek = useMemo(() => {
    const m = new Map<number, Map<string, FormulaEntry[]>>();
    for (const f of filtered) {
      const topics = m.get(f.week) ?? new Map<string, FormulaEntry[]>();
      topics.set(f.topic, [...(topics.get(f.topic) ?? []), f]);
      m.set(f.week, topics);
    }
    return [...m.entries()].sort(([a], [b]) => a - b);
  }, [filtered]);

  const counts = { sheet: allFormulas.filter((f) => f.sheet).length, learn: allFormulas.filter((f) => !f.sheet).length };
  const constants: ConstRow[] = [...constantsData.constants, ...constantsData.materials[0].properties.map((p) => ({ ...p, onSheet: true })), ...constantsData.derived];

  return (
    <div className="page page--wide">
      <header className="page-header">
        <span className="eyebrow">Reference</span>
        <h1>Formulas & constants</h1>
        <p className="lede">
          Every formula used on this site. <span className="badge badge--sheet">On the sheet</span> means it is printed on the official equation sheet you get in the exam; the others you must know or
          derive. Hover or tap any symbol for its meaning.
        </p>
      </header>

      <div className="filter-bar">
        <input className="input input--search" type="search" placeholder="Search: name, symbol, equation number…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search formulas" />
        <div className="segmented__track" role="radiogroup" aria-label="Equation sheet">
          {(
            [
              ['all', `All (${allFormulas.length})`],
              ['sheet', `On the sheet (${counts.sheet})`],
              ['learn', `Not on the sheet (${counts.learn})`],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={sheet === v} className="segmented__opt" onClick={() => setSheet(v)}>
              {label}
            </button>
          ))}
        </div>
        <div className="segmented__track" role="radiogroup" aria-label="Week">
          <button type="button" role="radio" aria-checked={week === 'all'} className="segmented__opt" onClick={() => setWeek('all')}>
            All weeks
          </button>
          {weeks.map((w) => (
            <button key={w.week} type="button" role="radio" aria-checked={week === w.week} className="segmented__opt" onClick={() => setWeek(w.week)}>
              W{w.week}
            </button>
          ))}
        </div>
        <span className="muted small">{filtered.length} formulas</span>
      </div>

      {byWeek.length === 0 && <p className="muted">No formulas match. Clear the search or the filters.</p>}

      <TermScope>
        {byWeek.map(([w, topics]) => (
          <section key={w} className="section formula-week">
            <h2>
              <Link to={weekPath(w)}>
                Week {w}: {weeks.find((x) => x.week === w)?.title}
              </Link>
            </h2>
            {[...topics.entries()].map(([topic, list]) => (
              <div key={topic} className="formula-topic">
                <h3 className="formula-topic__title">{topic}</h3>
                <div className="formula-grid">
                  {list.map((f) => (
                    <FormulaCard key={f.id} f={f} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </TermScope>

      <section className="section" id="constants">
        <h2>Constants and c-Si properties</h2>
        <p className="muted">The formula sheet’s values. The site computes everything with these, so its answers can differ slightly from instruction answers that round (e.g. h = 6.63 × 10⁻³⁴).</p>
        <div className="table-wrap">
          <table className="sources-table constants-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>Value</th>
                <th>Sheet</th>
              </tr>
            </thead>
            <tbody>
              {constants.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Tex tex={c.latex} />
                  </td>
                  <td>
                    {c.name}
                    {c.note && <div className="muted small">{c.note}</div>}
                  </td>
                  <td className="num">{c.display}</td>
                  <td>{c.onSheet ? <span className="badge badge--sheet">✓ sheet</span> : <span className="muted small">derive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FormulaCard({ f }: { f: FormulaEntry }) {
  const c = f.concept ? findConcept(f.concept) : undefined;
  const d = f.diagram ? diagramMeta(f.diagram) : undefined;
  return (
    <article className={`formula-card ${f.sheet ? 'is-sheet' : ''}`} id={f.id}>
      <header className="formula-card__head">
        <h4 className="formula-card__title">{f.title}</h4>
        <span className="formula-card__badges">
          {f.eq && <span className="muted small">eq. {f.eq}</span>}
          {f.sheet ? <span className="badge badge--sheet">On the sheet</span> : <span className="badge badge--learn">Know / derive</span>}
        </span>
      </header>
      <div className="formula-card__math">
        <Formula tex={f.latex} display ctx={f.context} />
      </div>
      <Rich text={f.when} ctx={f.context} className="formula-card__when" />
      {f.note && (
        <p className="formula-card__note">
          <Rich text={f.note} ctx={f.context} inline />
        </p>
      )}
      <footer className="formula-card__links small">
        {c && <Link to={`${weekPath(c.week.week)}#${c.concept.id}`}>Concept: {c.concept.title}</Link>}
        {d && d.week && <Link to={`${weekPath(d.week)}#diagram-${d.id}`}>Diagram: {d.title}</Link>}
        <span className="muted">{f.source}</span>
      </footer>
    </article>
  );
}

export default FormulasPage;
