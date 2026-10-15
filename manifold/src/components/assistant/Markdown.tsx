import 'katex/dist/katex.min.css';
import { memo, useMemo, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Source } from '../../rag/types';
import { pageLabel } from '../../rag/util';

/* A tiny rehype plugin: turn [3] or [1, 4] in prose into <cite data-n="..."> elements. */
interface HNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
}

const CITE = /\[(\d{1,2}(?:\s*[,–-]\s*\d{1,2})*)\]/g;

function expand(spec: string): number[] {
  const out: number[] = [];
  for (const part of spec.split(',')) {
    const [a, b] = part.split(/[–-]/).map((x) => Number(x.trim()));
    if (b && b > a && b - a < 12) for (let i = a; i <= b; i++) out.push(i);
    else if (a) out.push(a);
  }
  return out;
}

function rehypeCitations() {
  const walk = (node: HNode) => {
    if (!node.children) return;
    if (node.tagName === 'code' || node.tagName === 'pre' || (node.properties?.className as string[] | undefined)?.some?.((c) => String(c).startsWith('katex'))) return;
    const next: HNode[] = [];
    for (const child of node.children) {
      if (child.type === 'text' && child.value && CITE.test(child.value)) {
        CITE.lastIndex = 0;
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = CITE.exec(child.value))) {
          if (m.index > last) next.push({ type: 'text', value: child.value.slice(last, m.index) });
          for (const n of expand(m[1])) next.push({ type: 'element', tagName: 'cite', properties: { dataN: String(n) }, children: [{ type: 'text', value: String(n) }] });
          last = m.index + m[0].length;
        }
        if (last < child.value.length) next.push({ type: 'text', value: child.value.slice(last) });
      } else {
        walk(child);
        next.push(child);
      }
    }
    node.children = next;
  };
  return (tree: HNode) => walk(tree);
}

/** Normalise \( \) and \[ \] delimiters, which some models prefer, to dollar signs. */
function normaliseMath(s: string) {
  return (
    s
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => `\n$$${t}$$\n`)
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => `$${t}$`)
      // "$$ x $$" on one line is display maths; remark-math needs the fences on their own lines
      .replace(/^([ \t]*)\$\$([^\n]+?)\$\$[ \t]*$/gm, (_, ind, t) => `${ind}$$\n${ind}${t.trim()}\n${ind}$$`)
  );
}

function Cite({ n, sources, onCite }: { n: number; sources?: Source[]; onCite?: (n: number) => void }) {
  const s = sources?.find((x) => x.n === n);
  if (!s) return <sup className="cite cite--missing">{n}</sup>;
  const where = [s.heading.filter((h) => h !== s.title).slice(-1)[0], pageLabel(s.pageStart, s.pageEnd, s.kind)].filter(Boolean).join(', ');
  return (
    <button type="button" className="cite" onClick={() => onCite?.(n)} aria-label={`Source ${n}: ${s.title}${where ? `, ${where}` : ''}`}>
      {n}
      <span className="cite__tip" role="tooltip">
        <span className="cite__tip-title">{s.title}</span>
        {where && <span className="cite__tip-where">{where}</span>}
        <span className="cite__tip-text">{s.text.replace(/^#+\s.*$/gm, '').replace(/\s+/g, ' ').trim().slice(0, 220)}…</span>
      </span>
    </button>
  );
}

export const MarkdownView = memo(function MarkdownView({
  text,
  sources,
  onCite,
  className = 'md',
  inline = false,
}: {
  text: string;
  sources?: Source[];
  onCite?: (n: number) => void;
  className?: string;
  /** render inside phrasing content (buttons, labels): paragraphs become spans */
  inline?: boolean;
}) {
  const src = useMemo(() => normaliseMath(text), [text]);
  const components = useMemo(
    () => ({
      cite: (p: { node?: unknown; children?: ReactNode; 'data-n'?: string }) => <Cite n={Number(p['data-n'])} sources={sources} onCite={onCite} />,
      a: ({ node: _n, ...p }: { node?: unknown; href?: string; children?: ReactNode }) => (
        <a {...p} target={p.href?.startsWith('#') ? undefined : '_blank'} rel="noreferrer" />
      ),
      table: ({ node: _n, ...p }: { node?: unknown; children?: ReactNode }) => (
        <div className="table-wrap">
          <table className="tbl" {...p} />
        </div>
      ),
      ...(inline ? { p: ({ node: _n, ...p }: { node?: unknown; children?: ReactNode }) => <span {...p} /> } : {}),
    }),
    [sources, onCite, inline],
  );
  const Wrap = inline ? 'span' : 'div';
  return (
    <Wrap className={className}>
      <Markdown remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }], rehypeCitations]} components={components as never}>
        {src}
      </Markdown>
    </Wrap>
  );
});
