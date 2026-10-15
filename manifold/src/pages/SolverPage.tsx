import { Suspense, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { modules } from '../content/course';
import { IconBook } from '../components/icons';
import { findSolver } from '../lab/registry';
import NotFound from './NotFound';

export default function SolverPage() {
  const { solver } = useParams();
  const s = findSolver(solver ?? '');
  useEffect(() => {
    if (s) document.title = `${s.title} solver — Manifold`;
  }, [s]);
  if (!s) return <NotFound />;
  const m = modules[s.module - 1];
  const C = s.Component;
  return (
    <div className="page" style={{ ['--mod-color' as string]: m.color }}>
      <div className="solver">
        <header className="page-head" style={{ marginBottom: '1.75rem' }}>
          <Link to="/lab" className="page-head__kicker">
            <span style={{ width: 9, height: 9, borderRadius: 3, background: m.color, display: 'inline-block' }} />
            Module {m.n} solver
          </Link>
          <h1>{s.title}</h1>
          <p className="page-head__lede">{s.desc}</p>
          <div className="chip-row" style={{ marginTop: '1rem' }}>
            <span className="chip">Answers: {s.asks}</span>
            {s.see && <span className="chip chip--see">On the Feb 2025 SEE</span>}
            <Link to={s.lesson} className="chip chip--ultra" style={{ textDecoration: 'none' }}>
              <IconBook width={12} height={12} /> Read the theory
            </Link>
          </div>
        </header>
        <Suspense fallback={<div style={{ height: 300 }} aria-busy="true" />}>
          <C />
        </Suspense>
      </div>
    </div>
  );
}
