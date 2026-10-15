import katex from 'katex';
import 'katex/dist/katex.min.css';
import { memo, useMemo } from 'react';

const macros = {
  '\\R': '\\mathbb{R}',
  '\\argmax': '\\operatorname*{arg\\,max}',
  '\\argmin': '\\operatorname*{arg\\,min}',
};

function render(tex: string, display: boolean) {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, macros, strict: false, trust: false });
  } catch {
    return tex;
  }
}

/** Inline math. */
export const M = memo(function M({ children }: { children: string }) {
  const html = useMemo(() => render(children, false), [children]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
});

/** Display math. */
export const MB = memo(function MB({ children }: { children: string }) {
  const html = useMemo(() => render(children, true), [children]);
  return <div className="math-block" dangerouslySetInnerHTML={{ __html: html }} />;
});
