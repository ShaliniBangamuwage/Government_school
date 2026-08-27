import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { GroqSimulatorProviderService } from './providers/groq-simulator-provider.service';

const requirementsSchema = z.object({
  title: z.string().min(1).max(120).default('Interactive simulator'),
  learningGoal: z.string().min(1).max(300).default('Explore the concept interactively.'),
  acceptanceCriteria: z.array(z.string().min(1).max(200)).default([]),
  requiredVisualElements: z.array(z.string().min(1).max(200)).default([]),
  requiredControls: z.array(z.string().min(1).max(200)).default([]),
  requiredCalculations: z.array(z.string().min(1).max(200)).default([]),
  requiredInteractions: z.array(z.string().min(1).max(200)).default([]),
  requiredSpecialCases: z.array(z.string().min(1).max(200)).default([]),
  requiredButtons: z.array(z.string().min(1).max(200)).default([]),
  visualStyle: z.string().min(1).max(200).default('Responsive classroom visual design.'),
}).transform((value) => ({
  ...value,
  requiredVisuals: value.requiredVisualElements,
  themeRequirements: value.visualStyle ? [value.visualStyle] : [],
}));

@Injectable()
export class SimulatorRequirementsExtractorService {
  constructor(private readonly ai: GroqSimulatorProviderService) {}

  async extractRequirements(prompt: string) {
    const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
    const request = `
You are extracting simulator requirements from a teacher prompt.
Return only valid JSON with this exact schema:
{
  "title": "string",
  "learningGoal": "string",
  "acceptanceCriteria": ["string"],
  "requiredVisualElements": ["string"],
  "requiredControls": ["string"],
  "requiredCalculations": ["string"],
  "requiredInteractions": ["string"],
  "requiredSpecialCases": ["string"],
  "requiredButtons": ["string"],
  "visualStyle": "string"
}

Teacher prompt:
${prompt}
`;

    const result = await this.ai.generate(request, model, []);
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return requirementsSchema.parse(parsed);
  }
}
