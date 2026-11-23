/**
 * Small localStorage-backed stores (no backend). Each store is versioned by key.
 * React components subscribe with useStore(); updates sync across tabs.
 */
import { useSyncExternalStore } from 'react';

type Listener = () => void;

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(l: Listener): () => void;
}

export function createStore<T>(key: string, initial: T): Store<T> {
  let value: T = initial;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) value = { ...initial, ...JSON.parse(raw) } as T;
  } catch {
    /* corrupted or unavailable storage: start fresh */
  }
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key || !e.newValue) return;
      try {
        value = JSON.parse(e.newValue) as T;
        emit();
      } catch {
        /* ignore */
      }
    });
  }
  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (p: T) => T)(value) : next;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage full or blocked: keep in memory */
      }
      emit();
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/* ---------------- App stores ---------------- */

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  beginner: boolean;
}
export const settingsStore = createStore<Settings>('pvf.settings.v1', { theme: 'system', beginner: false });

export interface QuestionRecord {
  attempts: number;
  /** Most recent attempt was correct. */
  correct: boolean;
  /** Most recent attempt was wrong: the question is in the "review missed" queue. */
  missed: boolean;
  /** Number of wrong attempts ever (for the dashboard's weak spots). */
  wrongs?: number;
  at: number;
}
export type Progress = Record<string, QuestionRecord>;
export const progressStore = createStore<Progress>('pvf.progress.v1', {});

export function recordAnswer(id: string, correct: boolean) {
  progressStore.set((p) => {
    const prev = p[id];
    return {
      ...p,
      [id]: {
        attempts: (prev?.attempts ?? 0) + 1,
        correct,
        missed: !correct,
        wrongs: (prev?.wrongs ?? (prev && !prev.correct ? 1 : 0)) + (correct ? 0 : 1),
        at: Date.now(),
      },
    };
  });
}

/** Completed exam simulations (most recent first). */
export interface ExamRecord {
  at: number;
  weeks: number[];
  minutes: number;
  /** Minutes actually used. */
  used: number;
  earned: number;
  max: number;
  items: { id: string; earned: number; max: number }[];
}
export const examStore = createStore<{ exams: ExamRecord[] }>('pvf.exams.v1', { exams: [] });
export const recordExam = (e: ExamRecord) => examStore.set((s) => ({ exams: [e, ...s.exams].slice(0, 20) }));

/** How often each glossary term was opened. */
export type Lookups = Record<string, number>;
export const lookupStore = createStore<Lookups>('pvf.lookups.v1', {});
export const recordLookup = (termId: string) => lookupStore.set((l) => ({ ...l, [termId]: (l[termId] ?? 0) + 1 }));

export interface LastVisited {
  path: string;
  title: string;
  at: number;
}
export const lastVisitedStore = createStore<{ last?: LastVisited }>('pvf.last.v1', {});
