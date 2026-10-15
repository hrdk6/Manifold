/**
 * One assistant turn: understand the question (rewrite, expand, imagine an answer),
 * retrieve passages, then write a grounded, cited reply in the chosen study mode.
 */
import { complete, parseJson, type LlmMessage } from './llm';
import { cardsSchema, PLANNER, plannerMessage, plannerSchema, quizSchema, SYSTEM, userMessage } from './prompts';
import { documentSources, retrieve } from './retrieve';
import { contextBudget, hasModel, settings } from './settings';
import { getDoc } from './kb';
import type { CardItem, ChatTurn, Mode, QueryVariant, QuizItem, RetrievalTrace, Source } from './types';
import { uid } from './util';

export type Stage = 'plan' | 'search' | 'rerank' | 'write';

export interface TurnUpdate {
  stage: Stage;
  text?: string;
  /** characters drafted so far, for replies that are not streamed as text (quizzes, cards) */
  drafted?: number;
  thinking?: string;
  sources?: Source[];
  trace?: RetrievalTrace;
  standalone?: string;
}

export interface TurnInput {
  history: ChatTurn[];
  question: string;
  mode: Mode;
  marks?: number;
  scope: string[] | null;
  /** document to summarise in summary mode */
  docId?: string;
  signal: AbortSignal;
  onUpdate: (u: TurnUpdate) => void;
}

interface Plan {
  standalone: string;
  queries: string[];
  hypothetical: string;
  search: boolean;
}

/** Prior turns as the model saw them, oldest first, so the prompt prefix stays cacheable. */
function historyMessages(history: ChatTurn[]): LlmMessage[] {
  const out: LlmMessage[] = [];
  for (let i = 0; i + 1 < history.length; i += 2) {
    const u = history[i];
    const a = history[i + 1];
    if (u.role !== 'user' || a.role !== 'assistant' || a.error || a.extractive || a.stopped) continue;
    const reply = a.quiz
      ? `(Gave a ${a.quiz.length}-question quiz: ${a.quiz.map((q) => q.question).join(' | ')})`
      : a.cards
        ? `(Gave ${a.cards.length} flashcards: ${a.cards.map((c) => c.term).join(', ')})`
        : a.text;
    if (!reply) continue;
    out.push({ role: 'user', content: u.wire ?? u.text }, { role: 'assistant', content: reply });
  }
  return out.slice(-8);
}

export async function runTurn(input: TurnInput): Promise<Partial<ChatTurn> & { queryVec?: Float32Array }> {
  const s = settings.get();
  const model = hasModel(s);
  const { mode, question, signal, onUpdate } = input;
  let standalone = question;
  let sources: Source[] = [];
  let trace: RetrievalTrace | undefined;
  let queryVec: Float32Array | undefined;

  if (mode === 'summary' && input.docId) {
    onUpdate({ stage: 'search' });
    sources = documentSources(input.docId, contextBudget(s));
    onUpdate({ stage: 'search', sources });
  } else {
    // 1. understand the question
    let plan: Plan = { standalone: question, queries: [], hypothetical: '', search: true };
    let tPlan: number | undefined;
    // On a local model the extra call costs real time, so only rewrite follow-ups there.
    const plan_ = model && s.rewrite && (s.provider === 'anthropic' || input.history.length > 0);
    if (plan_) {
      onUpdate({ stage: 'plan' });
      const t0 = performance.now();
      try {
        const r = await complete(s, {
          system: PLANNER,
          messages: [{ role: 'user', content: plannerMessage(question, input.history.map((t) => ({ role: t.role, text: t.text }))) }],
          schema: plannerSchema,
          effort: 'low',
          maxTokens: 2000,
          signal,
        });
        const p = parseJson<Partial<Plan>>(r.text);
        plan = {
          standalone: p.standalone?.trim() || question,
          queries: (p.queries ?? []).filter((q) => typeof q === 'string' && q.trim()).slice(0, 3),
          hypothetical: p.hypothetical?.trim() ?? '',
          search: p.search !== false,
        };
      } catch (err) {
        if (signal.aborted) throw err;
        console.warn('Query planning failed; searching with the question as asked', err);
      }
      tPlan = performance.now() - t0;
    }
    standalone = plan.standalone;
    onUpdate({ stage: 'search', standalone });

    // 2. retrieve
    if (plan.search || input.scope) {
      const queries: QueryVariant[] = [
        { text: standalone, kind: 'question' },
        ...plan.queries.map((text) => ({ text, kind: 'rewrite' as const })),
        ...(plan.hypothetical && s.dense ? [{ text: plan.hypothetical, kind: 'hyde' as const }] : []),
      ];
      const k = mode === 'quiz' || mode === 'cards' || mode === 'exam' ? Math.max(s.k, 8) : s.k;
      const r = await retrieve(queries, {
        k,
        dense: s.dense,
        rerank: s.rerank,
        neighbors: s.neighbors,
        scope: input.scope,
        onStage: (st) => onUpdate({ stage: st }),
      });
      sources = r.sources;
      trace = { ...r.trace, ms: { ...r.trace.ms, plan: tPlan } };
      queryVec = r.queryVecs[0];
      onUpdate({ stage: 'rerank', sources, trace });
    }
  }

  if (signal.aborted) throw new DOMException('Stopped', 'AbortError');

  // Without a model, the passages are the answer.
  if (!model) return { text: '', sources, trace, standalone, extractive: true, queryVec };

  // 3. write
  onUpdate({ stage: 'write', sources, trace });
  const title = input.docId ? getDoc(input.docId)?.title : undefined;
  const asked = mode === 'summary' && title ? `Summarise "${title}".${question && !question.startsWith('Summarise') ? ` ${question}` : ''}` : question;
  const wire = userMessage(asked, sources, mode, input.marks);
  const structured = mode === 'quiz' || mode === 'cards';
  const r = await complete(s, {
    system: SYSTEM,
    messages: [...historyMessages(input.history), { role: 'user', content: wire }],
    schema: mode === 'quiz' ? quizSchema : mode === 'cards' ? cardsSchema : undefined,
    signal,
    maxTokens: s.provider === 'anthropic' ? 16000 : 4096,
    onText: structured ? (text) => onUpdate({ stage: 'write', drafted: text.length }) : (text) => onUpdate({ stage: 'write', text }),
    onThinking: (thinking) => onUpdate({ stage: 'write', thinking }),
  });

  const out: Partial<ChatTurn> & { queryVec?: Float32Array } = {
    text: structured ? '' : r.text,
    sources,
    trace,
    standalone,
    model: r.model,
    usage: r.usage,
    wire,
    queryVec,
  };
  if (r.stop === 'max_tokens') out.error = 'The reply hit the length limit and was cut short.';
  if (r.stop === 'loop') out.error = 'The model started repeating itself, so the reply was cut there.';
  if (mode === 'quiz') {
    const j = parseJson<{ questions?: QuizItem[] }>(r.text);
    out.quiz = (j.questions ?? [])
      .filter((q) => q.question && Array.isArray(q.options) && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length)
      .slice(0, 8);
    if (!out.quiz.length) out.error = 'The model did not return any usable questions. Try again.';
  } else if (mode === 'cards') {
    const j = parseJson<{ cards?: CardItem[] }>(r.text);
    out.cards = (j.cards ?? []).filter((c) => c.term && c.def).slice(0, 12);
    if (!out.cards.length) out.error = 'The model did not return any usable flashcards. Try again.';
  }
  return out;
}

export function newTurn(role: 'user' | 'assistant', mode: Mode, patch: Partial<ChatTurn> = {}): ChatTurn {
  return { id: uid('t'), role, text: '', mode, at: Date.now(), ...patch };
}
