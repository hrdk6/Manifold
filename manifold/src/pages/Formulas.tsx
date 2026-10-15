import { useEffect, useMemo, useState } from 'react';
import { MB } from '../components/Math';
import { modules } from '../content/course';
import { formulaGroups } from '../content/formulas';

export default function Formulas() {
  const [q, setQ] = useState('');
  useEffect(() => {
    document.title = 'Formula sheet — Manifold';
  }, []);
  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    return formulaGroups
      .map((g) => ({ ...g, items: g.items.filter((f) => !t || `${f.name} ${f.note ?? ''}`.toLowerCase().includes(t)) }))
      .filter((g) => g.items.length);
  }, [q]);
  return (
    <div className="page">
      <header className="page-head">
        <h1>Formula sheet</h1>
        <p className="page-head__lede">Every equation in the course, grouped by module. Skim it the night before the exam; each one is derived and used in its lesson.</p>
      </header>
      <div className="qfilters">
        <label className="ctl" style={{ minWidth: 'min(22rem, 100%)' }}>
          <span className="ctl__label">Filter formulas</span>
          <input className="field" placeholder="e.g. entropy, recall, eigen" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="btn btn--sm" onClick={() => window.print()}>
          Print
        </button>
      </div>
      {groups.map((g) => (
        <section key={g.module} className="formula-group" style={{ ['--mod-color' as string]: modules[g.module - 1].color }}>
          <h2>
            <span className="paper__n">{g.module}</span>
            {g.title}
          </h2>
          <div className="formulas">
            {g.items.map((f) => (
              <div key={f.name} className="formula">
                <div className="formula__name">{f.name}</div>
                <MB>{f.tex}</MB>
                {f.note && <div className="formula__note">{f.note}</div>}
              </div>
            ))}
          </div>
        </section>
      ))}
      {!groups.length && <p className="empty">No formula matches “{q}”.</p>}
    </div>
  );
}
