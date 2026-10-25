import { env } from '../../config/env';
import { HttpError } from '../../utils/errors';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  /** Ask the provider for a JSON object when it supports a JSON mode. */
  json?: boolean;
}

/** Implement this interface to plug in another LLM provider. */
export interface LLMProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<string>;
}

export class AiUnavailableError extends HttpError {
  constructor(message: string, status = 502, code = 'ai_unavailable') {
    super(status, code, message);
  }
}

/** fetch with timeout and a single retry on transient failures (network, 429, 5xx). */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs = env.AI_TIMEOUT_MS,
  retries = 1,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  const timedOut = lastErr instanceof Error && lastErr.name === 'AbortError';
  throw new AiUnavailableError(
    timedOut ? 'The AI took too long to respond. Please try again.' : 'Could not reach the AI service. Please try again.',
    504,
    timedOut ? 'ai_timeout' : 'ai_unreachable',
  );
}

let cached: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (cached) return cached;
  // Required lazily so the server can start (and report a clear error) before a key is configured.
  if (env.AI_PROVIDER === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY) {
      throw new AiUnavailableError(
        'AI is not configured on the server. Set ANTHROPIC_API_KEY (or switch AI_PROVIDER) in server/.env.',
        503,
        'ai_not_configured',
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AnthropicProvider } = require('./anthropic') as typeof import('./anthropic');
    cached = new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
  } else {
    if (!env.OPENAI_API_KEY) {
      throw new AiUnavailableError(
        'AI is not configured on the server. Set OPENAI_API_KEY (or switch AI_PROVIDER) in server/.env.',
        503,
        'ai_not_configured',
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OpenAICompatProvider } = require('./openai') as typeof import('./openai');
    cached = new OpenAICompatProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL, env.OPENAI_BASE_URL);
  }
  return cached;
}

export function isAiConfigured(): boolean {
  return env.AI_PROVIDER === 'anthropic' ? !!env.ANTHROPIC_API_KEY : !!env.OPENAI_API_KEY;
}
