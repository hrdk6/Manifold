/** Shared streaming for OpenAI-style chat endpoints: Groq (through /api/groq) and any other compatible server. */
import { LlmError, loopCut, readLines, type LlmRequest, type LlmResult } from './llm';

export interface ChatTarget {
  url: string;
  headers: Record<string, string>;
  model: string;
  /** shown in "could not reach …" */
  label: string;
  /** turn a failed response into something the student can act on */
  explain: (status: number, body: string) => LlmError;
}

export function wireMessages(req: Pick<LlmRequest, 'system' | 'messages'>) {
  return [
    { role: 'system', content: req.system },
    ...req.messages.map((m) =>
      m.images?.length
        ? { role: m.role, content: [...m.images.map((u) => ({ type: 'image_url', image_url: { url: u } })), { type: 'text', text: m.content }] }
        : { role: m.role, content: m.content },
    ),
  ];
}

export async function streamChat(t: ChatTarget, req: LlmRequest, payload: Record<string, unknown>): Promise<LlmResult> {
  let res: Response;
  try {
    res = await fetch(t.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...t.headers }, signal: req.signal, body: JSON.stringify(payload) });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new LlmError(`Could not reach ${t.label}.`, 'Check your connection, and the server address if you set one.');
  }
  if (!res.ok) throw t.explain(res.status, await res.text().catch(() => ''));
  // the Groq function reports which model actually answered (it falls back when one is rate-limited)
  const served = res.headers.get('x-groq-model') ?? t.model;
  let text = '';
  for await (const line of readLines(res)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') break;
    let m: { choices?: { delta?: { content?: string } }[]; error?: { message?: string } };
    try {
      m = JSON.parse(data);
    } catch {
      continue;
    }
    if (m.error?.message) throw new LlmError(m.error.message, 'Try again in a moment.');
    const d = m.choices?.[0]?.delta?.content;
    if (d) {
      text += d;
      const cut = loopCut(text);
      if (cut !== null) {
        text = text.slice(0, cut).trimEnd();
        req.onText?.(text);
        return { text, model: served, stop: 'loop' };
      }
      req.onText?.(text);
    }
  }
  return { text, model: served };
}
