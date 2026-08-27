import { Injectable, Logger } from '@nestjs/common';
import { SimulatorAiProvider } from './simulator-ai-provider.interface';

@Injectable()
export class GroqSimulatorProviderService implements SimulatorAiProvider {
  async generate(prompt: string, _model: string, context: string[]): Promise<Record<string, unknown>> {
    const model =
      process.env.GROQ_MODEL?.trim() ||
      'openai/gpt-oss-120b';

    Logger.log(`Groq simulator model: ${model}`);

    const apiKey = (process.env.GROQ_API_KEY ?? process.env.AI_API_KEY)?.trim();
    if (!apiKey) {
      throw new Error('AI_API_KEY/GROQ_API_KEY is not configured for the selected Groq provider.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Return only valid JSON for the requested mathematics simulator.' },
          { role: 'user', content: `${prompt}\n\nContext:\n${context.join('\n---\n')}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI provider error (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI provider returned a non-object JSON payload.');
    }

    return parsed;
  }
}
