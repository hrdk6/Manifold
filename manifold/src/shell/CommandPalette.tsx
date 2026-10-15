import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { allLessons, lessonPath } from '../content/course';
import { questions } from '../content/questions';
import { solvers } from '../lab/registry';

interface Item {
  kind: string;
  title: string;
  meta: string;
  to: string;
  hay: string;
}

const pages: Item[] = [
  { kind: 'Page', title: 'Overview', meta: 'Home', to: '/', hay: 'home overview dashboard' },
  { kind: 'Page', title: 'Study assistant', meta: 'Ask a question', to: '/assistant', hay: 'assistant ask chat question answer rag ai tutor explain' },
  { kind: 'Page', title: 'Knowledge base', meta: 'Your documents', to: '/library', hay: 'knowledge base library upload documents notes pdf slides files' },
  { kind: 'Page', title: 'Numerical solvers', meta: 'Exam desk', to: '/lab', hay: 'lab solver numerical problems calculator' },
  { kind: 'Page', title: 'Question bank', meta: 'Exam desk', to: '/questions', hay: 'question bank sample questions see paper' },
  { kind: 'Page', title: 'Formula sheet', meta: 'Exam desk', to: '/formulas', hay: 'formula sheet equations revision' },
  { kind: 'Page', title: 'Flashcards', meta: 'Exam desk', to: '/flashcards', hay: 'flashcards definitions revision' },
  { kind: 'Page', title: 'Practice quiz', meta: 'Exam desk', to: '/quiz', hay: 'quiz mcq test practice' },
];

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items: Item[] = useMemo(
    () => [
      ...allLessons.map((l) => ({
        kind: 'Lesson',
        title: l.title,
        meta: `Module ${l.module}`,
        to: lessonPath(l),
        hay: `${l.title} ${l.summary} module ${l.module}`.toLowerCase(),
      })),
      ...solvers.map((s) => ({
        kind: 'Solver',
        title: s.title,
        meta: `Module ${s.module}`,
        to: `/lab/${s.id}`,
        hay: `${s.title} ${s.desc} ${s.asks} solver numerical`.toLowerCase(),
      })),
      ...pages,
      ...questions.map((x) => ({
        kind: 'Question',
        title: x.text,
        meta: `M${x.module} Q${x.n}`,
        to: x.solver ? `/lab/${x.solver}` : x.lesson,
        hay: `${x.text} question q${x.n} m${x.module}`.toLowerCase(),
      })),
    ],
    [],
  );

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return items.filter((i) => i.kind !== 'Question').slice(0, 14);
    return items
      .map((it) => {
        let score = 0;
        for (const t of terms) {
          const idx = it.hay.indexOf(t);
          if (idx < 0) return null;
          score += it.title.toLowerCase().includes(t) ? 3 : 1;
          if (idx === 0) score += 1;
        }
        if (it.kind === 'Lesson') score += 1.5;
        if (it.kind === 'Solver') score += 1;
        return { it, score };
      })
      .filter((r): r is { it: Item; score: number } => !!r)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((r) => r.it);
  }, [q, items]);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => setSel(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const go = (it: Item) => {
    nav(it.to);
    onClose();
  };

  return (
    <div className="palette-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-label="Search">
        <input
          ref={input}
          className="palette__input"
          placeholder="Search lessons, solvers and questions…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => Math.min(results.length - 1, s + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === 'Enter' && results[sel]) {
              go(results[sel]);
            }
          }}
        />
        <ul className="palette__list" id="palette-list" role="listbox" ref={listRef}>
          {results.map((r, i) => (
            <li
              key={r.kind + r.to + r.title}
              role="option"
              aria-selected={i === sel}
              className="palette__item"
              onMouseEnter={() => setSel(i)}
              onClick={() => go(r)}
            >
              <span className="palette__kind">{r.kind}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
              <span className="palette__meta">{r.meta}</span>
            </li>
          ))}
          {!results.length && <li className="palette__empty">No matches for “{q}”. Try a topic such as “entropy” or “PCA”.</li>}
        </ul>
      </div>
    </div>
  );
}
