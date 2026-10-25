import { AiUnavailableError, CompletionRequest, LLMProvider, fetchWithRetry } from './provider';

/** Works with OpenAI and any OpenAI-compatible chat-completions endpoint. */
export class OpenAICompatProvider implements LLMProvider {
  readonly name = 'openai';
  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string,
  ) {}

  async complete(req: CompletionRequest): Promise<string> {
    const res = await fetchWithRetry(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens,
        temperature: req.temperature ?? 0.7,
        ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'system', content: req.system }, ...req.messages],
      }),
    });

    if (!res.ok) {
      console.error(`OpenAI-compatible API error: HTTP ${res.status}`);
      if (res.status === 401 || res.status === 403) {
        throw new AiUnavailableError('The AI provider rejected the server API key. Check OPENAI_API_KEY.', 503, 'ai_auth');
      }
      if (res.status === 404) {
        throw new AiUnavailableError('The configured AI model was not found. Check OPENAI_MODEL.', 503, 'ai_model');
      }
      if (res.status === 429) {
        throw new AiUnavailableError('The AI service is busy right now. Please try again in a moment.', 429, 'ai_rate_limited');
      }
      throw new AiUnavailableError('The AI service had a problem. Please try again.');
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new AiUnavailableError('The AI returned an empty response. Please try again.');
    return text;
  }
}
