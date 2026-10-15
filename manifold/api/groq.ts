/**
 * Server-side proxy to Groq. The API key lives only here (GROQ_API_KEY), never in the browser bundle.
 * The page sends an OpenAI-style chat request; this function checks it, picks a model, and streams
 * Groq's reply back. If a model is rate-limited or down, the next one in the list takes over.
 */

/** Best first. The first entry is the default. */
export const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'] as const;
/** Models that accept images, for transcribing scanned pages. */
const VISION = new Set(['qwen/qwen3.8-27b']);
const REASONING = new Set(['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);

const MAX_BODY = 3_500_000;
const MAX_TOKENS = 8000;
const PER_MINUTE = 40;

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const k of hits.keys()) if (!hits.get(k)!.some((t) => now - t < 60_000)) hits.delete(k);
  return recent.length > PER_MINUTE;
}

const json = (status: number, message: string, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error: { message } }), { status, headers: { 'Content-Type': 'application/json', ...extra } });

interface ChatBody {
  model?: string;
  messages?: { role: string; content: unknown }[];
  max_tokens?: number;
  temperature?: number;
  json?: boolean;
  reasoning_effort?: string;
}

export async function handleGroq(request: Request, key: string | undefined): Promise<Response> {
  if (request.method !== 'POST') return json(405, 'Use POST.');
  if (!key) return json(500, 'The server has no GROQ_API_KEY. Add it to the project environment variables.');

  // only this site may call the endpoint from a browser
  const origin = request.headers.get('origin');
  if (origin) {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    if (host && new URL(origin).host !== host) return json(403, 'This endpoint only serves the Manifold site.');
  }
  const ip = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  if (limited(ip)) return json(429, 'Too many questions in a minute. Wait a moment and try again.');

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, 'That request is too large.');
  let body: ChatBody;
  try {
    body = JSON.parse(raw) as ChatBody;
  } catch {
    return json(400, 'The request was not valid JSON.');
  }
  if (!Array.isArray(body.messages) || !body.messages.length) return json(400, 'No messages.');
  const messages = body.messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user', content: m.content }));
  const hasImage = messages.some((m) => Array.isArray(m.content) && m.content.some((p: { type?: string }) => p.type === 'image_url'));

  // requested model first, then the others in order of quality
  const first = GROQ_MODELS.find((m) => m === body.model) ?? GROQ_MODELS[0];
  const order = [first, ...GROQ_MODELS.filter((m) => m !== first)].filter((m) => !hasImage || VISION.has(m));

  let last: Response | null = null;
  for (const model of order) {
    const payload: Record<string, unknown> = {
      model,
      messages,
      stream: true,
      temperature: Math.min(1, Math.max(0, body.temperature ?? 0.4)),
      max_tokens: Math.min(MAX_TOKENS, Math.max(16, body.max_tokens ?? 4096)),
    };
    if (body.json) payload.response_format = { type: 'json_object' };
    if (REASONING.has(model)) payload.reasoning_effort = ['low', 'medium', 'high'].includes(body.reasoning_effort ?? '') ? body.reasoning_effort : 'low';
    let res: Response;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      continue;
    }
    if (res.ok) {
      return new Response(res.body, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Groq-Model': model, 'X-Groq-Fallback': model === first ? '0' : '1' },
      });
    }
    last = res;
    // rate limit, oversized request or provider error: try the next model; anything else is final
    if (![413, 429, 500, 502, 503].includes(res.status)) break;
  }
  if (!last) return json(502, 'Could not reach Groq.');
  const text = await last.text().catch(() => '');
  let message = `Groq returned ${last.status}.`;
  try {
    message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? message;
  } catch {
    /* keep the generic message */
  }
  return json(last.status, message);
}

export async function POST(request: Request) {
  return handleGroq(request, process.env.GROQ_API_KEY);
}

export async function GET(request: Request) {
  return handleGroq(request, process.env.GROQ_API_KEY);
}
