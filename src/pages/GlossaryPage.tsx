import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tex } from '@/components/Math';
import { Rich } from '@/components/Rich';
import { TermScope } from '@/components/Term';
import { foundationById, getWeek, glossary, glossaryById, weekPath } from '@/lib/content';
import { lookupStore, useStore } from '@/lib/storage';
import type { GlossaryEntry } from '@/lib/types';
import { useTrackVisit } from '@/components/Layout';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function GlossaryPage() {
  useTrackVisit('Glossary');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | 'course' | 'prerequisite'>('all');
  const lookups = useStore(lookupStore);
  const { hash } = useLocation();
  const target = decodeURIComponent(hash.slice(1));

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return glossary.filter((g) => {
      if (cat !== 'all' && g.category !== cat) return false;
      if (!nq) return true;
      return [g.term, ...g.aliases, g.short, g.symbol ?? ''].some((s) => norm(s).includes(nq));
    });
  }, [q, cat]);

  const groups = useMemo(() => {
    const m = new Map<string, GlossaryEntry[]>();
    for (const g of [...filtered].sort((a, b) => a.term.localeCompare(b.term))) {
      m.set(g.topic, [...(m.get(g.topic) ?? []), g]);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Layer 3</span>
        <h1>Glossary</h1>
        <p className="lede">Every term and symbol used on this site, in the course’s notation. “Background” terms are knowledge the course assumes.</p>
      </header>
      <div className="filter-bar">
        <input className="input input--search" type="search" placeholder="Search terms, symbols, definitions…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the glossary" />
        <div className="segmented__track" role="radiogroup" aria-label="Category">
          {(['all', 'course', 'prerequisite'] as const).map((c) => (
            <button key={c} type="button" role="radio" aria-checked={cat === c} className="segmented__opt" onClick={() => setCat(c)}>
              {c === 'all' ? 'All' : c === 'course' ? 'Course' : 'Background'}
            </button>
          ))}
        </div>
        <span className="muted small">{filtered.length} terms</span>
      </div>
      <nav className="glossary-topics" aria-label="Topics">
        {groups.map(([topic]) => (
          <a key={topic} href={`#topic-${topic}`} className="chip">
            {topic}
          </a>
        ))}
      </nav>
      <TermScope>
        {groups.map(([topic, items]) => (
          <section key={topic} id={`topic-${topic}`} className="glossary-group">
            <h2>{topic}</h2>
            <div className="glossary-list">
              {items.map((g) => (
                <article key={g.id} id={g.id} className={`gloss ${target === g.id ? 'is-target' : ''}`}>
                  <header className="gloss__head">
                    <h3>{g.term}</h3>
                    {g.symbol && <Tex tex={g.symbol} className="gloss__symbol" />}
                    {g.unit && <span className="badge">{g.unit}</span>}
                    <span className={`badge badge--${g.category}`}>{g.category === 'prerequisite' ? 'background' : 'course'}</span>
                    {lookups[g.id] ? <span className="muted small">opened {lookups[g.id]}×</span> : null}
                  </header>
                  <p className="gloss__short">{g.short}</p>
                  <Rich text={g.long} className="gloss__long" />
                  {g.example && (
                    <div className="gloss__example">
                      <span className="eyebrow">Example</span>
                      <Rich text={g.example} />
                    </div>
                  )}
                  <footer className="gloss__foot">
                    {g.weeks.length > 0 && (
                      <span>
                        Used in{' '}
                        {g.weeks.map((w, i) => (
                          <span key={w}>
                            {i > 0 && ', '}
                            {getWeek(w) ? <Link to={g.taughtIn && g.taughtIn.startsWith(`week-${String(w).padStart(2, '0')}`) ? `${weekPath(w)}#${g.taughtIn.split('#')[1]}` : weekPath(w)}>week {w}</Link> : <span title="Not published yet">week {w}</span>}
                          </span>
                        ))}
                      </span>
                    )}
                    {g.foundation && foundationById.get(g.foundation) && <Link to={`/foundations/${g.foundation}`}>Foundations: {foundationById.get(g.foundation)!.title}</Link>}
                    {g.related.length > 0 && (
                      <span className="gloss__related">
                        Related:{' '}
                        {g.related
                          .filter((r) => glossaryById.has(r))
                          .map((r, i) => (
                            <span key={r}>
                              {i > 0 && ', '}
                              <a href={`#${r}`}>{glossaryById.get(r)!.term}</a>
                            </span>
                          ))}
                      </span>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          </section>
        ))}
      </TermScope>
      {filtered.length === 0 && <p className="muted">No terms match “{q}”.</p>}
    </div>
  );
}
