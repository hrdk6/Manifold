/** Assistant settings, saved in this browser only. */
import { useSyncExternalStore } from 'react';

export type Provider = 'groq' | 'anthropic' | 'ollama' | 'openai';
export type Effort = 'low' | 'medium' | 'high';

/** Running anywhere other than this computer. Only Groq is offered there; the key stays on the server. */
export const isCloud = typeof location !== 'undefined' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export const GROQ_MODELS: { id: string; label: string; note: string; vision?: boolean }[] = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: 'Best reasoning and exam answers' },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', note: 'Fast, and can read scanned pages', vision: true },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', note: 'Quickest, for short questions' },
];

export interface AssistantSettings {
  provider: Provider;
  groqModel: string;
  anthropicKey: string;
  anthropicModel: string;
  effort: Effort;
  ollamaUrl: string;
  ollamaModel: string;
  openaiUrl: string;
  openaiKey: string;
  openaiModel: string;
  /** rewrite follow-ups, expand the query and draft a hypothetical answer before searching */
  rewrite: boolean;
  /** semantic (embedding) search alongside keyword search */
  dense: boolean;
  /** cross-encoder reranking of the fused candidates */
  rerank: boolean;
  /** include the passages either side of each hit */
  neighbors: boolean;
  /** passages per answer */
  k: number;
}

export const CLAUDE_MODELS: { id: string; label: string; note: string }[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Best explanations and exam answers' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Fast and capable' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Quickest and cheapest' },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', note: 'Most capable, highest cost' },
];

const KEY = 'manifold-assistant-v1';

const defaults: AssistantSettings = {
  provider: 'groq',
  groqModel: GROQ_MODELS[0].id,
  anthropicKey: '',
  anthropicModel: 'claude-opus-5-5',
  effort: 'medium',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: '',
  openaiUrl: '',
  openaiKey: '',
  openaiModel: '',
  rewrite: true,
  dense: true,
  rerank: true,
  neighbors: true,
  k: 6,
};

function load(): AssistantSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return clamp({ ...defaults, ...(JSON.parse(raw) as Partial<AssistantSettings>) });
  } catch {
    /* storage unavailable */
  }
  return clamp({ ...defaults });
}

/** On the cloud there is exactly one provider and three models. */
function clamp(s: AssistantSettings): AssistantSettings {
  if (!GROQ_MODELS.some((m) => m.id === s.groqModel)) s = { ...s, groqModel: GROQ_MODELS[0].id };
  return isCloud ? { ...s, provider: 'groq' } : s;
}

let state = load();
const subs = new Set<() => void>();

export const settings = {
  get: () => state,
  set(patch: Partial<AssistantSettings>) {
    state = clamp({ ...state, ...patch });
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

export function useSettings() {
  return useSyncExternalStore(settings.subscribe, settings.get, settings.get);
}

/** Is a language model configured? Without one the assistant shows passages only. */
export function hasModel(s: AssistantSettings) {
  if (s.provider === 'groq') return true; // the server holds the key; a missing key is reported when you ask
  if (s.provider === 'anthropic') return s.anthropicKey.trim().length > 10;
  if (s.provider === 'ollama') return !!s.ollamaModel && !!s.ollamaUrl;
  return !!s.openaiUrl && !!s.openaiModel;
}

export function modelLabel(s: AssistantSettings) {
  if (!hasModel(s)) return 'Search only';
  if (s.provider === 'groq') return GROQ_MODELS.find((m) => m.id === s.groqModel)?.label ?? s.groqModel;
  if (s.provider === 'anthropic') return CLAUDE_MODELS.find((m) => m.id === s.anthropicModel)?.label ?? s.anthropicModel;
  if (s.provider === 'ollama') return s.ollamaModel;
  return s.openaiModel;
}

/** Character budget for a whole document in summary mode. */
export function contextBudget(s: AssistantSettings) {
  if (s.provider === 'groq') return 28_000; // keeps a whole-document summary inside Groq's per-minute token limits
  return s.provider === 'anthropic' ? 160_000 : 24_000;
}
