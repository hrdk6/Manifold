import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { allLessons, lessonPath, modules } from '../content/course';
import { IconCalc, IconCards, IconChat, IconChevron, IconHome, IconLayers, IconList, IconMoon, IconQuiz, IconSearch, IconSigma, IconSun } from '../components/icons';
import { useProgress } from '../lib/progress';
import type { Theme } from '../lib/theme';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="var(--ink)" />
      <path d="M10 44 C 20 22, 32 50, 54 18" fill="none" stroke="var(--paper)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M10 52 C 22 34, 34 58, 54 30" fill="none" stroke="var(--paper)" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
      <circle cx="44" cy="27" r="5.5" fill="var(--rose)" />
    </svg>
  );
}

export function Rail({ open, onSearch, onTheme, theme }: { open: boolean; onSearch: () => void; onTheme: () => void; theme: Theme }) {
  const { pathname } = useLocation();
  const p = useProgress();
  const activeModule = Number(pathname.match(/^\/m\/(\d)/)?.[1] ?? 0);
  const [openMods, setOpenMods] = useState<Record<number, boolean>>(() => ({ [activeModule || 1]: true }));

  useEffect(() => {
    if (activeModule) setOpenMods((o) => ({ ...o, [activeModule]: true }));
  }, [activeModule]);

  const done = allLessons.filter((l) => p.lessons[`${l.module}/${l.id}`]).length;
  const pct = Math.round((done / allLessons.length) * 100);

  return (
    <nav className="rail" data-open={open} aria-label="Course">
      <Link to="/" className="rail__brand">
        <BrandMark className="rail__brand-mark" />
        <span>
          <div className="rail__brand-name">Manifold</div>
          <div className="rail__brand-sub">BAI503 Machine Learning</div>
        </span>
      </Link>

      <button className="rail__search" onClick={onSearch}>
        <IconSearch width={15} height={15} />
        Search
        <kbd>Ctrl K</kbd>
      </button>

      <div className="rail__nav">
        <NavLink to="/" end className="rail__link" aria-current={pathname === '/' ? 'page' : undefined}>
          <IconHome width={16} height={16} />
          Overview
        </NavLink>
        <NavLink to="/assistant" className="rail__link">
          <IconChat width={16} height={16} />
          Study assistant
        </NavLink>
        <NavLink to="/library" className="rail__link">
          <IconLayers width={16} height={16} />
          Knowledge base
        </NavLink>

        <div className="rail__group-title">Syllabus</div>
        {modules.map((m) => {
          const isOpen = !!openMods[m.n];
          const mDone = m.lessons.filter((l) => p.lessons[`${m.n}/${l.id}`]).length;
          return (
            <div key={m.n} className="rail__module" data-open={isOpen} style={{ ['--mod-color' as string]: m.color }}>
              <button className="rail__module-btn" aria-expanded={isOpen} onClick={() => setOpenMods((o) => ({ ...o, [m.n]: !isOpen }))}>
                <span className="rail__module-num">{m.n}</span>
                <span>
                  {m.title}
                  <span style={{ display: 'block', fontWeight: 500, fontSize: '0.72rem', color: 'var(--ink-3)', marginTop: 2 }}>
                    {mDone}/{m.lessons.length} done
                  </span>
                </span>
                <IconChevron className="rail__chev" />
              </button>
              {isOpen && (
                <ul className="rail__lessons">
                  <li>
                    <Link className="rail__lesson" to={`/m/${m.n}`} aria-current={pathname === `/m/${m.n}` ? 'page' : undefined}>
                      <span className="rail__tick" style={{ borderStyle: 'dashed' }} />
                      Module overview
                    </Link>
                  </li>
                  {m.lessons.map((l) => {
                    const path = lessonPath(l);
                    return (
                      <li key={l.id}>
                        <Link className="rail__lesson" to={path} aria-current={pathname === path ? 'page' : undefined}>
                          <span className="rail__tick" data-done={!!p.lessons[`${m.n}/${l.id}`]} />
                          {l.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        <div className="rail__group-title">Exam desk</div>
        <NavLink to="/lab" className="rail__link">
          <IconCalc width={16} height={16} />
          Numerical solvers
        </NavLink>
        <NavLink to="/questions" className="rail__link">
          <IconList width={16} height={16} />
          Question bank
        </NavLink>
        <NavLink to="/formulas" className="rail__link">
          <IconSigma width={16} height={16} />
          Formula sheet
        </NavLink>
        <NavLink to="/flashcards" className="rail__link">
          <IconCards width={16} height={16} />
          Flashcards
        </NavLink>
        <NavLink to="/quiz" className="rail__link">
          <IconQuiz width={16} height={16} />
          Practice quiz
        </NavLink>
      </div>

      <div className="rail__foot">
        <div className="rail__progress">
          <div>
            {done} of {allLessons.length} lessons done
          </div>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button className="icon-btn" onClick={onTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </nav>
  );
}
