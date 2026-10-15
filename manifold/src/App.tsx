import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CommandPalette } from './shell/CommandPalette';
import { Rail } from './shell/Rail';
import { IconMenu, IconMoon, IconSearch, IconSun } from './components/icons';
import { getTheme, setTheme, useThemeName } from './lib/theme';
import { Link } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const ModulePage = lazy(() => import('./pages/ModulePage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const Lab = lazy(() => import('./pages/Lab'));
const SolverPage = lazy(() => import('./pages/SolverPage'));
const Questions = lazy(() => import('./pages/Questions'));
const Formulas = lazy(() => import('./pages/Formulas'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const Quiz = lazy(() => import('./pages/Quiz'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Assistant = lazy(() => import('./pages/Assistant'));
const Library = lazy(() => import('./pages/Library'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export function PageFallback() {
  return (
    <div className="page" aria-busy="true">
      <div style={{ height: '2.5rem', width: '40%', borderRadius: 8, background: 'var(--surface-2)' }} />
      <div style={{ height: '1rem', width: '70%', borderRadius: 6, background: 'var(--surface-2)', marginTop: '1.5rem' }} />
      <div style={{ height: '1rem', width: '60%', borderRadius: 6, background: 'var(--surface-2)', marginTop: '0.7rem' }} />
    </div>
  );
}

function Shell() {
  const [railOpen, setRailOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const theme = useThemeName();
  const { pathname } = useLocation();

  useEffect(() => setRailOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const flip = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark');

  return (
    <div className="shell">
      <Rail open={railOpen} onSearch={() => setPalette(true)} onTheme={flip} theme={theme} />
      <div className="scrim" data-open={railOpen} onClick={() => setRailOpen(false)} />
      <div className="shell__main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setRailOpen(true)} aria-label="Open course menu">
            <IconMenu />
          </button>
          <Link to="/" className="topbar__title">
            Manifold
          </Link>
          <div className="topbar__actions">
            <button className="icon-btn" onClick={() => setPalette(true)} aria-label="Search">
              <IconSearch />
            </button>
            <button className="icon-btn" onClick={flip} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </header>
        <main id="main">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/m/:module" element={<ModulePage />} />
              <Route path="/m/:module/:lesson" element={<LessonPage />} />
              <Route path="/lab" element={<Lab />} />
              <Route path="/lab/:solver" element={<SolverPage />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/formulas" element={<Formulas />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/library" element={<Library />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Shell />
    </HashRouter>
  );
}
