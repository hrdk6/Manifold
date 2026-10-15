import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { matchTerms, tokenize } from '../../rag/bm25';
import * as db from '../../rag/db';
import { getIndex, getMap, project, useKb } from '../../rag/kb';
import type { ChatTurn, Source, SourceKind } from '../../rag/types';
import { pageLabel } from '../../rag/util';
import { modules } from '../../content/course';
import { Plot } from '../Plot';
import { IconX } from '../icons';

export const KIND_LABEL: Record<SourceKind, string> = {
  pdf: 'PDF',
  docx: 'Word',
  pptx: 'Slides',
  text: 'Text',
  markdown: 'Markdown',
  html: 'Web page',
  image: 'Image',
  lesson: 'Lesson',
  bank: 'Exam desk',
};

/** Highlight words of a passage whose stems match the question. */
export function Highlighted({ text, query, limit }: { text: string; query: string; limit?: number }) {
  const terms = useMemo(() => matchTerms(query), [query]);
  const clipped = limit && text.length > limit ? text.slice(0, limit) + '…' : text;
  const parts = clipped.split(/(\s+)/);
  return (
    <>
      {parts.map((p, i) => {
        const toks = tokenize(p);
        return toks.length && toks.some((t) => terms.has(t)) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>;
      })}
    </>
  );
}

const cleanPassage = (t: string) =>
  t
    .replace(/^…/, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^- /gm, '• ')
    .replace(/\*\*/g, '')
    .replace(/```/g, '');

export function SourceCard({ s, query, active, onPage }: { s: Source; query: string; active?: boolean; onPage?: (s: Source) => void }) {
  const [open, setOpen] = useState(false);
  const where = [s.heading.filter((h) => h !== s.title).join(' › '), pageLabel(s.pageStart, s.pageEnd, s.kind)].filter(Boolean).join(', ');
  return (
    <article className="src-card" data-active={active || undefined} id={`src-${s.n}`}>
      <header className="src-card__head">
        <span className="src-card__n">{s.n}</span>
        <div className="src-card__titles">
          <div className="src-card__title">{s.title}</div>
          <div className="src-card__where">
            <span className="src-kind">{KIND_LABEL[s.kind]}</span>
            {where}
          </div>
        </div>
        <span className="src-card__score" title="Relevance relative to the other candidates">
          <i style={{ width: `${Math.round(Math.max(0.06, s.score) * 100)}%` }} />
        </span>
      </header>
      <p className="src-card__text">
        <Highlighted text={cleanPassage(s.text)} query={query} limit={open ? undefined : 420} />
      </p>
      <div className="src-card__actions">
        {s.text.length > 420 && (
          <button className="btn btn--ghost btn--sm" onClick={() => setOpen((o) => !o)}>
            {open ? 'Show less' : 'Show full passage'}
          </button>
        )}
        {s.route && (
          <Link className="btn btn--ghost btn--sm" to={s.route}>
            Open {s.kind === 'lesson' ? 'lesson' : 'page'}
          </Link>
        )}
        {s.kind === 'pdf' && s.pageStart && onPage && (
          <button className="btn btn--ghost btn--sm" onClick={() => onPage(s)}>
            View {pageLabel(s.pageStart, undefined, s.kind)}
          </button>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ retrieval trace */

function Bar({ v, tone }: { v?: number; tone: string }) {
  return (
    <span className="trace-bar" data-tone={tone}>
      <i style={{ width: `${Math.round((v ?? 0) * 100)}%` }} />
    </span>
  );
}

export function TraceView({ turn }: { turn: ChatTurn }) {
  const t = turn.trace;
  if (!t) return <p className="evidence__empty">This answer did not search the knowledge base.</p>;
  const { docs } = getIndex();
  const maxB = Math.max(...t.candidates.map((c) => c.bm25Score ?? 0), 1e-9);
  const maxRrf = Math.max(...t.candidates.map((c) => c.rrf), 1e-9);
  const sel = new Set(t.selected);
  const fmtMs = (ms?: number) => (ms === undefined ? '' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
  const steps: { title: string; body: ReactNode; ms?: string }[] = [
    {
      title: 'Understand the question',
      ms: fmtMs(t.ms.plan),
      body: (
        <ul className="trace-queries">
          {t.queries.map((q, i) => (
            <li key={i} data-kind={q.kind}>
              <span>{q.kind === 'question' ? 'Question' : q.kind === 'rewrite' ? 'Rewrite' : 'Imagined answer'}</span>
              {q.text}
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: `Search ${t.searched.toLocaleString()} passages two ways`,
      ms: fmtMs(t.ms.search),
      body: (
        <p>
          BM25 keyword search{t.dense ? ' and semantic search over embeddings' : ''} each ranked the passages for every query
          {t.dense ? '' : ' (semantic search was off or still indexing)'}. Reciprocal rank fusion merged the lists into {t.candidates.length} candidates.
        </p>
      ),
    },
    {
      title: t.reranked ? `Rerank the ${t.candidates.length} candidates` : 'Rank by fused score',
      ms: fmtMs(t.ms.rerank),
      body: <p>{t.reranked ? 'A cross-encoder read each candidate together with the question and rescored it. The highlighted rows went to the answer.' : 'Reranking was off, so the fused order stands.'}</p>,
    },
  ];
  return (
    <div className="trace">
      <ol className="trace-steps">
        {steps.map((s) => (
          <li key={s.title}>
            <div className="trace-steps__head">
              <strong>{s.title}</strong>
              {s.ms && <span>{s.ms}</span>}
            </div>
            {s.body}
          </li>
        ))}
      </ol>
      <div className="trace-legend">
        <span data-tone="lex">Keyword</span>
        <span data-tone="sem">Semantic</span>
        <span data-tone="rrf">Fused</span>
        {t.reranked && <span data-tone="rr">Reranked</span>}
      </div>
      <ol className="trace-table">
        {t.candidates.map((c, i) => (
          <li key={c.chunk.id} data-selected={sel.has(c.chunk.id) || undefined}>
            <span className="trace-table__rank">{i + 1}</span>
            <div className="trace-table__main">
              <div className="trace-table__title">
                {docs.get(c.chunk.docId)?.title ?? 'Removed document'}
                {c.chunk.heading.length > 0 && <span> › {c.chunk.heading[c.chunk.heading.length - 1]}</span>}
              </div>
              <div className="trace-table__bars">
                <Bar v={c.bm25Score !== undefined ? c.bm25Score / maxB : 0} tone="lex" />
                <Bar v={c.denseScore !== undefined ? Math.max(0, (c.denseScore - 0.2) / 0.6) : 0} tone="sem" />
                <Bar v={c.rrf / maxRrf} tone="rrf" />
                {t.reranked && <Bar v={c.score} tone="rr" />}
              </div>
            </div>
            <span className="trace-table__ranks" title="Best keyword rank and semantic rank">
              {c.bm25Rank ? `#${c.bm25Rank}` : '–'} / {c.denseRank ? `#${c.denseRank}` : '–'}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ knowledge map */

const moduleColor = (m?: number) => (m ? modules[m - 1]?.color : undefined);

export function KnowledgeMap({ turn, height = 320, onPick }: { turn?: ChatTurn; height?: number; onPick?: (docId: string) => void }) {
  const kb = useKb();
  const map = useMemo(() => getMap(), [kb.version, kb.embedded]); // eslint-disable-line react-hooks/exhaustive-deps
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  if (!map) return <p className="evidence__empty">The map appears once the semantic index has a few passages.</p>;
  const { chunks, docs } = getIndex();
  const xs = map.points.map((p) => p.x);
  const ys = map.points.map((p) => p.y);
  const pad = 0.06;
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const xd: [number, number] = [x0 - (x1 - x0) * pad, x1 + (x1 - x0) * pad];
  const yd: [number, number] = [y0 - (y1 - y0) * pad, y1 + (y1 - y0) * pad];
  const selected = new Set(turn?.sources?.flatMap((s) => s.chunkIds) ?? []);
  const q = turn?.queryVec ? project(map, turn.queryVec) : null;
  const colorOf = (docId: string) => {
    const d = docs.get(docId);
    return moduleColor(d?.module) ?? (d?.builtin ? 'var(--ink-3)' : 'var(--ink)');
  };
  return (
    <div className="kmap">
      <Plot
        xDomain={xd}
        yDomain={yd}
        height={height}
        axes={false}
        grid={false}
        margin={{ t: 8, r: 8, b: 8, l: 8 }}
        ariaLabel="Map of every passage in the knowledge base, projected onto two principal components"
        layerKey={`${map.version}-${turn?.id ?? ''}`}
        layer={(ctx, sc) => {
          const css = getComputedStyle(document.documentElement);
          const resolve = (c: string) => (c.startsWith('var(') ? css.getPropertyValue(c.slice(4, -1)).trim() : c);
          for (const p of map.points) {
            const c = chunks[p.idx];
            if (!c || selected.has(c.id)) continue;
            ctx.globalAlpha = turn ? 0.28 : 0.6;
            ctx.fillStyle = resolve(colorOf(c.docId));
            ctx.beginPath();
            ctx.arc(sc.x(p.x), sc.y(p.y), 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }}
        onPointer={(kind, [px, py], e) => {
          if (kind === 'leave') return setHover(null);
          if (kind !== 'move' && kind !== 'down') return;
          let best = -1;
          let bd = Infinity;
          const box = e.currentTarget.getBoundingClientRect();
          const sx = (xd[1] - xd[0]) / Math.max(1, box.width - 16);
          const sy = (yd[1] - yd[0]) / Math.max(1, box.height - 16);
          for (const p of map.points) {
            const d = ((p.x - px) / sx) ** 2 + ((p.y - py) / sy) ** 2;
            if (d < bd) {
              bd = d;
              best = p.idx;
            }
          }
          if (best < 0 || bd > 120) return setHover(null);
          const c = chunks[best];
          const d = docs.get(c.docId);
          const pt = map.points.find((p) => p.idx === best)!;
          setHover({ x: pt.x, y: pt.y, label: `${d?.title ?? ''}${c.heading.length ? ` › ${c.heading[c.heading.length - 1]}` : ''}` });
          if (kind === 'down' && d) onPick?.(d.id);
        }}
      >
        {(sc) => (
          <g>
            {map.points
              .filter((p) => chunks[p.idx] && selected.has(chunks[p.idx].id))
              .map((p) => (
                <circle key={p.idx} cx={sc.x(p.x)} cy={sc.y(p.y)} r={5} fill={colorOf(chunks[p.idx].docId)} stroke="var(--surface)" strokeWidth={1.5} />
              ))}
            {q && (
              <g transform={`translate(${sc.x(q[0])},${sc.y(q[1])})`}>
                <circle r={11} fill="none" stroke="var(--rose)" strokeWidth={1.5} opacity={0.5} />
                <path d="M0 -7 L2 -2 L7 -2 L3 1.5 L4.5 7 L0 3.8 L-4.5 7 L-3 1.5 L-7 -2 L-2 -2 Z" fill="var(--rose)" />
              </g>
            )}
            {hover && (
              <g transform={`translate(${sc.x(hover.x)},${sc.y(hover.y)})`} pointerEvents="none">
                <circle r={6} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
              </g>
            )}
          </g>
        )}
      </Plot>
      <div className="kmap__foot">
        {hover ? (
          <span className="kmap__hover">{hover.label}</span>
        ) : (
          <span>
            Each dot is a passage, placed by the first two principal components of its embedding. Nearby dots mean similar things.
            {q ? ' The star is your question; large dots are the passages used in the answer.' : ''}
          </span>
        )}
      </div>
      <div className="kmap__legend">
        {modules.map((m) => (
          <span key={m.n} style={{ ['--c' as string]: m.color }}>
            Module {m.n}
          </span>
        ))}
        {kb.docs.some((d) => !d.builtin) && <span style={{ ['--c' as string]: 'var(--ink)' }}>Your documents</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ PDF page viewer */

export function PageViewer({ source, onClose }: { source: Source | null; onClose: () => void }) {
  const [img, setImg] = useState<{ url: string; page: number } | null>(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (source?.pageStart) setPage(source.pageStart);
  }, [source]);
  useEffect(() => {
    if (!source) return;
    let live = true;
    setErr('');
    (async () => {
      const f = await db.get('files', source.docId);
      if (!f) throw new Error('The original file is not stored.');
      const { renderPdfPage } = await import('../../rag/parse/pdf');
      const r = await renderPdfPage(await f.blob.arrayBuffer(), page, 1400);
      if (live) setImg({ url: r.url, page });
    })().catch((e: Error) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [source, page]);
  useEffect(() => {
    if (!source) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [source, onClose]);
  if (!source) return null;
  const total = getIndex().docs.get(source.docId)?.pages ?? page;
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`${source.title}, page ${page}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="viewer__bar">
        <strong>{source.title}</strong>
        <span>
          Page {page} of {total}
        </span>
        <button className="btn btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <button className="btn btn--sm" disabled={page >= total} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
        <button className="icon-btn" onClick={onClose} aria-label="Close page viewer">
          <IconX />
        </button>
      </div>
      <div className="viewer__page">
        {err ? <p className="test-fail">{err}</p> : img && img.page === page ? <img src={img.url} alt={`Page ${page} of ${source.title}`} /> : <div className="viewer__loading">Rendering page {page}…</div>}
      </div>
    </div>
  );
}

