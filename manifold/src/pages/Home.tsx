import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { allLessons, lessonPath, modules } from '../content/course';
import { questions, seePaper } from '../content/questions';
import { IconCalc, IconCards, IconChat, IconLayers, IconList, IconQuiz, IconSigma } from '../components/icons';
import { solvers } from '../lab/registry';
import { useProgress } from '../lib/progress';
import { f } from '../lib/fmt';

const Hero3D = lazy(() => import('./Hero3D').then((m) => ({ default: m.Hero3D })));

export default function Home() {
  const p = useProgress();
  const [status, setStatus] = useState<{ loss: number; steps: number } | null>(null);
  const onStatus = useCallback((s: { loss: number; steps: number }) => setStatus(s), []);
  useEffect(() => {
    document.title = 'Manifold — Machine Learning, visually';
  }, []);

  const last = p.last ? allLessons.find((l) => lessonPath(l) === p.last) : undefined;
  const done = allLessons.filter((l) => p.lessons[`${l.module}/${l.id}`]).length;

  return (
    <div className="home">
      <section className="hero">
        <Suspense fallback={<div className="hero__canvas" />}>
          <Hero3D onStatus={onStatus} />
        </Suspense>
        <div className="hero__fade" aria-hidden="true" />
        <div className="hero__copy">
          <p className="hero__course">BAI503 Machine Learning, fifth semester</p>
          <h1 className="hero__title">Machine learning, shown working.</h1>
          <p className="hero__lede">
            Every topic in your syllabus as theory you can write in the exam, figures you can poke at, and numericals solved one step at a
            time.
          </p>
          <div className="hero__actions">
            {last ? (
              <Link className="btn btn--primary hero__btn" to={lessonPath(last)}>
                Continue: {last.title}
              </Link>
            ) : (
              <Link className="btn btn--primary hero__btn" to="/m/1/what-is-ml">
                Start with Module 1
              </Link>
            )}
            <Link className="btn hero__btn" to="/lab">
              <IconCalc /> Solve a numerical
            </Link>
          </div>
        </div>
        <div className="hero__readout" aria-live="off">
          <span>Gradient descent with momentum</span>
          {status && (
            <span className="num">
              loss {f(status.loss, 3)} after {status.steps} steps
            </span>
          )}
          <span className="hero__readout-hint">Drag to rotate. Click the surface to drop a new starting point.</span>
        </div>
      </section>

      <div className="page home__body">
        <section>
          <div className="section-head">
            <h2>The syllabus</h2>
            <span className="section-head__meta">
              {done} of {allLessons.length} lessons understood
            </span>
          </div>
          <div className="modlist">
            {modules.map((m) => {
              const md = m.lessons.filter((l) => p.lessons[`${m.n}/${l.id}`]).length;
              return (
                <Link key={m.n} to={`/m/${m.n}`} className="modrow" style={{ ['--mod-color' as string]: m.color }}>
                  <img src={`art/m${m.n}-thumb.webp`} alt="" className="modrow__glyph" loading="lazy" width={560} height={420} />
                  <span className="modrow__num">{m.n}</span>
                  <span className="modrow__text">
                    <span className="modrow__title">{m.title}</span>
                    <span className="modrow__blurb">{m.blurb}</span>
                  </span>
                  <span className="modrow__meta">
                    <span>
                      {md}/{m.lessons.length} lessons
                    </span>
                    <span className="meter" style={{ width: '7rem' }}>
                      <span style={{ width: `${(md / m.lessons.length) * 100}%`, background: m.color }} />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="home__paper">
          <div className="section-head">
            <h2>The Feb 2025 paper, mapped</h2>
            <span className="section-head__meta">Answer one full question per module. Each cell opens the lesson or solver.</span>
          </div>
          <div className="paper">
            {modules.map((m) => (
              <div key={m.n} className="paper__mod" style={{ ['--mod-color' as string]: m.color }}>
                <div className="paper__head">
                  <span className="paper__n">{m.n}</span>
                  {m.short}
                </div>
                {seePaper
                  .filter((s) => s.module === m.n)
                  .map((s, i) => (
                    <div key={s.q}>
                      {i === 2 && <div className="paper__or">or</div>}
                      <Link to={s.solver ? `/lab/${s.solver}` : s.lesson} className="paper__q">
                        <b>{s.q}</b>
                        <span>{s.text}</span>
                        {s.solver && <IconCalc className="paper__icon" aria-label="Has a step-by-step solver" />}
                      </Link>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Exam desk</h2>
          </div>
          <div className="desk">
            <Link to="/assistant" className="desk__item">
              <IconChat />
              <span>
                <strong>Study assistant</strong>
                <small>Ask questions and get cited answers from the lessons and your own notes</small>
              </span>
            </Link>
            <Link to="/library" className="desk__item">
              <IconLayers />
              <span>
                <strong>Knowledge base</strong>
                <small>Add lecture notes, slides and past papers for the assistant to use</small>
              </span>
            </Link>
            <Link to="/lab" className="desk__item">
              <IconCalc />
              <span>
                <strong>Numerical solvers</strong>
                <small>{solvers.length} step-by-step solvers preloaded with question-bank data</small>
              </span>
            </Link>
            <Link to="/questions" className="desk__item">
              <IconList />
              <span>
                <strong>Question bank</strong>
                <small>All {questions.length} sample questions, linked to their answers</small>
              </span>
            </Link>
            <Link to="/formulas" className="desk__item">
              <IconSigma />
              <span>
                <strong>Formula sheet</strong>
                <small>Every equation in the course on one page</small>
              </span>
            </Link>
            <Link to="/flashcards" className="desk__item">
              <IconCards />
              <span>
                <strong>Flashcards</strong>
                <small>Definitions to recall before the exam</small>
              </span>
            </Link>
            <Link to="/quiz" className="desk__item">
              <IconQuiz />
              <span>
                <strong>Practice quiz</strong>
                <small>Multiple-choice checks for each module</small>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
