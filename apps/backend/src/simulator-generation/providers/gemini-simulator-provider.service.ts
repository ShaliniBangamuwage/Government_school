import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { SimulatorAiProvider } from './simulator-ai-provider.interface';

export class GeminiProviderError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string) {
    super(message);
    this.name = 'GeminiProviderError';
  }
}

@Injectable()
export class GeminiSimulatorProviderService implements SimulatorAiProvider {
  private static readonly responseJsonSchema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      learningObjectives: { type: 'array', items: { type: 'string' } },
      files: {
        type: 'object',
        properties: {
          '/App.tsx': { type: 'string' },
          '/styles.css': { type: 'string' },
        },
        required: ['/App.tsx', '/styles.css'],
      },
      dependencies: { type: 'object' },
      teacherInstructions: { type: 'string' },
    },
    required: ['title', 'description', 'learningObjectives', 'files', 'dependencies', 'teacherInstructions'],
  };

  async generate(prompt: string, requestedModel: string, context: string[], maxOutputTokens = 16384): Promise<Record<string, unknown>> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL?.trim() || requestedModel || 'gemini-3.6-flash';

    if (!apiKey) {
      throw new GeminiProviderError('Gemini API key is missing or invalid.');
    }

    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model,
        contents: `${prompt}\n\nContext:\n${context.join('\n---\n')}`,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: GeminiSimulatorProviderService.responseJsonSchema,
          maxOutputTokens: Math.min(Math.max(maxOutputTokens, 1200), 16384),
        },
      });
      const rawText = response.text?.trim() ?? '';
      if (!rawText) {
        const finishReason = (response as { candidates?: Array<{ finishReason?: string }> }).candidates?.[0]?.finishReason;
        throw new GeminiProviderError(`Invalid JSON from Gemini. Response was empty${finishReason ? ` (${finishReason})` : ''}.`);
      }
      const normalized = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(normalized) as unknown;
      } catch {
        const start = normalized.indexOf('{');
        const end = normalized.lastIndexOf('}');
        if (start < 0 || end <= start) {
          throw new GeminiProviderError('Invalid JSON from Gemini. Response was empty or truncated.');
        }
        try {
          parsed = JSON.parse(normalized.slice(start, end + 1)) as unknown;
        } catch {
          throw new GeminiProviderError('Invalid JSON from Gemini. Response was truncated.');
        }
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new GeminiProviderError('Invalid JSON from Gemini.');
      }

      return parsed as Record<string, unknown>;
    } catch (error) {
      if (error instanceof GeminiProviderError) {
        throw error;
      }

      const status = this.getErrorStatus(error);
      const code = this.getErrorCode(error);
      const upstreamMessage = this.getErrorMessage(error);
      console.error({ provider: 'gemini', model, status, code, message: upstreamMessage });

      if (status === 401 || status === 403) {
        throw new GeminiProviderError('Gemini API key is missing, invalid, or not permitted.', status, code);
      }
      if (status === 404 || /model_not_found|model does not exist|unknown model|unsupported model/i.test(upstreamMessage)) {
        throw new GeminiProviderError('The configured Gemini model is unavailable.', status, code);
      }
      if (status === 429 || /rate limit|quota|resource exhausted/i.test(upstreamMessage)) {
        throw new GeminiProviderError('Gemini rate limit reached. Please try again shortly.', status, code);
      }
      if (/json|parse/i.test(upstreamMessage)) {
        throw new GeminiProviderError('Invalid JSON from Gemini.', status, code);
      }
      throw new GeminiProviderError(upstreamMessage || 'Gemini request failed.', status, code);
    }
  }

  private getErrorStatus(error: unknown) {
    if (!error || typeof error !== 'object') return undefined;
    const candidate = error as { status?: number; response?: { status?: number }; error?: { code?: number } };
    return candidate.status ?? candidate.response?.status;
  }

  private getErrorCode(error: unknown) {
    if (!error || typeof error !== 'object') return undefined;
    const candidate = error as { code?: string; error?: { code?: string } };
    return candidate.code ?? candidate.error?.code;
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
