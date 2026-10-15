import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { KIND_LABEL, KnowledgeMap } from '../components/assistant/Evidence';
import { MarkdownView } from '../components/assistant/Markdown';
import { SettingsDialog } from '../components/assistant/SettingsDialog';
import { IconChat, IconChevron, IconGear, IconTrash, IconUpload } from '../components/icons';
import { modules } from '../content/course';
import { useEngineStatus, type ModelStatus } from '../rag/embedder';
import { addFiles, deleteDoc, docChunks, initKb, removeUploads, runEmbedding, setDocEnabled, syncCourse, useKb } from '../rag/kb';
import { EMBED_LABEL, RERANK_LABEL } from '../rag/models';
import { hasModel, modelLabel, useSettings } from '../rag/settings';
import { transcribeDoc } from '../rag/transcribe';
import type { DocRecord } from '../rag/types';
import { ACCEPT, fmtBytes, pageLabel, plural } from '../rag/util';

function modelState(m: ModelStatus, on: boolean, lazy: string) {
  if (!on) return { tone: 'off', text: 'Off' };
  if (m.state === 'error') return { tone: 'error', text: m.error ?? 'Failed to load' };
  if (m.state === 'ready') return { tone: 'ok', text: `Ready on the ${m.device === 'webgpu' ? 'GPU' : 'CPU'}` };
  if (m.state === 'loading') return { tone: 'busy', text: m.total ? `Downloading ${Math.round(m.loaded / 1e6)} of ${Math.round(m.total / 1e6)} MB` : 'Loading…' };
  return { tone: 'idle', text: lazy };
}

function DocRow({ d, embedded, onError }: { d: DocRecord; embedded: number; onError: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [ocr, setOcr] = useState<{ done: number; total: number; words?: number; ac: AbortController } | null>(null);
  const s = useSettings();
  const busy = d.status === 'queued' || d.status === 'reading';
  const pending = (d.scanned ?? []).filter((p) => !(d.transcribed ?? []).includes(p));
  const passages = open ? docChunks(d.id) : [];
  const [limit, setLimit] = useState(6);

  const transcribe = async () => {
    const ac = new AbortController();
    setOcr({ done: 0, total: pending.length, ac });
    try {
      await transcribeDoc(d.id, (done, total, words) => setOcr({ done, total, words, ac }), ac.signal);
    } catch (err) {
      if (!ac.signal.aborted) onError(`Transcribing ${d.title} failed: ${(err as Error).message}`);
    }
    setOcr(null);
  };

  const meta = [
    d.pages ? plural(d.pages, d.kind === 'pptx' ? 'slide' : 'page') : '',
    d.status === 'ready' ? plural(d.chunks, 'passage') : '',
    fmtBytes(d.size),
    new Date(d.addedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  ].filter(Boolean);

  return (
    <li className="doc" data-disabled={!d.enabled || undefined}>
      <div className="doc__main">
        <span className="doc__kind" data-kind={d.kind}>
          {KIND_LABEL[d.kind]}
        </span>
        <div className="doc__titles">
          <div className="doc__title">{d.title}</div>
          <div className="doc__meta">
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          {busy && (
            <div className="doc__progress">
              <div className="meter">
                <span style={{ width: `${Math.round((d.progress ?? 0.05) * 100)}%` }} />
              </div>
              <small>{d.status === 'queued' ? 'Waiting' : 'Reading the file'}</small>
            </div>
          )}
          {d.status === 'ready' && d.chunks > 0 && embedded < d.chunks && s.dense && <small className="doc__sem">Semantic index {Math.round((embedded / d.chunks) * 100)}%</small>}
          {d.status === 'error' && <p className="doc__error">{d.error}</p>}
          {d.status === 'ready' && d.error && <p className="doc__error">{d.error}</p>}
          {pending.length > 0 && d.status === 'ready' && (
            <div className="doc__scan">
              {ocr ? (
                <>
                  <span>
                    Transcribing page {Math.min(ocr.done + 1, ocr.total)} of {ocr.total}
                    {ocr.words ? `, ${ocr.words} words so far` : '…'}
                  </span>
                  <button className="btn btn--ghost btn--sm" onClick={() => ocr.ac.abort()}>
                    Stop
                  </button>
                </>
              ) : (
                <>
                  <span>
                    {d.kind === 'image'
                      ? 'This is an image, so its text has to be transcribed before it can be searched.'
                      : `${plural(pending.length, 'page')} ${pending.length === 1 ? 'is a scan' : 'are scans'} with no text layer (${pending.slice(0, 6).map((p) => pageLabel(p)).join(', ')}${pending.length > 6 ? '…' : ''}).`}
                  </span>
                  <button className="btn btn--sm" onClick={transcribe} disabled={!hasModel(s)} title={hasModel(s) ? undefined : 'Connect a model with vision first'}>
                    Transcribe with {hasModel(s) ? modelLabel(s) : 'a vision model'}
                  </button>
                </>
              )}
            </div>
          )}
          {d.status === 'ready' && d.chunks > 0 && (
            <div className="doc__buttons">
              <Link className="btn btn--sm" to={`/assistant?scope=${encodeURIComponent(d.id)}`}>
                <IconChat /> Ask about it
              </Link>
              <Link className="btn btn--sm" to={`/assistant?summarise=${encodeURIComponent(d.id)}`}>
                Summarise
              </Link>
              <button className="btn btn--ghost btn--sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                {open ? 'Hide passages' : 'Show passages'} <IconChevron className="doc__chev" data-open={open || undefined} />
              </button>
            </div>
          )}
        </div>
        <div className="doc__side">
          <label className="toggle" title="Use this document in answers">
            <input type="checkbox" checked={d.enabled} onChange={(e) => void setDocEnabled(d.id, e.target.checked)} aria-label={`Use ${d.title} in answers`} />
          </label>
          <button
            className="icon-btn"
            aria-label={`Remove ${d.title}`}
            onClick={() => {
              if (window.confirm(`Remove “${d.title}” from the knowledge base?`)) void deleteDoc(d.id);
            }}
          >
            <IconTrash />
          </button>
        </div>
      </div>
      {open && (
        <ol className="doc__passages">
          {passages.slice(0, limit).map((c) => (
            <li key={c.id}>
              <div className="doc__passage-head">
                <span>#{c.i + 1}</span>
                {[c.heading.slice(-1)[0], pageLabel(c.pageStart, c.pageEnd, d.kind)].filter(Boolean).join(', ')}
                {!c.vec && s.dense && <em>not yet embedded</em>}
              </div>
              <MarkdownView text={c.text.replace(/^…/, '… ')} className="md md--passage" />
            </li>
          ))}
          {passages.length > limit && (
            <li>
              <button className="btn btn--ghost btn--sm" onClick={() => setLimit((l) => l + 12)}>
                Show more ({passages.length - limit} left)
              </button>
            </li>
          )}
        </ol>
      )}
    </li>
  );
}

export default function Library() {
  const kb = useKb();
  const engine = useEngineStatus();
  const s = useSettings();
  const [drag, setDrag] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  useEffect(() => {
    document.title = 'Knowledge base — Manifold';
    void initKb();
  }, []);

  const take = async (files: File[]) => {
    if (!files.length) return;
    const r = await addFiles(files);
    const parts: string[] = [];
    if (r.added) parts.push(`Added ${plural(r.added, 'file')}. Keyword search works as soon as each file is read; semantic search follows in the background.`);
    if (r.duplicates.length) parts.push(`Already added: ${r.duplicates.join(', ')}.`);
    if (r.rejected.length) parts.push(`Skipped ${r.rejected.join(', ')}: use PDF, Word, PowerPoint, text, Markdown, HTML or image files.`);
    setNotice({ tone: r.rejected.length || !r.added ? 'error' : 'ok', text: parts.join(' ') });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDrag(false);
    void take(Array.from(e.dataTransfer.files));
  };

  const uploads = kb.docs.filter((d) => !d.builtin);
  const builtins = kb.docs.filter((d) => d.builtin);
  const sem = modelState(engine.embed, s.dense, 'Loads when indexing starts');
  const rr = modelState(engine.rerank, s.rerank, 'Loads with your first question');

  return (
    <div className="page library">
      <header className="page-head">
        <h1>Knowledge base</h1>
        <p className="page-head__lede">
          Add your lecture notes, slides and past papers so the study assistant can answer from them. Files are read and indexed inside this browser; they are never uploaded to a server.
        </p>
      </header>

      <div
        className="drop"
        data-over={drag || undefined}
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current++;
          setDrag(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (!depth.current) setDrag(false);
        }}
        onDrop={onDrop}
      >
        <IconUpload className="drop__icon" />
        <div>
          <div className="drop__title">{drag ? 'Drop to add these files' : 'Drop files here'}</div>
          <div className="drop__sub">PDF, Word, PowerPoint, Markdown, text, HTML, Jupyter notebooks and photos of notes</div>
        </div>
        <button className="btn btn--primary" onClick={() => inputRef.current?.click()}>
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            void take(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>
      {notice && (
        <p className={notice.tone === 'ok' ? 'lib-notice' : 'lib-notice lib-notice--error'} role="status">
          {notice.text}
          <button className="linkish" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </p>
      )}

      <div className="lib-grid">
        <div className="lib-col">
          <section className="lib-section">
            <div className="lib-section__head">
              <h2>Your documents</h2>
              {uploads.length > 0 && (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    if (window.confirm('Remove every document you added? The built-in lessons stay.')) void removeUploads();
                  }}
                >
                  Remove all
                </button>
              )}
            </div>
            {!kb.ready ? (
              <p className="lib-empty">Opening the knowledge base…</p>
            ) : uploads.length === 0 ? (
              <p className="lib-empty">
                Nothing added yet. Your module notes and slide decks are the best place to start: the assistant will cite their pages in its answers.
              </p>
            ) : (
              <ul className="docs">
                {uploads.map((d) => (
                  <DocRow key={d.id} d={d} embedded={kb.coverage[d.id] ?? 0} onError={(text) => setNotice({ tone: 'error', text })} />
                ))}
              </ul>
            )}
          </section>

          <section className="lib-section">
            <div className="lib-section__head">
              <h2>Built into Manifold</h2>
              <button
                className="btn btn--ghost btn--sm"
                disabled={rebuilding}
                onClick={async () => {
                  setRebuilding(true);
                  await syncCourse(true);
                  runEmbedding();
                  setRebuilding(false);
                }}
              >
                {rebuilding ? 'Re-reading…' : 'Re-read lessons'}
              </button>
            </div>
            <p className="lib-note">Every lesson, the question bank, the SEE paper, the formula sheet and the flashcards are already in the knowledge base.</p>
            <ul className="builtin">
              {modules.map((m) => {
                const docs = builtins.filter((d) => d.module === m.n);
                const on = docs.filter((d) => d.enabled).length;
                const n = docs.reduce((t, d) => t + d.chunks, 0);
                return (
                  <li key={m.n} style={{ ['--mod-color' as string]: m.color }}>
                    <details>
                      <summary>
                        <span className="builtin__num">{m.n}</span>
                        <span className="builtin__title">
                          {m.title}
                          <small>
                            {on} of {plural(docs.length, 'lesson')}, {plural(n, 'passage')}
                          </small>
                        </span>
                        <label className="toggle" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={on > 0}
                            aria-label={`Use Module ${m.n} lessons in answers`}
                            onChange={(e) => {
                              for (const d of docs) void setDocEnabled(d.id, e.target.checked);
                            }}
                          />
                        </label>
                      </summary>
                      <ul>
                        {docs.map((d) => (
                          <li key={d.id}>
                            <label className="toggle">
                              <input type="checkbox" checked={d.enabled} onChange={(e) => void setDocEnabled(d.id, e.target.checked)} />
                              {d.title}
                            </label>
                            <span>{plural(d.chunks, 'passage')}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                );
              })}
              {builtins
                .filter((d) => !d.module)
                .map((d) => (
                  <li key={d.id} className="builtin__bank">
                    <span className="builtin__title">
                      {d.title}
                      <small>{plural(d.chunks, 'passage')}</small>
                    </span>
                    <label className="toggle">
                      <input type="checkbox" checked={d.enabled} onChange={(e) => void setDocEnabled(d.id, e.target.checked)} aria-label={`Use ${d.title} in answers`} />
                    </label>
                  </li>
                ))}
            </ul>
          </section>
        </div>

        <div className="lib-col lib-col--side">
          <section className="lib-section engine">
            <h2>How search works here</h2>
            <ol className="engine__steps">
              <li>
                <div className="engine__row">
                  <strong>Keyword index</strong>
                  <span data-tone="ok">{plural(kb.chunks, 'passage')}</span>
                </div>
                <p>BM25 scores passages on the exact terms in your question, weighting rare terms more.</p>
              </li>
              <li>
                <div className="engine__row">
                  <strong>Semantic index</strong>
                  <span data-tone={sem.tone}>{s.dense && engine.embed.state === 'ready' ? `${kb.embedded.toLocaleString()} of ${kb.chunks.toLocaleString()} embedded` : sem.text}</span>
                </div>
                {s.dense && kb.chunks > 0 && kb.embedded < kb.chunks && (
                  <div className="meter">
                    <span style={{ width: `${(kb.embedded / kb.chunks) * 100}%` }} />
                  </div>
                )}
                <p>{EMBED_LABEL} turns each passage into a 384-number vector; passages near your question in that space mean similar things, even with different wording.</p>
                {kb.semanticError && <p className="doc__error">{kb.semanticError}</p>}
              </li>
              <li>
                <div className="engine__row">
                  <strong>Reranker</strong>
                  <span data-tone={rr.tone}>{rr.text}</span>
                </div>
                <p>{RERANK_LABEL} rereads the top 20 fused candidates together with your question and reorders them.</p>
              </li>
              <li>
                <div className="engine__row">
                  <strong>Answer model</strong>
                  <span data-tone={hasModel(s) ? 'ok' : 'idle'}>{modelLabel(s)}</span>
                </div>
                <p>Writes the answer from the selected passages and cites them by number.</p>
                <button className="btn btn--sm" onClick={() => setSettingsOpen(true)}>
                  <IconGear /> Settings
                </button>
              </li>
            </ol>
          </section>

          <section className="lib-section">
            <h2>Knowledge map</h2>
            <KnowledgeMap height={300} />
          </section>
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
