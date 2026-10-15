import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { findLesson, lessonPath, modules, neighbours } from '../content/course';
import { IconCalc, IconChat, IconCheck } from '../components/icons';
import { findSolver } from '../lab/registry';
import { progress, useProgress } from '../lib/progress';
import NotFound from './NotFound';

function useToc(container: React.RefObject<HTMLElement | null>, key: string) {
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState<string>('');
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const scan = () => {
      const hs = Array.from(el.querySelectorAll<HTMLElement>('h2[data-toc]'));
      setItems((prev) => {
        const next = hs.map((h) => ({ id: h.id, label: h.dataset.toc ?? h.textContent ?? '' }));
        return prev.length === next.length && prev.every((p, i) => p.id === next[i].id) ? prev : next;
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [container, key]);

  useEffect(() => {
    if (!items.length) return;
    const onScroll = () => {
      let cur = items[0]?.id ?? '';
      for (const it of items) {
        const h = document.getElementById(it.id);
        if (h && h.getBoundingClientRect().top < 140) cur = it.id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items]);
  return { items, active };
}

export default function LessonPage() {
  const { module, lesson } = useParams();
  const l = findLesson(Number(module), lesson ?? '');
  const p = useProgress();
  const body = useRef<HTMLDivElement>(null);
  const toc = useToc(body, `${module}/${lesson}`);

  useEffect(() => {
    if (l) progress.setLast(lessonPath(l));
  }, [l]);

  useEffect(() => {
    if (l) document.title = `${l.title} — Manifold`;
  }, [l]);

  // deep links from the study assistant land on a section: /m/3/pca#eigenvectors
  const { hash } = useLocation();
  useEffect(() => {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    if (!id) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 40) {
        window.clearInterval(timer);
        el?.scrollIntoView({ block: 'start' });
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [hash, module, lesson]);

  if (!l) return <NotFound />;
  const mod = modules[l.module - 1];
  const key = `${l.module}/${l.id}`;
  const done = !!p.lessons[key];
  const { prev, next } = neighbours(l);
  const Body = l.Component;

  return (
    <div className="page" style={{ ['--mod-color' as string]: mod.color }}>
      <div className="lesson">
        <div className="lesson__body">
          <header className="page-head" style={{ marginBottom: '2rem' }}>
            <Link to={`/m/${mod.n}`} className="page-head__kicker">
              <span style={{ width: 9, height: 9, borderRadius: 3, background: mod.color, display: 'inline-block' }} />
              Module {mod.n}, lesson {l.index + 1} of {mod.lessons.length}
            </Link>
            <h1>{l.title}</h1>
            <p className="page-head__lede">{l.summary}</p>
            <div className="chip-row" style={{ marginTop: '1.1rem' }}>
              <span className="chip">{l.minutes} min read</span>
              {l.see?.map((s) => (
                <span key={s} className="chip chip--see">
                  Asked in {s}
                </span>
              ))}
              {done && (
                <span className="chip chip--done">
                  <IconCheck width={12} height={12} /> Understood
                </span>
              )}
            </div>
            <div className="chip-row" style={{ marginTop: '0.9rem' }}>
              <Link to={`/assistant?scope=${encodeURIComponent(`lesson:${l.module}/${l.id}`)}`} className="btn btn--sm">
                <IconChat /> Ask the assistant about this lesson
              </Link>
              {l.solvers?.map((sid) => {
                  const s = findSolver(sid);
                  return s ? (
                    <Link key={sid} to={`/lab/${sid}`} className="btn btn--sm">
                      <IconCalc /> Solve with: {s.title}
                    </Link>
                  ) : null;
                })}
            </div>
          </header>

          <div className="prose" ref={body}>
            <Suspense fallback={<div style={{ height: 400 }} aria-busy="true" />}>
              <Body />
            </Suspense>
          </div>

          <div className="done-bar">
            <p>{done ? 'Marked as understood. It now counts towards your progress.' : 'Worked through the figures and can explain this in your own words?'}</p>
            <button className={done ? 'btn' : 'btn btn--primary'} onClick={() => progress.toggleLesson(key)}>
              <IconCheck />
              {done ? 'Unmark' : 'Mark as understood'}
            </button>
          </div>

          <nav className="pager" aria-label="Lesson navigation">
            {prev && (
              <Link to={lessonPath(prev)}>
                <small>Previous</small>
                <strong>{prev.title}</strong>
              </Link>
            )}
            {next && (
              <Link to={lessonPath(next)} className="pager__next">
                <small>Next</small>
                <strong>{next.title}</strong>
              </Link>
            )}
          </nav>
        </div>

        <aside className="lesson__aside" aria-label="On this page">
          {toc.items.length > 0 && (
            <div className="toc">
              <div className="toc__title">On this page</div>
              {toc.items.map((t) => (
                <a key={t.id} href={`#${t.id}`} data-active={toc.active === t.id} onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}>
                  {t.label}
                </a>
              ))}
            </div>
          )}
          {l.qb && l.qb.length > 0 && (
            <div className="toc" style={{ marginTop: '1.5rem' }}>
              <div className="toc__title">Answers question bank</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-3)', lineHeight: 1.5 }}>{l.qb.join(', ')}</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
