import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { modules } from '../content/course';
import { questions } from '../content/questions';
import { Seg, Toggle } from '../components/controls';
import { IconBook, IconCalc, IconCheck } from '../components/icons';
import { progress, useProgress } from '../lib/progress';

export default function Questions() {
  const p = useProgress();
  const [mod, setMod] = useState<number>(0);
  const [kind, setKind] = useState<'all' | 'theory' | 'numerical'>('all');
  const [seeOnly, setSeeOnly] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  useEffect(() => {
    document.title = 'Question bank — Manifold';
  }, []);

  const list = useMemo(
    () =>
      questions.filter(
        (q) =>
          (!mod || q.module === mod) &&
          (kind === 'all' || q.kind === kind) &&
          (!seeOnly || q.see) &&
          (!hideDone || !p.questions[q.id]),
      ),
    [mod, kind, seeOnly, hideDone, p.questions],
  );
  const doneCount = questions.filter((q) => p.questions[q.id]).length;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Question bank</h1>
        <p className="page-head__lede">
          All {questions.length} sample questions from the BAI503 bank. Theory questions open the lesson that answers them; numericals open a
          solver with the data already filled in. Tick a question once you can answer it without looking.
        </p>
        <div className="chip-row" style={{ marginTop: '1rem' }}>
          <span className="chip chip--done">
            {doneCount} of {questions.length} ticked
          </span>
          <span className="chip chip--see">{questions.filter((q) => q.see).length} appeared on the Feb 2025 SEE</span>
        </div>
      </header>

      <div className="qfilters">
        <Seg
          label="Module"
          value={mod}
          onChange={setMod}
          options={[
            { value: 0, label: 'All' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' },
            { value: 5, label: '5' },
          ]}
        />
        <Seg
          label="Type"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'All' },
            { value: 'theory', label: 'Theory' },
            { value: 'numerical', label: 'Numerical' },
          ]}
        />
        <Toggle label="Only SEE ’25" checked={seeOnly} onChange={setSeeOnly} />
        <Toggle label="Hide ticked" checked={hideDone} onChange={setHideDone} />
      </div>

      {[1, 2, 3, 4, 5].map((m) => {
        const group = list.filter((q) => q.module === m);
        if (!group.length) return null;
        return (
          <section key={m} style={{ marginBottom: '2.25rem' }}>
            <h2 className="lab-mod__title" style={{ ['--mod-color' as string]: modules[m - 1].color }}>
              <span className="paper__n">{m}</span>
              {modules[m - 1].title}
            </h2>
            <div className="qlist">
              {group.map((q) => {
                const done = !!p.questions[q.id];
                return (
                  <div key={q.id} className="qrow">
                    <button
                      className="qrow__check"
                      aria-pressed={done}
                      aria-label={done ? 'Untick question' : 'Tick question as answered'}
                      onClick={() => progress.toggleQuestion(q.id)}
                    >
                      <IconCheck />
                    </button>
                    <span className="qrow__n">Q{q.n}</span>
                    <div>
                      <p className="qrow__text" data-done={done}>
                        {q.text}
                      </p>
                      <div className="chip-row" style={{ marginTop: '0.4rem' }}>
                        <span className="chip">{q.kind === 'theory' ? 'Theory' : 'Numerical'}</span>
                        {q.see && <span className="chip chip--see">{q.see}</span>}
                      </div>
                    </div>
                    <div className="qrow__actions">
                      <Link className="btn btn--sm" to={q.lesson}>
                        <IconBook /> Theory
                      </Link>
                      {q.solver && (
                        <Link className="btn btn--sm btn--primary" to={`/lab/${q.solver}`}>
                          <IconCalc /> Solve
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {!list.length && <p className="empty">No questions match these filters. Clear “Hide ticked” or pick another module.</p>}
    </div>
  );
}
