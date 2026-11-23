/**
 * Global search index over everything the site contains. Built once from the content loader;
 * no server, no external library. Every query token must match (AND); title hits rank highest.
 */
import { allFormulas, allQuestions, diagramMeta, allDiagramIds, examplesForWeek, findConcept, foundations, glossary, weekPath, weeks } from './content';

export type SearchKind = 'term' | 'concept' | 'formula' | 'diagram' | 'foundation' | 'example' | 'question';

export interface SearchItem {
  kind: SearchKind;
  title: string;
  /** Short context line (week, topic…). */
  sub: string;
  href: string;
  /** Optional LaTeX shown next to the title (formulas). */
  tex?: string;
  /** Lower-cased searchable fields. */
  hTitle: string;
  hAlt: string;
  hBody: string;
}

export const KIND_LABEL: Record<SearchKind, string> = {
  term: 'Glossary',
  concept: 'Concepts',
  formula: 'Formulas',
  diagram: 'Interactive diagrams',
  foundation: 'Foundations',
  example: 'Worked examples',
  question: 'Practice questions',
};
const KIND_ORDER: SearchKind[] = ['concept', 'term', 'formula', 'diagram', 'example', 'foundation', 'question'];

/** Lower-case, strip accents, turn LaTeX/markup into plain words. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\\(mathrm|text|mathit|left|right|frac|sqrt|exp|ln|qquad|quad|times|cdot|dfrac)/g, ' ')
    .replace(/[\\{}$*_^[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let cache: SearchItem[] | null = null;

export function searchIndex(): SearchItem[] {
  if (cache) return cache;
  const items: SearchItem[] = [];
  const add = (kind: SearchKind, title: string, sub: string, href: string, alt: string[], body: string[], tex?: string) =>
    items.push({ kind, title, sub, href, tex, hTitle: normalizeText(title), hAlt: normalizeText(alt.join(' ')), hBody: normalizeText(body.join(' ')) });

  for (const w of weeks) {
    add('concept', `Week ${w.week}: ${w.title}`, w.chapters, weekPath(w.week), [], [w.subtitle]);
    for (const c of w.concepts) add('concept', c.title, `Week ${w.week} · concept`, `${weekPath(w.week)}#${c.id}`, c.keywords ?? [], [c.summary]);
    for (const ex of examplesForWeek(w.week)) add('example', ex.title, `Week ${w.week} · ${ex.source}`, `${weekPath(w.week)}#example-${ex.id}`, [ex.source], [ex.prompt]);
  }
  for (const g of glossary)
    add('term', g.term, g.category === 'prerequisite' ? 'Background term' : `Term · ${g.topic}`, `/glossary#${g.id}`, [...g.aliases, g.symbol ?? ''], [g.short, g.long]);
  for (const f of allFormulas)
    add('formula', f.title, `Week ${f.week}${f.eq ? ` · eq. ${f.eq}` : ''}${f.sheet ? ' · on the sheet' : ''}`, `/formulas#${f.id}`, [f.topic, f.eq ? `eq ${f.eq}` : ''], [f.when, f.note ?? '', f.latex], f.latex);
  for (const id of allDiagramIds()) {
    const d = diagramMeta(id)!;
    const c = d.concept ? findConcept(d.concept) : undefined;
    const href = d.week ? `${weekPath(d.week)}#diagram-${id}` : `/foundations/${foundations.find((fm) => fm.diagrams?.some((x) => x.id === id))?.id ?? ''}#diagram-${id}`;
    add('diagram', d.title, d.week ? `Week ${d.week}${c ? ` · ${c.concept.title}` : ''}` : 'Foundations', href, [], [d.tryThis]);
  }
  for (const fm of foundations) add('foundation', fm.title, 'Foundations lesson', `/foundations/${fm.id}`, fm.terms, [fm.summary]);
  for (const q of allQuestions) {
    const parts = q.type === 'multi' ? q.parts.map((p) => p.prompt) : [];
    add('question', q.topic, `Week ${q.week} · ${q.type === 'mcq' ? 'concept check' : q.type === 'numeric' ? 'numeric' : 'exam-style'}${q.source ? ` · ${q.source}` : ''}`, `/practice?q=${q.id}`, [q.source ?? ''], [q.prompt, ...parts]);
  }
  cache = items;
  return items;
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  items: SearchItem[];
}

export function search(query: string, perKind = 6): SearchGroup[] {
  const tokens = normalizeText(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of searchIndex()) {
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      if (item.hTitle.startsWith(t)) score += 12;
      else if (item.hTitle.includes(` ${t}`)) score += 9;
      else if (item.hTitle.includes(t)) score += 6;
      else if (item.hAlt.includes(t)) score += 4;
      else if (item.hBody.includes(t)) score += 1;
      else {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (item.hTitle === tokens.join(' ')) score += 20;
    scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return KIND_ORDER.map((kind) => ({ kind, label: KIND_LABEL[kind], items: scored.filter((s) => s.item.kind === kind).slice(0, perKind).map((s) => s.item) })).filter((g) => g.items.length);
}
