import { Children, isValidElement, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconAlert, IconBulb, IconCalc, IconChevron, IconCopy, IconSpark, IconTarget } from './icons';
import { MB } from './Math';

/* ------------------------------------------------------------------------ */
/* Section headings with anchors                                             */
/* ------------------------------------------------------------------------ */

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function H2({ children, id }: { children: string; id?: string }) {
  return (
    <h2 id={id ?? slug(children)} data-toc={children}>
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3>{children}</h3>;
}

/* ------------------------------------------------------------------------ */
/* Definition, notes, key points                                             */
/* ------------------------------------------------------------------------ */

export function Def({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="def">
      <div className="def__term">{term}</div>
      <div className="def__body">{children}</div>
    </div>
  );
}

type NoteKind = 'exam' | 'tip' | 'warn' | 'insight';
const noteIcon: Record<NoteKind, ReactNode> = {
  exam: <IconTarget />,
  tip: <IconBulb />,
  warn: <IconAlert />,
  insight: <IconSpark />,
};
const noteTitle: Record<NoteKind, string> = {
  exam: 'For the exam',
  tip: 'Intuition',
  warn: 'Common mistake',
  insight: 'Why it matters',
};

export function Note({ kind = 'tip', title, children }: { kind?: NoteKind; title?: string; children: ReactNode }) {
  return (
    <aside className={`note note--${kind}`}>
      <div className="note__title">
        {noteIcon[kind]}
        {title ?? noteTitle[kind]}
      </div>
      {typeof children === 'string' ? <p>{children}</p> : children}
    </aside>
  );
}

export function KeyPoints({ children, title = 'Key takeaways' }: { children: ReactNode; title?: string }) {
  return (
    <section className="keypoints">
      <div className="keypoints__title">{title}</div>
      <ul>{children}</ul>
    </section>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="steps">{children}</ol>;
}

export function Compare({ cols }: { cols: { title: string; items: ReactNode[] }[] }) {
  return (
    <div className="compare" style={{ ['--cols' as string]: cols.length }}>
      {cols.map((c) => (
        <div key={c.title}>
          <h4>{c.title}</h4>
          <ul>
            {c.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Simple data table from arrays. */
export function Table({
  head,
  rows,
  numeric = [],
  foot,
  caption,
  hl,
}: {
  head: ReactNode[];
  rows: ReactNode[][];
  numeric?: number[];
  foot?: ReactNode[];
  caption?: string;
  hl?: (rowIndex: number) => boolean;
}) {
  return (
    <div className="table-wrap">
      <table className="tbl">
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={numeric.includes(i) ? 'n' : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} data-hl={hl?.(ri) ? 'true' : undefined}>
              {r.map((c, ci) => (
                <td key={ci} className={numeric.includes(ci) ? 'n' : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr>
              {foot.map((c, ci) => (
                <td key={ci} className={numeric.includes(ci) ? 'n' : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Figures                                                                   */
/* ------------------------------------------------------------------------ */

export function Figure({
  title,
  hint,
  caption,
  children,
  bare = false,
}: {
  title?: string;
  hint?: string;
  caption?: ReactNode;
  children: ReactNode;
  bare?: boolean;
}) {
  return (
    <figure className="figure">
      <div className="figure__frame">
        {(title || hint) && (
          <div className="figure__head">
            {title && <div className="figure__title">{title}</div>}
            {hint && <div className="figure__hint">{hint}</div>}
          </div>
        )}
        <div className={bare ? undefined : 'figure__body'}>{children}</div>
      </div>
      {caption && <figcaption className="figure__caption">{caption}</figcaption>}
    </figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Exam answer blueprint                                                     */
/* ------------------------------------------------------------------------ */

export function Answer({ q, marks, children, src }: { q: string; marks?: number | string; children: ReactNode; src?: string }) {
  return (
    <details className="answer">
      <summary>
        <IconChevron className="answer__chev" />
        <span className="answer__q">
          {q}
          {src && (
            <span className="chip chip--see" style={{ marginLeft: '0.5rem', verticalAlign: '0.1em' }}>
              {src}
            </span>
          )}
        </span>
        {marks !== undefined && <span className="answer__marks">{typeof marks === 'number' ? `${marks} marks` : marks}</span>}
      </summary>
      <div className="answer__body">{children}</div>
    </details>
  );
}

export function SolverLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="btn btn--sm" to={`/lab/${to}`} style={{ fontFamily: 'var(--font-ui)' }}>
      <IconCalc />
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------------ */
/* Code blocks with a tiny Python highlighter                                */
/* ------------------------------------------------------------------------ */

const KW = new Set(
  'import from as def return for in if else elif while print True False None and or not with lambda class range len'.split(' '),
);

function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(#.*$)|("[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Za-z_][A-Za-z0-9_]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    if (m[1]) out.push(<span key={k++} className="c">{m[1]}</span>);
    else if (m[2]) out.push(<span key={k++} className="s">{m[2]}</span>);
    else if (m[3]) out.push(<span key={k++} className="n">{m[3]}</span>);
    else if (m[4]) out.push(<span key={k++} className={KW.has(m[4]) ? 'k' : 'f'}>{m[4]}</span>);
    else if (m[5]) out.push(KW.has(m[5]) ? <span key={k++} className="k">{m[5]}</span> : m[5]);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function Code({ children, lang = 'python', title }: { children: string; lang?: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const text = children.replace(/^\n+|\s+$/g, '');
  const lines = text.split('\n');
  return (
    <div className="code">
      <div className="code__bar">
        <span>{title ?? lang}</span>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            });
          }}
        >
          <IconCopy />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>
          {lines.map((l, i) => (
            <span key={i}>
              {lang === 'python' ? highlight(l) : l}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Display equation with an optional label to its right. */
export function Eq({ children }: { children: string }) {
  return <MB>{children}</MB>;
}

/** Utility to count children (for conditional layouts). */
export function count(children: ReactNode) {
  return Children.toArray(children).filter(isValidElement).length;
}
