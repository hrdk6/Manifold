import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seg } from '../components/controls';
import { modules } from '../content/course';
import { quiz } from '../content/quiz';
import { progress, useProgress } from '../lib/progress';
import { mulberry32, shuffle } from '../lib/rng';

export default function Quiz() {
  const p = useProgress();
  const [mod, setMod] = useState(0);
  const [round, setRound] = useState(1);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    document.title = 'Practice quiz — Manifold';
  }, []);
  const items = useMemo(() => {
    const base = quiz.filter((x) => !mod || x.module === mod);
    return shuffle(base, mulberry32(round * 31 + mod)).slice(0, mod ? base.length : 15);
  }, [mod, round]);
  const it = items[i];
  const key = mod ? `module-${mod}` : 'mixed';
  const restart = (m = mod) => {
    setMod(m);
    setRound((r) => r + 1);
    setI(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };
  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === it.answer) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 >= items.length) {
      setDone(true);
      progress.recordQuiz(key, score, items.length);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  };
  return (
    <div className="page">
      <div className="quiz-shell">
        <header className="page-head">
          <h1>Practice quiz</h1>
          <p className="page-head__lede">Quick checks on the ideas that most often trip students up. Every answer comes with the reason.</p>
        </header>
        <div className="qfilters">
          <Seg label="Module" value={mod} onChange={(v) => restart(v)} options={[{ value: 0, label: 'Mixed (15)' }, ...modules.map((x) => ({ value: x.n, label: String(x.n) }))]} />
          {p.quiz[key] && (
            <span className="chip chip--done">
              Best: {p.quiz[key].best}/{p.quiz[key].total}
            </span>
          )}
        </div>
        {done ? (
          <div className="score-card">
            <div className="stat-big">
              {score} / {items.length}
            </div>
            <p style={{ marginTop: '0.6rem', fontFamily: 'var(--font-read)', fontSize: '1.1rem', color: 'var(--ink-2)' }}>
              {score === items.length
                ? 'Perfect score.'
                : score >= items.length * 0.7
                  ? 'Solid. Review the questions you missed in their lessons.'
                  : 'Worth another pass through the lessons, then try again.'}
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
              <button className="btn btn--primary" onClick={() => restart()}>
                Take a new set
              </button>
              {mod > 0 && (
                <Link className="btn" to={`/m/${mod}`}>
                  Back to Module {mod}
                </Link>
              )}
            </div>
          </div>
        ) : (
          it && (
            <>
              <div className="quiz-progress">
                <span>
                  Question {i + 1} of {items.length}
                </span>
                <div className="meter">
                  <span style={{ width: `${(i / items.length) * 100}%` }} />
                </div>
                <span>{score} correct</span>
              </div>
              <div className="quiz">
                <div className="chip" style={{ marginBottom: '0.7rem' }}>
                  Module {it.module}
                </div>
                <div className="quiz__q">{it.q}</div>
                <div className="quiz__opts">
                  {it.options.map((o, k) => {
                    const state = picked === null ? undefined : k === it.answer ? 'right' : k === picked ? 'wrong' : undefined;
                    return (
                      <button key={k} className="quiz__opt" data-state={state} disabled={picked !== null} onClick={() => choose(k)}>
                        <span className="quiz__letter">{String.fromCharCode(65 + k)}</span>
                        <span>{o}</span>
                      </button>
                    );
                  })}
                </div>
                {picked !== null && (
                  <div className="quiz__why">
                    <strong style={{ color: picked === it.answer ? 'var(--viridian)' : 'var(--rose)' }}>{picked === it.answer ? 'Correct. ' : 'Not quite. '}</strong>
                    {it.why}
                    <div style={{ marginTop: '0.8rem' }}>
                      <button className="btn btn--primary btn--sm" onClick={next} autoFocus>
                        {i + 1 >= items.length ? 'See your score' : 'Next question'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
