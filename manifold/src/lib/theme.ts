import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem('manifold-theme', t);
  } catch {
    /* storage unavailable */
  }
}

/** Re-renders when the theme attribute changes (canvas layers read CSS variables). */
export function useThemeName(): Theme {
  const [t, setT] = useState<Theme>(getTheme);
  useEffect(() => {
    const mo = new MutationObserver(() => setT(getTheme()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return t;
}
