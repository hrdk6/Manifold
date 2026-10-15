import { useState } from 'react';
import { myCards, useMyCards } from '../../rag/mycards';
import type { CardItem, QuizItem, Source } from '../../rag/types';
import { MarkdownView } from './Markdown';

export function QuizBlock({ items, sources, onCite }: { items: QuizItem[]; sources?: Source[]; onCite?: (n: number) => void }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => items.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const right = picked.filter((p, i) => p === items[i].answer).length;
  return (
    <div className="aq">
      {items.map((q, qi) => {
        const p = picked[qi];
        return (
          <div className="aq__item" key={qi}>
            <div className="aq__q">
              <span className="aq__num">{qi + 1}</span>
              <MarkdownView text={q.question} className="md md--inline" inline />
            </div>
            <div className="quiz__opts">
              {q.options.map((o, k) => {
                const state = p === null ? undefined : k === q.answer ? 'right' : k === p ? 'wrong' : undefined;
                return (
                  <button
                    key={k}
                    className="quiz__opt"
                    data-state={state}
                    disabled={p !== null}
                    onClick={() => setPicked((arr) => arr.map((v, i) => (i === qi ? k : v)))}
                  >
                    <span className="quiz__letter">{String.fromCharCode(65 + k)}</span>
                    <MarkdownView text={o} className="md md--inline" inline />
                  </button>
                );
              })}
            </div>
            {p !== null && (
              <div className="quiz__why">
                <strong style={{ color: p === q.answer ? 'var(--viridian)' : 'var(--rose)' }}>{p === q.answer ? 'Correct. ' : 'Not quite. '}</strong>
                <MarkdownView text={q.why + (q.source && sources?.some((s) => s.n === q.source) ? ` [${q.source}]` : '')} sources={sources} onCite={onCite} className="md md--inline" inline />
              </div>
            )}
          </div>
        );
      })}
      <div className="aq__score" aria-live="polite">
        {answered === items.length ? (
          <>
            <strong>
              {right} of {items.length} correct.
            </strong>{' '}
            {right === items.length ? 'Ready for this topic.' : 'Read the cited passages for the ones you missed.'}
            <button className="btn btn--sm" onClick={() => setPicked(items.map(() => null))}>
              Try again
            </button>
          </>
        ) : (
          <span>
            {answered} of {items.length} answered
          </span>
        )}
      </div>
    </div>
  );
}

export function CardsBlock({ items, topic }: { items: CardItem[]; topic: string }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const mine = useMyCards();
  const savedAll = items.every((c) => mine.some((m) => m.term === c.term && m.def === c.def));
  return (
    <div className="ac">
      <div className="ac__grid">
        {items.map((c, i) => (
          <button
            key={i}
            className="ac__card"
            data-flipped={flipped.has(i) || undefined}
            onClick={() =>
              setFlipped((f) => {
                const n = new Set(f);
                if (n.has(i)) n.delete(i);
                else n.add(i);
                return n;
              })
            }
            aria-label={flipped.has(i) ? `${c.term}: ${c.def}` : `${c.term}. Show the answer.`}
          >
            {flipped.has(i) ? <MarkdownView text={c.def} className="md md--inline" inline /> : <span className="ac__term">{c.term}</span>}
          </button>
        ))}
      </div>
      <div className="ac__bar">
        <span>Tap a card to flip it.</span>
        <button className="btn btn--sm" disabled={savedAll} onClick={() => myCards.add(items.map((c) => ({ term: c.term, def: c.def, topic })))}>
          {savedAll ? 'Saved to your flashcards' : 'Save to your flashcards'}
        </button>
      </div>
    </div>
  );
}
