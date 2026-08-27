import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { GroqSimulatorProviderService } from './providers/groq-simulator-provider.service';

const qualityReviewSchema = z.object({
  approved: z.boolean(),
  missingRequirements: z.array(z.string().min(1).max(200)).default([]),
  reason: z.string().min(5).max(500),
});

@Injectable()
export class SimulatorQualityReviewService {
  constructor(private readonly ai: GroqSimulatorProviderService) {}

  async review({
    originalPrompt,
    requirements,
    generatedCode,
  }: {
    originalPrompt: string;
    requirements: Record<string, unknown>;
    generatedCode: string;
  }) {
    const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
    const request = `
You are reviewing a generated mathematics simulator.
Decide whether the generated React TypeScript App.tsx satisfies the teacher prompt and extracted requirements.
Return only valid JSON with this exact schema:
{
  "approved": true | false,
  "missingRequirements": ["string"],
  "reason": "string"
}

Original teacher prompt:
${originalPrompt}

Extracted requirements:
${JSON.stringify(requirements, null, 2)}

Generated App.tsx:
${generatedCode}
`;

    const result = await this.ai.generate(request, model, []);
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return qualityReviewSchema.parse(parsed);
  }
}
