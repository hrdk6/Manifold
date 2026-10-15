import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { modules } from '../content/course';
import { solvers } from '../lab/registry';

export default function Lab() {
  useEffect(() => {
    document.title = 'Numerical solvers — Manifold';
  }, []);
  return (
    <div className="page">
      <header className="page-head">
        <h1>Numerical solvers</h1>
        <p className="page-head__lede">
          Each solver shows the full working the way an examiner wants to see it: tables, formulas, substitutions and the final answer.
          They come preloaded with the question-bank and SEE data; edit the numbers to practise your own.
        </p>
      </header>
      {modules.map((m) => {
        const list = solvers.filter((s) => s.module === m.n);
        if (!list.length) return null;
        return (
          <section key={m.n} className="lab-mod" style={{ ['--mod-color' as string]: m.color }}>
            <h2 className="lab-mod__title">
              <span className="paper__n">{m.n}</span>
              {m.title}
            </h2>
            <div className="lab-grid">
              {list.map((s) => (
                <Link key={s.id} to={`/lab/${s.id}`} className="lab-item">
                  <strong>
                    {s.title}
                    {s.see && <span className="chip chip--see">On SEE ’25</span>}
                  </strong>
                  <span>{s.desc}</span>
                  <em>{s.asks}</em>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
