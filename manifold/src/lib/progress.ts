import { useSyncExternalStore } from 'react';

const KEY = 'manifold-progress-v1';

interface State {
  lessons: Record<string, number>; // lessonId -> completed timestamp
  questions: Record<string, number>; // question id -> done timestamp
  quiz: Record<string, { best: number; total: number }>;
  last?: string; // last visited lesson path
}

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { lessons: {}, questions: {}, quiz: {}, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { lessons: {}, questions: {}, quiz: {} };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const progress = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  toggleLesson(id: string) {
    const lessons = { ...state.lessons };
    if (lessons[id]) delete lessons[id];
    else lessons[id] = Date.now();
    state = { ...state, lessons };
    save();
  },
  completeLesson(id: string) {
    if (state.lessons[id]) return;
    state = { ...state, lessons: { ...state.lessons, [id]: Date.now() } };
    save();
  },
  toggleQuestion(id: string) {
    const questions = { ...state.questions };
    if (questions[id]) delete questions[id];
    else questions[id] = Date.now();
    state = { ...state, questions };
    save();
  },
  recordQuiz(key: string, score: number, total: number) {
    const prev = state.quiz[key];
    if (prev && prev.best >= score) return;
    state = { ...state, quiz: { ...state.quiz, [key]: { best: score, total } } };
    save();
  },
  setLast(path: string) {
    if (state.last === path) return;
    state = { ...state, last: path };
    save();
  },
  reset() {
    state = { lessons: {}, questions: {}, quiz: {} };
    save();
  },
};

export function useProgress() {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get);
}
