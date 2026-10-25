import { AiUnavailableError, CompletionRequest, LLMProvider, fetchWithRetry } from './provider';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async complete(req: CompletionRequest): Promise<string> {
    const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens,
        temperature: req.temperature ?? 0.7,
        system: req.system,
        messages: req.messages,
      }),
    });

    if (!res.ok) {
      // Log status only; never log request bodies or keys.
      console.error(`Anthropic API error: HTTP ${res.status}`);
      if (res.status === 401 || res.status === 403) {
        throw new AiUnavailableError('The AI provider rejected the server API key. Check ANTHROPIC_API_KEY.', 503, 'ai_auth');
      }
      if (res.status === 404) {
        throw new AiUnavailableError('The configured AI model was not found. Check ANTHROPIC_MODEL.', 503, 'ai_model');
      }
      if (res.status === 429) {
        throw new AiUnavailableError('The AI service is busy right now. Please try again in a moment.', 429, 'ai_rate_limited');
      }
      throw new AiUnavailableError('The AI service had a problem. Please try again.');
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('');
    if (!text) throw new AiUnavailableError('The AI returned an empty response. Please try again.');
    return text;
  }
}
