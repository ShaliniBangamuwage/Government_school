import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SourceGroundingService } from '../quiz-generation/source-grounding.service';

type TutorInput = {
  question?: unknown;
  grade?: unknown;
  medium?: unknown;
  outputMedium?: unknown;
  topic?: unknown;
  unitId?: unknown;
  textbookId?: unknown;
  lessonId?: unknown;
};

@Injectable()
export class StudentTutorService {
  constructor(
    private readonly sourceGroundingService: SourceGroundingService,
  ) {}

  async answer(input: TutorInput) {
    const question = String(input.question ?? '').trim();
    if (question.length < 2 || question.length > 2000) {
      throw new BadRequestException('Please enter a question between 2 and 2000 characters.');
    }

    const grade = Number(input.grade ?? 6);
    const medium = this.normalizeMedium(input.medium);
    const outputMedium = this.normalizeOutputMedium(input.outputMedium ?? input.medium);
    const topic = String(input.topic ?? 'general Mathematics').trim().slice(0, 120);
    const grounding = await this.sourceGroundingService.loadApprovedSourceContext(
      String(input.unitId ?? 'unknown'),
      { grade, medium, textbookId: String(input.textbookId ?? ''), lessonId: String(input.lessonId ?? '') },
    );
    const context = grounding.approvedSources
      .filter((source) => source.sourceText)
      .map((source) => `${source.title}\n${source.sourceText.slice(0, 12000)}`);

    const languageInstruction = outputMedium === 'Singlish'
      ? 'Write in Singlish: Sinhala expressed using English/Latin letters, while keeping mathematical symbols and numbers clear. Do not use Sinhala script unless the student asks for it.'
      : `Write entirely in ${outputMedium}, including the answer, steps, and practice question.`;
    const prompt = `You are a patient Sri Lankan school Mathematics tutor. Understand questions written in Sinhala, Tamil, English, or Singlish. ${languageInstruction} Answer for Grade ${grade}, topic: ${topic}. Use simple age-appropriate language, show the reasoning step by step, and never give a confident answer when the maths is uncertain. If approved textbook context is supplied, ground the explanation in it and do not mention internal systems. Return JSON only in this exact shape: {"answer":"...","steps":["..."],"practiceQuestion":"..."}. Student question: ${question}`;
    let result: Record<string, unknown>;
    try {
      result = await this.generateWithGroq(prompt, context);
    } catch (error) {
      const providerError = error as { status?: number; message?: string };
      if (providerError.status === 429 || providerError.message?.includes('429') || providerError.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new HttpException('The maths tutor is temporarily at its AI usage limit. Please try again later or switch the configured AI provider.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new HttpException('The maths tutor service is temporarily unavailable. Please try again shortly.', HttpStatus.BAD_GATEWAY);
    }

    return {
      answer: typeof result.answer === 'string' ? result.answer : 'I could not prepare an explanation for that question.',
      steps: Array.isArray(result.steps) ? result.steps.map((step) => String(step)) : [],
      practiceQuestion: typeof result.practiceQuestion === 'string' ? result.practiceQuestion : null,
      medium,
      groundedInApprovedTextbook: context.length > 0,
    };
  }

  private async generateWithGroq(prompt: string, context: string[]): Promise<Record<string, unknown>> {
    const apiKey = (process.env.GROQ_API_KEY ?? process.env.AI_API_KEY)?.trim();
    if (!apiKey) {
      throw new Error('GROQ_API_KEY or AI_API_KEY is required for the student maths tutor.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b',
        temperature: 0.2,
        max_tokens: 4000,
        messages: [
          { role: 'system', content: 'You are a patient Mathematics tutor. Return only valid JSON with answer, steps, and practiceQuestion.' },
          { role: 'user', content: `${prompt}\n\nApproved textbook context:\n${context.join('\n---\n')}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Groq tutor request failed (${response.status}): ${errorText}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim() ?? '';
    const normalized = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const jsonStart = normalized.indexOf('{');
    const jsonEnd = normalized.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      throw new HttpException('The maths tutor returned an unreadable answer. Please try again.', HttpStatus.BAD_GATEWAY);
    }
    const parsed = JSON.parse(normalized.slice(jsonStart, jsonEnd + 1)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Groq tutor returned an invalid response.');
    }
    return parsed as Record<string, unknown>;
  }

  private normalizeMedium(value: unknown): 'Sinhala' | 'English' | 'Tamil' {
    const medium = String(value ?? 'English').trim().toLowerCase();
    if (medium === 'sinhala') return 'Sinhala';
    if (medium === 'tamil') return 'Tamil';
    return 'English';
  }

  private normalizeOutputMedium(value: unknown): 'Sinhala' | 'English' | 'Tamil' | 'Singlish' {
    const medium = String(value ?? 'English').trim().toLowerCase();
    if (medium === 'sinhala') return 'Sinhala';
    if (medium === 'tamil') return 'Tamil';
    if (medium === 'singlish') return 'Singlish';
    return 'English';
  }
}
