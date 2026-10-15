import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { lessonPath, modules } from '../content/course';
import { questions, seePaper } from '../content/questions';
import { IconCheck } from '../components/icons';
import { solvers } from '../lab/registry';
import { useProgress } from '../lib/progress';
import NotFound from './NotFound';

export default function ModulePage() {
  const { module } = useParams();
  const m = modules[Number(module) - 1];
  const p = useProgress();
  useEffect(() => {
    if (m) document.title = `Module ${m.n}: ${m.title} — Manifold`;
  }, [m]);
  if (!m) return <NotFound />;

  const qs = questions.filter((q) => q.module === m.n);
  const sv = solvers.filter((s) => s.module === m.n);
  const see = seePaper.filter((s) => s.module === m.n);
  const done = m.lessons.filter((l) => p.lessons[`${m.n}/${l.id}`]).length;

  return (
    <div className="page" style={{ ['--mod-color' as string]: m.color }}>
      <div className="module-hero">
        <div>
          <div className="page-head__kicker">Module {m.n} of 5</div>
          <h1 className="module-hero__title">{m.title}</h1>
          <p className="page-head__lede">{m.blurb}</p>
          <p className="module-hero__outcome">
            <strong>By the end you can:</strong> {m.outcome}
          </p>
          <div className="chip-row" style={{ marginTop: '1.2rem' }}>
            <span className="chip">{m.lessons.length} lessons</span>
            <span className="chip">{m.lessons.reduce((s, l) => s + l.minutes, 0)} min of reading</span>
            <span className="chip">{qs.length} bank questions</span>
            <span className="chip chip--see">20 marks in the SEE</span>
          </div>
        </div>
        <img src={`art/m${m.n}.webp`} alt="" className="module-hero__art" width={1600} height={1000} />
      </div>

      <section style={{ marginTop: '2.5rem' }}>
        <div className="section-head">
          <h2>Lessons</h2>
          <span className="section-head__meta">
            {done} of {m.lessons.length} understood
          </span>
        </div>
        <div className="index-list">
          {m.lessons.map((l, i) => {
            const isDone = !!p.lessons[`${m.n}/${l.id}`];
            return (
              <Link key={l.id} to={lessonPath(l)} className="index-row">
                <span className="index-row__num" style={{ color: isDone ? 'var(--viridian)' : undefined }}>
                  {isDone ? <IconCheck width={20} height={20} style={{ margin: '0 auto' }} /> : `${m.n}.${i + 1}`}
                </span>
                <span>
                  <div className="index-row__title">{l.title}</div>
                  <div className="index-row__desc">{l.summary}</div>
                </span>
                <span className="chip-row" style={{ justifyContent: 'flex-end' }}>
                  {l.see?.map((s) => (
                    <span key={s} className="chip chip--see">
                      {s}
                    </span>
                  ))}
                  <span className="chip">{l.minutes} min</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="module-cols">
        <section>
          <div className="section-head">
            <h2>Numericals you can solve here</h2>
          </div>
          <div className="index-list">
            {sv.map((s) => (
              <Link key={s.id} to={`/lab/${s.id}`} className="index-row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <span>
                  <div className="index-row__title" style={{ fontSize: '0.98rem' }}>
                    {s.title}
                  </div>
                  <div className="index-row__desc">{s.asks}</div>
                </span>
                {s.see && <span className="chip chip--see">On SEE ’25</span>}
              </Link>
            ))}
            {!sv.length && <p className="index-row__desc" style={{ padding: '1rem 0' }}>This module’s solvers live in other modules.</p>}
          </div>
        </section>
        <section>
          <div className="section-head">
            <h2>On the Feb 2025 paper</h2>
          </div>
          <div className="index-list">
            {see.map((s) => (
              <Link key={s.q} to={s.solver ? `/lab/${s.solver}` : s.lesson} className="index-row" style={{ gridTemplateColumns: '3rem minmax(0,1fr)' }}>
                <span className="index-row__num">{s.q}</span>
                <span className="index-row__desc" style={{ color: 'var(--ink)', marginTop: 0 }}>
                  {s.text}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
