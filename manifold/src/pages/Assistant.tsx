import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as RKE } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MarkdownView } from '../components/assistant/Markdown';
import { KnowledgeMap, PageViewer, SourceCard, TraceView } from '../components/assistant/Evidence';
import { Pipeline } from '../components/assistant/Pipeline';
import { SettingsDialog } from '../components/assistant/SettingsDialog';
import { CardsBlock, QuizBlock } from '../components/assistant/StudyBlocks';
import { IconCheck, IconCopy, IconFilter, IconGear, IconHistory, IconPlus, IconSend, IconStop, IconTrash, IconX } from '../components/icons';
import { newTurn, runTurn, type Stage, type TurnUpdate } from '../rag/assistant';
import { loadEmbedder, loadReranker, useEngineStatus } from '../rag/embedder';
import { getDoc, initKb, useKb } from '../rag/kb';
import { isAbort, type LlmError } from '../rag/llm';
import { hasModel, modelLabel, settings, useSettings } from '../rag/settings';
import { deleteAllThreads, deleteThread, loadThreads, saveThread, useThreads } from '../rag/threads';
import type { ChatTurn, Mode, Source, Thread } from '../rag/types';
import { pageLabel, plural, uid } from '../rag/util';

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'answer', label: 'Answer', hint: 'A direct answer with citations' },
  { value: 'teach', label: 'Teach me', hint: 'Intuition, definition, example, then a check question' },
  { value: 'exam', label: 'Exam answer', hint: 'A model answer structured for VTU marks' },
  { value: 'quiz', label: 'Quiz me', hint: 'Five multiple-choice questions' },
  { value: 'cards', label: 'Flashcards', hint: 'Eight cards you can save' },
];

const MODE_TAG: Record<Mode, string> = {
  answer: '',
  teach: 'Teach me',
  exam: 'Exam answer',
  quiz: 'Quiz',
  cards: 'Flashcards',
  summary: 'Summary',
};

const SUGGESTIONS: { q: string; mode: Mode; marks?: number }[] = [
  { q: 'Explain the Candidate-Elimination algorithm with an example', mode: 'exam', marks: 10 },
  { q: 'Why does PCA use the eigenvectors of the covariance matrix?', mode: 'teach' },
  { q: 'When should I choose DBSCAN over k-means?', mode: 'answer' },
  { q: 'Precision, recall and the F1 score', mode: 'quiz' },
];

interface Live extends TurnUpdate {
  turnId: string;
  steps: Stage[];
}

const fmtMs = (ms?: number) => (ms === undefined ? '' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);

function relTime(t: number) {
  const d = Date.now() - t;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.round(d / 60_000)} min ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)} h ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function Assistant() {
  const s = useSettings();
  const kb = useKb();
  const engine = useEngineStatus();
  const { threads, loaded } = useThreads();
  const [params, setParams] = useSearchParams();

  const [thread, setThread] = useState<Thread | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('answer');
  const [marks, setMarks] = useState(10);
  const [scope, setScope] = useState<string[] | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState('');
  const [evTurn, setEvTurn] = useState<string | null>(null);
  const [evTab, setEvTab] = useState<'sources' | 'trace' | 'map'>('sources');
  const [activeSource, setActiveSource] = useState<number | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [pageView, setPageView] = useState<Source | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const handled = useRef(false);

  useEffect(() => {
    document.title = 'Study assistant — Manifold';
    void loadThreads();
    void initKb().then(() => {
      if (settings.get().dense) void loadEmbedder().catch(() => undefined);
      if (settings.get().rerank) void loadReranker().catch(() => undefined);
    });
  }, []);

  /* ------------------------------------------------------------ send a turn */
  const send = useCallback(
    async (question: string, m: Mode, opts: { marks?: number; scope?: string[] | null; docId?: string } = {}) => {
      if (abortRef.current) return;
      await initKb();
      const q = question.trim() || (m === 'summary' && opts.docId ? `Summarise ${getDoc(opts.docId)?.title ?? 'this document'}` : '');
      if (!q) return;
      const sc = opts.scope === undefined ? scope : opts.scope;
      const base: Thread = thread ?? { id: uid('c'), title: q.slice(0, 80), createdAt: Date.now(), updatedAt: Date.now(), turns: [] };
      const user = newTurn('user', m, { text: q, marks: m === 'exam' ? (opts.marks ?? marks) : undefined, scope: sc ?? undefined });
      const asst = newTurn('assistant', m);
      const history = base.turns;
      let cur: Thread = { ...base, turns: [...history, user, asst], updatedAt: Date.now() };
      setThread(cur);
      setEvTurn(asst.id);
      setActiveSource(null);
      setText('');
      const st = settings.get();
      const model = hasModel(st);
      const steps: Stage[] = [
        ...(model && st.rewrite && m !== 'summary' && (st.provider === 'anthropic' || st.provider === 'groq' || history.length > 0) ? (['plan'] as Stage[]) : []),
        'search',
        ...(st.rerank && m !== 'summary' ? (['rerank'] as Stage[]) : []),
        ...(model ? (['write'] as Stage[]) : []),
      ];
      setLive({ turnId: asst.id, steps, stage: steps[0] });
      const ac = new AbortController();
      abortRef.current = ac;
      const t0 = performance.now();
      let latest: TurnUpdate = { stage: steps[0] };
      let done: ChatTurn;
      try {
        const r = await runTurn({
          history,
          question: q,
          mode: m,
          marks: user.marks,
          scope: sc,
          docId: opts.docId,
          signal: ac.signal,
          onUpdate: (u) => {
            latest = { ...latest, ...u };
            setLive((l) => (l ? { ...l, ...u } : l));
          },
        });
        const { wire, ...rest } = r;
        user.wire = wire;
        done = { ...asst, ...rest, ms: performance.now() - t0 };
      } catch (err) {
        if (isAbort(err) || ac.signal.aborted) {
          done = { ...asst, text: latest.text ?? '', sources: latest.sources, trace: latest.trace, stopped: true, ms: performance.now() - t0 };
        } else {
          const e = err as LlmError;
          console.error(err);
          done = { ...asst, sources: latest.sources, trace: latest.trace, text: latest.text ?? '', error: [e.message || 'Something went wrong.', e.hint].filter(Boolean).join(' '), ms: performance.now() - t0 };
        }
      }
      abortRef.current = null;
      cur = { ...cur, turns: [...history, user, done], updatedAt: Date.now() };
      setThread(cur);
      setLive(null);
      void saveThread(cur);
    },
    [thread, scope, marks],
  );

  // deep links: ?scope=<docId>, ?summarise=<docId>, ?q=...&mode=...
  useEffect(() => {
    if (handled.current) return;
    const sc = params.get('scope');
    const sum = params.get('summarise');
    const q = params.get('q');
    const md = params.get('mode') as Mode | null;
    if (!sc && !sum && !q) return;
    handled.current = true;
    setThread(null);
    if (sc) setScope([sc]);
    if (md && MODES.some((x) => x.value === md)) setMode(md);
    if (sum) {
      setScope([sum]);
      void initKb().then(() => send('', 'summary', { scope: [sum], docId: sum }));
    } else if (q) setText(q);
    setParams({}, { replace: true });
    setTimeout(() => taRef.current?.focus(), 50);
  }, [params, setParams, send]);

  const stop = () => abortRef.current?.abort();

  /* ------------------------------------------------------------ scrolling */
  const lastText = live?.text;
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 260;
    if (nearBottom || !live?.text) endRef.current?.scrollIntoView({ block: 'end', behavior: live?.text ? 'auto' : 'smooth' });
  }, [thread?.turns.length, lastText, live?.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------ composer */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }, [text]);

  const onKey = (e: RKE<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(text, mode);
    }
  };

  const userDocs = kb.docs.filter((d) => !d.builtin);
  const enabledDocs = kb.docs.filter((d) => d.enabled);
  const scopeDocs = useMemo(() => (scope ? kb.docs.filter((d) => scope.includes(d.id)) : []), [scope, kb.docs]);
  const scopeLabel = !scope ? 'All sources' : scopeDocs.length === 1 ? scopeDocs[0].title : `${scopeDocs.length} sources`;

  const evTurnObj = thread?.turns.find((t) => t.id === evTurn) ?? [...(thread?.turns ?? [])].reverse().find((t) => t.role === 'assistant');
  const evSources = evTurnObj?.id === live?.turnId ? (live?.sources ?? []) : (evTurnObj?.sources ?? []);
  const evQuestion = useMemo(() => {
    if (!thread || !evTurnObj) return '';
    const i = thread.turns.findIndex((t) => t.id === evTurnObj.id);
    return evTurnObj.standalone ?? thread.turns[i - 1]?.text ?? '';
  }, [thread, evTurnObj]);

  const cite = useCallback((turnId: string, n: number) => {
    setEvTurn(turnId);
    setEvTab('sources');
    setActiveSource(n);
    setDrawer(true);
    requestAnimationFrame(() => document.getElementById(`src-${n}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }, []);

  const copy = (t: ChatTurn) => {
    const body = t.quiz
      ? t.quiz.map((q, i) => `${i + 1}. ${q.question}\n${q.options.map((o, k) => `   ${String.fromCharCode(65 + k)}. ${o}`).join('\n')}\n   Answer: ${String.fromCharCode(65 + q.answer)}. ${q.why}`).join('\n\n')
      : t.cards
        ? t.cards.map((c) => `${c.term}: ${c.def}`).join('\n')
        : t.text;
    void navigator.clipboard?.writeText(body).then(() => {
      setCopied(t.id);
      setTimeout(() => setCopied(null), 1400);
    });
  };

  const newChat = () => {
    if (abortRef.current) return;
    setThread(null);
    setEvTurn(null);
    setScope(null);
    setHistoryOpen(false);
    setTimeout(() => taRef.current?.focus(), 0);
  };

  const embedding = kb.job?.kind === 'embed' || kb.job?.kind === 'course';
  const model = hasModel(s);
  const turns = thread?.turns ?? [];

  return (
    <div className="asst" data-drawer={drawer || undefined}>
      <div className="asst__main">
        <header className="asst__head">
          <div className="asst__title">
            <h1>Study assistant</h1>
            <p>
              {model ? (
                <>
                  Answers by <strong>{modelLabel(s)}</strong> from {plural(enabledDocs.filter((d) => d.builtin).length, 'course source')}
                  {userDocs.length > 0 && <> and {plural(userDocs.filter((d) => d.enabled).length, 'of your documents', 'of your documents')}</>}.
                </>
              ) : (
                <>Search only: connect a model to get written answers.</>
              )}
              {embedding && kb.job && (
                <span className="asst__indexing">
                  {kb.job.label} {kb.job.total > 1 ? `${Math.round((kb.job.done / kb.job.total) * 100)}%` : ''}
                </span>
              )}
            </p>
          </div>
          <div className="asst__actions">
            <div className="popover-anchor">
              <button className="btn btn--sm" onClick={() => setHistoryOpen((o) => !o)} aria-expanded={historyOpen}>
                <IconHistory /> History
              </button>
              {historyOpen && (
                <div className="popover popover--right history" role="dialog" aria-label="Past conversations">
                  {!loaded ? (
                    <p className="popover__empty">Loading…</p>
                  ) : threads.length === 0 ? (
                    <p className="popover__empty">Your conversations will appear here.</p>
                  ) : (
                    <>
                      <ul>
                        {threads.slice(0, 40).map((t) => (
                          <li key={t.id} data-current={t.id === thread?.id || undefined}>
                            <button
                              className="history__open"
                              onClick={() => {
                                if (abortRef.current) return;
                                setThread(t);
                                setEvTurn(null);
                                setScope(null);
                                setHistoryOpen(false);
                              }}
                            >
                              <span>{t.title}</span>
                              <small>
                                {relTime(t.updatedAt)}, {plural(Math.ceil(t.turns.length / 2), 'question')}
                              </small>
                            </button>
                            <button
                              className="icon-btn history__del"
                              aria-label={`Delete conversation: ${t.title}`}
                              onClick={() => {
                                if (t.id === thread?.id) setThread(null);
                                void deleteThread(t.id);
                              }}
                            >
                              <IconTrash />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        className="btn btn--ghost btn--sm history__clear"
                        onClick={() => {
                          if (window.confirm('Delete every saved conversation?')) {
                            setThread(null);
                            void deleteAllThreads();
                          }
                        }}
                      >
                        Delete all conversations
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <button className="btn btn--sm" onClick={newChat} disabled={!thread || !!live}>
              <IconPlus /> New chat
            </button>
            <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Assistant settings">
              <IconGear />
            </button>
          </div>
        </header>

        {turns.length === 0 ? (
          <section className="asst-empty">
            <p className="asst-empty__lede">
              Ask about anything in the syllabus or in your own notes. Every answer cites the passages it came from, so you can check it against the source.
            </p>
            {!model && (
              <div className="asst-callout">
                <div>
                  <strong>No answer model connected.</strong> You can still search: the assistant will show the best-matching passages. Connect Claude with an API key, or a free local model with Ollama, to get written answers.
                </div>
                <button className="btn btn--primary btn--sm" onClick={() => setSettingsOpen(true)}>
                  Connect a model
                </button>
              </div>
            )}
            <div className="asst-suggest">
              {(scopeDocs.length === 1
                ? [
                    { q: `Summarise ${scopeDocs[0].title}`, mode: 'summary' as Mode },
                    { q: `What are the key ideas in ${scopeDocs[0].title}?`, mode: 'answer' as Mode },
                    { q: `Quiz me on ${scopeDocs[0].title}`, mode: 'quiz' as Mode },
                    { q: `Flashcards for ${scopeDocs[0].title}`, mode: 'cards' as Mode },
                  ]
                : SUGGESTIONS
              ).map((x) => (
                <button
                  key={x.q}
                  className="asst-suggest__item"
                  onClick={() => {
                    if (x.mode === 'summary') void send('', 'summary', { docId: scopeDocs[0].id, scope: [scopeDocs[0].id] });
                    else {
                      setMode(x.mode);
                      void send(x.q, x.mode, { marks: 'marks' in x ? x.marks : undefined });
                    }
                  }}
                >
                  <span className="asst-suggest__mode">{x.mode === 'answer' ? 'Answer' : MODE_TAG[x.mode]}</span>
                  {x.q}
                </button>
              ))}
            </div>
            <p className="asst-empty__kb">
              Searching {plural(kb.chunks, 'passage')} from {plural(enabledDocs.length, 'source')}.{' '}
              <Link to="/library">{userDocs.length ? 'Manage your documents' : 'Add your own notes and slides'}</Link>
            </p>
          </section>
        ) : (
          <ol className="convo">
            {turns.map((t, i) => {
              if (t.role === 'user') {
                return (
                  <li key={t.id} className="turn turn--user">
                    {(t.mode !== 'answer' || t.scope) && (
                      <div className="turn__tags">
                        {t.mode !== 'answer' && (
                          <span>
                            {MODE_TAG[t.mode]}
                            {t.mode === 'exam' && t.marks ? `, ${t.marks} marks` : ''}
                          </span>
                        )}
                        {t.scope && <span>{t.scope.length === 1 ? (kb.docs.find((d) => d.id === t.scope![0])?.title ?? '1 source') : `${t.scope.length} sources`}</span>}
                      </div>
                    )}
                    <div className="turn__bubble">{t.text}</div>
                  </li>
                );
              }
              const isLive = live?.turnId === t.id;
              const view = isLive ? { ...t, text: live.text ?? '', sources: live.sources, trace: live.trace } : t;
              const sources = view.sources ?? [];
              return (
                <li key={t.id} className="turn turn--asst" data-focus={evTurnObj?.id === t.id || undefined}>
                  {isLive && (
                    <Pipeline
                      steps={live.steps}
                      stage={live.stage}
                      detail={
                        live.stage === 'search' && live.standalone && live.standalone !== turns[i - 1]?.text
                          ? `“${live.standalone}”`
                          : live.stage === 'write' && live.drafted
                            ? `${Math.round(live.drafted / 6)} words drafted`
                            : live.stage === 'write' && !live.text && s.provider === 'ollama'
                              ? 'a local model can take a minute or two'
                              : undefined
                      }
                    />
                  )}
                  {isLive && live.thinking && !live.text && <p className="turn__thinking">{live.thinking.split('\n').filter(Boolean).slice(-1)[0]}</p>}

                  {view.extractive ? (
                    <div className="extractive">
                      <p className="extractive__lede">
                        {sources.length ? `The ${sources.length} passages that best match your question:` : 'Nothing in the knowledge base matched this question.'}{' '}
                        <button className="linkish" onClick={() => setSettingsOpen(true)}>
                          Connect a model
                        </button>{' '}
                        to get a written answer.
                      </p>
                      {sources.slice(0, 4).map((src) => (
                        <SourceCard key={src.n} s={src} query={turns[i - 1]?.text ?? ''} onPage={setPageView} />
                      ))}
                    </div>
                  ) : view.quiz ? (
                    <QuizBlock items={view.quiz} sources={sources} onCite={(n) => cite(t.id, n)} />
                  ) : view.cards ? (
                    <CardsBlock items={view.cards} topic={view.standalone ?? turns[i - 1]?.text ?? ''} />
                  ) : view.text ? (
                    <MarkdownView text={view.text} sources={sources} onCite={(n) => cite(t.id, n)} className="md md--answer" />
                  ) : null}

                  {t.stopped && <p className="turn__note">Stopped.</p>}
                  {t.error && (
                    <div className="turn__error" role="alert">
                      {t.error}
                      {!live && (
                        <button className="btn btn--sm" onClick={() => send(turns[i - 1]?.text ?? '', turns[i - 1]?.mode ?? 'answer', { marks: turns[i - 1]?.marks, scope: turns[i - 1]?.scope ?? null })}>
                          Try again
                        </button>
                      )}
                    </div>
                  )}

                  {!isLive && (sources.length > 0 || view.text) && (
                    <div className="turn__foot">
                      {sources.length > 0 && !view.extractive && (
                        <div className="src-chips">
                          {sources.map((src) => {
                            const oneDoc = sources.every((x) => x.docId === src.docId);
                            const where = pageLabel(src.pageStart, src.pageEnd, src.kind);
                            const label = oneDoc ? where || src.heading[src.heading.length - 1] || src.title : where ? `${src.title}, ${where}` : src.title;
                            return (
                              <button key={src.n} className="src-chip" onClick={() => cite(t.id, src.n)} title={`${src.title}${where ? `, ${where}` : ''}`}>
                                <span>{src.n}</span>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div className="turn__meta">
                        {t.trace && (
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => {
                              setEvTurn(t.id);
                              setEvTab('trace');
                              setDrawer(true);
                            }}
                          >
                            How this was found
                          </button>
                        )}
                        {(view.text || view.quiz || view.cards) && (
                          <button className="btn btn--ghost btn--sm" onClick={() => copy(t)}>
                            {copied === t.id ? <IconCheck /> : <IconCopy />}
                            {copied === t.id ? 'Copied' : 'Copy'}
                          </button>
                        )}
                        <span className="turn__stats">
                          {[t.model, fmtMs(t.ms), t.usage ? `${(t.usage.input + t.usage.output).toLocaleString()} tokens` : ''].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <div ref={endRef} />

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text, mode);
          }}
        >
          <div className="composer__box">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder={
                mode === 'quiz' ? 'Which topic should the quiz cover?' : mode === 'cards' ? 'Which topic do you want flashcards for?' : mode === 'exam' ? 'Paste or type the exam question' : 'Ask about the syllabus or your notes'
              }
              aria-label="Your question"
            />
            {live ? (
              <button type="button" className="composer__send composer__send--stop" onClick={stop} aria-label="Stop">
                <IconStop />
              </button>
            ) : (
              <button type="submit" className="composer__send" disabled={!text.trim()} aria-label="Send">
                <IconSend />
              </button>
            )}
          </div>
          <div className="composer__bar">
            <div className="composer__modes" role="radiogroup" aria-label="Answer style">
              {MODES.map((m) => (
                <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} title={m.hint} onClick={() => setMode(m.value)}>
                  {m.label}
                </button>
              ))}
            </div>
            {mode === 'exam' && (
              <div className="composer__marks" role="radiogroup" aria-label="Marks">
                {[5, 8, 10].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={marks === n} onClick={() => setMarks(n)}>
                    {n} marks
                  </button>
                ))}
              </div>
            )}
            <div className="popover-anchor composer__scope">
              <button type="button" className="scope-btn" data-on={!!scope || undefined} onClick={() => setScopeOpen((o) => !o)} aria-expanded={scopeOpen}>
                <IconFilter />
                <span>{scopeLabel}</span>
                {scope && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="scope-btn__clear"
                    aria-label="Search all sources"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScope(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        setScope(null);
                      }
                    }}
                  >
                    <IconX />
                  </span>
                )}
              </button>
              {scopeOpen && (
                <div className="popover popover--up scope" role="dialog" aria-label="Choose sources to search">
                  <input className="field" placeholder="Filter sources" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} autoFocus />
                  <ul>
                    <li>
                      <label>
                        <input type="radio" checked={!scope} onChange={() => setScope(null)} />
                        <span>All sources</span>
                      </label>
                    </li>
                    {kb.docs
                      .filter((d) => d.enabled && d.status === 'ready' && d.title.toLowerCase().includes(scopeFilter.toLowerCase()))
                      .map((d) => (
                        <li key={d.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={!!scope?.includes(d.id)}
                              onChange={(e) => {
                                const base = scope ?? [];
                                const next = e.target.checked ? [...base, d.id] : base.filter((x) => x !== d.id);
                                setScope(next.length ? next : null);
                              }}
                            />
                            <span>
                              {d.title}
                              <small>{d.builtin ? (d.module ? `Module ${d.module} lesson` : 'Exam desk') : 'Your document'}</small>
                            </span>
                          </label>
                        </li>
                      ))}
                  </ul>
                  <button type="button" className="btn btn--sm" onClick={() => setScopeOpen(false)}>
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      <aside className="evidence" aria-label="Evidence for the selected answer">
        <div className="evidence__head">
          <div className="evidence__tabs" role="tablist">
            {(
              [
                ['sources', `Sources${evSources.length ? ` (${evSources.length})` : ''}`],
                ['trace', 'How it was found'],
                ['map', 'Map'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={evTab === k} onClick={() => setEvTab(k)}>
                {label}
              </button>
            ))}
          </div>
          <button className="icon-btn evidence__close" onClick={() => setDrawer(false)} aria-label="Close evidence panel">
            <IconX />
          </button>
        </div>
        <div className="evidence__body">
          {evTab === 'sources' &&
            (evSources.length ? (
              evSources.map((src) => <SourceCard key={`${evTurnObj?.id}-${src.n}`} s={src} query={evQuestion} active={activeSource === src.n} onPage={setPageView} />)
            ) : (
              <p className="evidence__empty">{turns.length ? 'This answer used no passages.' : 'The passages behind each answer appear here, ranked by relevance.'}</p>
            ))}
          {evTab === 'trace' && (evTurnObj ? <TraceView turn={evTurnObj.id === live?.turnId ? { ...evTurnObj, trace: live.trace } : evTurnObj} /> : <p className="evidence__empty">Ask a question to see each stage of the search.</p>)}
          {evTab === 'map' && (
            <>
              <KnowledgeMap turn={evTurnObj?.id === live?.turnId ? undefined : evTurnObj} />
              {engine.embed.state === 'loading' && engine.embed.total > 0 && (
                <p className="evidence__empty">
                  Downloading the search model: {Math.round(engine.embed.loaded / 1e6)} of {Math.round(engine.embed.total / 1e6)} MB
                </p>
              )}
            </>
          )}
        </div>
      </aside>
      <div className="evidence-scrim" onClick={() => setDrawer(false)} />

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PageViewer source={pageView} onClose={() => setPageView(null)} />
    </div>
  );
}
