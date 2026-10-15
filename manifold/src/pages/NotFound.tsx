import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page not found — Manifold';
  }, []);
  return (
    <div className="page">
      <header className="page-head">
        <h1>This page isn’t in the syllabus</h1>
        <p className="page-head__lede">The link may be out of date. Pick a module from the menu, or search with Ctrl K.</p>
      </header>
      <Link className="btn btn--primary" to="/">
        Go to the overview
      </Link>
    </div>
  );
}
