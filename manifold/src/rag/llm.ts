/**
 * Language-model access. Claude goes through the official Anthropic SDK directly from
 * the browser (the key never leaves this device except to Anthropic). Ollama runs
 * models locally; any OpenAI-compatible server works through its chat endpoint.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { AssistantSettings } from './settings';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
  /** JPEG/PNG data URLs, for transcribing scanned pages */
  images?: string[];
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  maxTokens?: number;
  /** JSON schema the reply must follow */
  schema?: Record<string, unknown>;
  effort?: 'low' | 'medium' | 'high';
  signal?: AbortSignal;
  onText?: (full: string) => void;
  onThinking?: (full: string) => void;
}

export interface LlmResult {
  text: string;
  model: string;
  stop?: string;
  usage?: { input: number; output: number; cacheRead?: number };
}

export class LlmError extends Error {
  readonly hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.hint = hint;
  }
}

/* ------------------------------------------------------------------ Claude */

const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-1']);

function dataUrlParts(url: string) {
  const m = url.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.*)$/);
  if (!m) throw new LlmError('Unsupported image format.');
  return { media_type: m[1] as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif', data: m[2] };
}

async function claude(s: AssistantSettings, req: LlmRequest): Promise<LlmResult> {
  // the SDK loads only when Claude is actually used
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: s.anthropicKey.trim(), dangerouslyAllowBrowser: true, maxRetries: 2 });
  const messages: Anthropic.Beta.BetaMessageParam[] = req.messages.map((m) =>
    m.images?.length
      ? {
          role: m.role,
          content: [
            ...m.images.map((u) => ({ type: 'image' as const, source: { type: 'base64' as const, ...dataUrlParts(u) } })),
            { type: 'text' as const, text: m.content },
          ],
        }
      : { role: m.role, content: m.content },
  );
  const withFallback = FALLBACK_MODELS.has(s.anthropicModel);
  const stream = client.beta.messages.stream(
    {
      model: s.anthropicModel,
      max_tokens: req.maxTokens ?? 16000,
      system: req.system,
      messages,
      // cache the conversation prefix so follow-up questions are cheaper
      cache_control: { type: 'ephemeral' },
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: {
        effort: req.effort ?? s.effort,
        ...(req.schema ? { format: { type: 'json_schema' as const, schema: req.schema } } : {}),
      },
      ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    },
    { signal: req.signal },
  );
  let text = '';
  let thinking = '';
  try {
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta') {
        if (ev.delta.type === 'text_delta') {
          text += ev.delta.text;
          req.onText?.(text);
        } else if (ev.delta.type === 'thinking_delta') {
          thinking += ev.delta.thinking;
          req.onThinking?.(thinking);
        }
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      throw new LlmError('Claude declined to answer this request.', 'Try rephrasing the question.');
    }
    return {
      text,
      model: final.model,
      stop: final.stop_reason ?? undefined,
      usage: { input: final.usage.input_tokens, output: final.usage.output_tokens, cacheRead: final.usage.cache_read_input_tokens ?? undefined },
    };
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (err instanceof Anthropic.APIUserAbortError) throw new DOMException('Stopped', 'AbortError');
    if (err instanceof Anthropic.AuthenticationError) throw new LlmError('Anthropic rejected the API key.', 'Check the key in Assistant settings.');
    if (err instanceof Anthropic.PermissionDeniedError) throw new LlmError('This API key cannot use the selected model.', 'Pick another Claude model in Assistant settings.');
    if (err instanceof Anthropic.NotFoundError) throw new LlmError(`The model ${s.anthropicModel} was not found.`, 'Pick another Claude model in Assistant settings.');
    if (err instanceof Anthropic.RateLimitError) throw new LlmError('Anthropic is rate-limiting this key.', 'Wait a minute and try again.');
    if (err instanceof Anthropic.BadRequestError) throw new LlmError(`Anthropic could not process the request: ${err.message}`);
    if (err instanceof Anthropic.APIConnectionError) throw new LlmError('Could not reach Anthropic.', 'Check your internet connection.');
    if (err instanceof Anthropic.APIError) throw new LlmError(`Anthropic returned an error (${err.status ?? 'unknown'}).`, 'Try again in a moment.');
    throw err;
  }
}

/* ------------------------------------------------------------------ Ollama */

const trimUrl = (u: string) => u.trim().replace(/\/+$/, '');

async function* lines(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line) yield line;
      }
    }
    if (buf.trim()) yield buf.trim();
  } finally {
    // closing the stream early (loop guard) tells the server to stop generating
    void reader.cancel().catch(() => undefined);
  }
}

/**
 * Small local models sometimes fall into a loop, repeating the same lines until they
 * hit the length limit. If the last stretch of text has already appeared twice,
 * return the length to cut back to (just before the repetition began).
 */
export function loopCut(t: string): number | null {
  const W = 160;
  if (t.length < 1200) return null;
  const tail = t.slice(-W);
  const first = t.indexOf(tail);
  if (first < 0 || first >= t.length - W) return null;
  const second = t.indexOf(tail, first + 1);
  if (second < 0 || second >= t.length - W) return null;
  return second;
}

async function ollama(s: AssistantSettings, req: LlmRequest): Promise<LlmResult> {
  const url = `${trimUrl(s.ollamaUrl)}/api/chat`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: req.signal,
      body: JSON.stringify({
        model: s.ollamaModel,
        stream: true,
        messages: [
          { role: 'system', content: req.system },
          ...req.messages.map((m) => ({ role: m.role, content: m.content, images: m.images?.map((u) => u.replace(/^data:[^,]+,/, '')) })),
        ],
        format: req.schema,
        // reasoning models think out loud for minutes on a CPU; only allow it at high effort
        think: (req.effort ?? s.effort) === 'high' ? undefined : false,
        keep_alive: '30m',
        options: { num_ctx: 16384, num_predict: Math.min(req.maxTokens ?? 4096, 8192), temperature: req.schema ? 0.2 : 0.4, repeat_penalty: 1.12 },
      }),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new LlmError(`Could not reach Ollama at ${trimUrl(s.ollamaUrl)}.`, 'Start Ollama, or check the address in Assistant settings.');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new LlmError(`Ollama returned ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}.`, 'Check the model name in Assistant settings.');
  }
  let text = '';
  let thinking = '';
  let usage: LlmResult['usage'];
  for await (const line of lines(res)) {
    const m = JSON.parse(line) as { message?: { content?: string; thinking?: string }; done?: boolean; error?: string; prompt_eval_count?: number; eval_count?: number };
    if (m.error) throw new LlmError(`Ollama: ${m.error}`);
    if (m.message?.thinking) {
      thinking += m.message.thinking;
      req.onThinking?.(thinking);
    }
    if (m.message?.content) {
      text += m.message.content;
      const cut = loopCut(text);
      if (cut !== null) {
        text = text.slice(0, cut).trimEnd();
        req.onText?.(text);
        return { text, model: s.ollamaModel, stop: 'loop' };
      }
      req.onText?.(text);
    }
    if (m.done) usage = { input: m.prompt_eval_count ?? 0, output: m.eval_count ?? 0 };
  }
  return { text, model: s.ollamaModel, usage };
}

export async function ollamaModels(base: string): Promise<string[]> {
  const res = await fetch(`${trimUrl(base)}/api/tags`, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const j = (await res.json()) as { models?: { name: string }[] };
  return (j.models ?? []).map((m) => m.name);
}

/* ------------------------------------------------------------------ OpenAI-compatible */

async function openaiCompat(s: AssistantSettings, req: LlmRequest): Promise<LlmResult> {
  const url = `${trimUrl(s.openaiUrl)}/chat/completions`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(s.openaiKey ? { Authorization: `Bearer ${s.openaiKey.trim()}` } : {}) },
      signal: req.signal,
      body: JSON.stringify({
        model: s.openaiModel,
        stream: true,
        temperature: req.schema ? 0.2 : 0.4,
        max_tokens: req.maxTokens,
        messages: [
          { role: 'system', content: req.system },
          ...req.messages.map((m) =>
            m.images?.length
              ? { role: m.role, content: [...m.images.map((u) => ({ type: 'image_url', image_url: { url: u } })), { type: 'text', text: m.content }] }
              : { role: m.role, content: m.content },
          ),
        ],
        ...(req.schema ? { response_format: { type: 'json_schema', json_schema: { name: 'reply', schema: req.schema } } } : {}),
      }),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new LlmError(`Could not reach ${trimUrl(s.openaiUrl)}.`, 'Check the server address, and that it allows requests from this page.');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new LlmError(`The server returned ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}.`, 'Check the model name and key in Assistant settings.');
  }
  let text = '';
  for await (const line of lines(res)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') break;
    const m = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
    const d = m.choices?.[0]?.delta?.content;
    if (d) {
      text += d;
      const cut = loopCut(text);
      if (cut !== null) {
        text = text.slice(0, cut).trimEnd();
        req.onText?.(text);
        return { text, model: s.openaiModel, stop: 'loop' };
      }
      req.onText?.(text);
    }
  }
  return { text, model: s.openaiModel };
}

/* ------------------------------------------------------------------ entry points */

export function complete(s: AssistantSettings, req: LlmRequest): Promise<LlmResult> {
  if (s.provider === 'anthropic') return claude(s, req);
  if (s.provider === 'ollama') return ollama(s, req);
  return openaiCompat(s, req);
}

/** Parse a JSON reply, tolerating code fences or prose around the object. */
export function parseJson<T>(text: string): T {
  const t = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(t) as T;
  } catch {
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1)) as T;
    throw new LlmError('The model returned malformed JSON.', 'Try again; smaller local models sometimes do this.');
  }
}

export const isAbort = (err: unknown) => (err as Error)?.name === 'AbortError';
