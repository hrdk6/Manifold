import { useState, type ReactNode } from 'react';
import { Figure } from '../components/prose';
import { IconCheck, IconX } from '../components/icons';

/* ------------------------------------------------------------------------ */
/* Sorting game: put each scenario in the right bin                          */
/* ------------------------------------------------------------------------ */

export interface SortItem {
  prompt: string;
  answer: string;
  why: ReactNode;
}

export function SorterGame({ title, hint, bins, items, caption }: { title: string; hint?: string; bins: string[]; items: SortItem[]; caption?: ReactNode }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const it = items[i % items.length];
  const finished = answered >= items.length && picked === null;

  const pick = (b: string) => {
    if (picked) return;
    setPicked(b);
    setAnswered((a) => a + 1);
    if (b === it.answer) setScore((s) => s + 1);
  };
  const next = () => {
    setPicked(null);
    setI((v) => v + 1);
  };
  const restart = () => {
    setI(0);
    setPicked(null);
    setScore(0);
    setAnswered(0);
  };

  return (
    <Figure title={title} hint={hint} caption={caption}>
      <div className="sorter">
        <div className="sorter__score">
          <span>
            Scenario {Math.min(answered + (picked ? 0 : 1), items.length)} of {items.length}
          </span>
          <span>
            {score} correct of {answered}
          </span>
        </div>
        {finished ? (
          <div className="sorter__card">
            <p className="sorter__prompt">
              You sorted {score} of {items.length} correctly.
              {score === items.length ? ' Every one right.' : ' Go round again to lock in the ones you missed.'}
            </p>
            <div className="sorter__bins">
              <button className="btn btn--primary btn--sm" onClick={restart}>
                Sort them again
              </button>
            </div>
          </div>
        ) : (
          <div className="sorter__card">
            <p className="sorter__prompt">{it.prompt}</p>
            <div className="sorter__bins">
              {bins.map((b) => {
                const state = !picked ? undefined : b === it.answer ? 'right' : b === picked ? 'wrong' : undefined;
                return (
                  <button
                    key={b}
                    className={`btn btn--sm ${state === 'right' ? 'btn--primary' : ''}`}
                    style={state === 'wrong' ? { borderColor: 'var(--rose)', color: 'var(--rose)' } : undefined}
                    onClick={() => pick(b)}
                    disabled={!!picked && state === undefined}
                  >
                    {state === 'right' && <IconCheck />}
                    {state === 'wrong' && <IconX />}
                    {b}
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className="sorter__fb">
                <span className={picked === it.answer ? 'pill-right' : 'pill-wrong'}>{picked === it.answer ? 'Correct. ' : `It’s ${it.answer}. `}</span>
                {it.why}
                <div style={{ marginTop: '0.75rem' }}>
                  <button className="btn btn--sm" onClick={next}>
                    {answered >= items.length ? 'See score' : 'Next scenario'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Inline multiple-choice check                                              */
/* ------------------------------------------------------------------------ */

export interface MCQ {
  q: string;
  options: string[];
  answer: number;
  why: ReactNode;
}

export function Check({ q, options, answer, why }: MCQ) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="quiz">
      <div className="quiz__q">{q}</div>
      <div className="quiz__opts">
        {options.map((o, i) => {
          const state = picked === null ? undefined : i === answer ? 'right' : i === picked ? 'wrong' : undefined;
          return (
            <button key={i} className="quiz__opt" data-state={state} disabled={picked !== null} onClick={() => setPicked(i)}>
              <span className="quiz__letter">{String.fromCharCode(65 + i)}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="quiz__why">
          <strong style={{ color: picked === answer ? 'var(--viridian)' : 'var(--rose)' }}>{picked === answer ? 'Right. ' : 'Not quite. '}</strong>
          {why}
          <div style={{ marginTop: '0.6rem' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setPicked(null)}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
