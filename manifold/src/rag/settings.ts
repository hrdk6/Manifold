/** Assistant settings, saved in this browser only. */
import { useSyncExternalStore } from 'react';

export type Provider = 'anthropic' | 'ollama' | 'openai';
export type Effort = 'low' | 'medium' | 'high';

export interface AssistantSettings {
  provider: Provider;
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
  provider: 'anthropic',
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
    if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<AssistantSettings>) };
  } catch {
    /* storage unavailable */
  }
  return { ...defaults };
}

let state = load();
const subs = new Set<() => void>();

export const settings = {
  get: () => state,
  set(patch: Partial<AssistantSettings>) {
    state = { ...state, ...patch };
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
  if (s.provider === 'anthropic') return s.anthropicKey.trim().length > 10;
  if (s.provider === 'ollama') return !!s.ollamaModel && !!s.ollamaUrl;
  return !!s.openaiUrl && !!s.openaiModel;
}

export function modelLabel(s: AssistantSettings) {
  if (!hasModel(s)) return 'Search only';
  if (s.provider === 'anthropic') return CLAUDE_MODELS.find((m) => m.id === s.anthropicModel)?.label ?? s.anthropicModel;
  if (s.provider === 'ollama') return s.ollamaModel;
  return s.openaiModel;
}

/** Character budget for a whole document in summary mode. */
export function contextBudget(s: AssistantSettings) {
  return s.provider === 'anthropic' ? 160_000 : 24_000;
}
