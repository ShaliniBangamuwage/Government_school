import { Injectable } from '@nestjs/common';
import { QuizAiProvider } from './quiz-ai-provider.interface';

@Injectable()
export class ConfiguredAiProviderService implements QuizAiProvider {
  private readonly provider = (process.env.AI_PROVIDER ?? 'groq').toLowerCase();
  private static readonly fallbackGroqModels = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
  ];

  private resolveModel(model?: string) {
    const requested = (model || process.env.GROQ_MODEL || process.env.AI_MODEL || 'openai/gpt-oss-120b').trim();
    if (!requested) {
      return 'openai/gpt-oss-120b';
    }
    return requested;
  }

  private parseJsonObject(content: string): Record<string, unknown> {
    const normalized = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      const start = normalized.indexOf('{');
      const end = normalized.lastIndexOf('}');
      if (start >= 0 && end > start) {
        const parsed = JSON.parse(normalized.slice(start, end + 1)) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      }
    }

    throw new Error('AI provider returned invalid JSON. Please regenerate the simulator.');
  }

  private async waitForRateLimit(response: Response, errorText: string) {
    const retryAfterHeader = Number(response.headers.get('retry-after'));
    const retryAfterBody = Number(errorText.match(/try again in ([\d.]+)s/i)?.[1]);
    const retryAfterSeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader
      : Number.isFinite(retryAfterBody) && retryAfterBody > 0
        ? retryAfterBody
        : 3;

    await new Promise((resolve) => setTimeout(resolve, Math.min(Math.ceil(retryAfterSeconds * 1000), 10000)));
  }

  async generate(prompt: string, model: string, context: string[]): Promise<Record<string, unknown>> {
    const apiKey = (process.env.AI_API_KEY ?? process.env.GROQ_API_KEY)?.trim();

    if (this.provider !== 'groq') {
      throw new Error('Only the Groq AI provider is supported for Mathematics quiz generation.');
    }

    if (!apiKey) {
      throw new Error('AI_API_KEY/GROQ_API_KEY is not configured for the selected Groq provider.');
    }

    const attemptModels = Array.from(new Set([this.resolveModel(model), ...ConfiguredAiProviderService.fallbackGroqModels]));
    let lastError: Error | null = null;

    for (const attemptModel of attemptModels) {
      let rateLimitRetried = false;

      while (true) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: attemptModel,
            temperature: 0.2,
            max_tokens: 12000,
            messages: [
              { role: 'system', content: 'Return only valid JSON for structured MCQ generation grounded in the supplied textbook content.' },
              { role: 'user', content: `${prompt}\n\nContext:\n${context.join('\n---\n')}` },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const errorMessage = response.status === 404
            ? `AI model unavailable (${attemptModel}): ${errorText}`
            : `AI provider error (${response.status}): ${errorText}`;

          if (response.status === 429) {
            if (!rateLimitRetried) {
              rateLimitRetried = true;
              await this.waitForRateLimit(response, errorText);
              continue;
            }
            throw new Error(`AI rate limit reached. Please try again shortly. Details: ${errorText}`);
          }

          lastError = new Error(errorMessage);
          break;
        }

        const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = payload.choices?.[0]?.message?.content ?? '';
        return this.parseJsonObject(content);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('AI request timed out while generating the quiz questions.');
        }
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        clearTimeout(timeout);
      }
        break;
      }
    }

    throw lastError ?? new Error('AI generation failed for all available Groq models.');
  }
}
