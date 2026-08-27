import { BadRequestException } from '@nestjs/common';
import { SimulatorGenerationService } from './simulator-generation.service';

describe('SimulatorGenerationService', () => {
  it('includes react-is for recharts-based generated simulators', () => {
    const validator = require('./simulator-code-validator.service').SimulatorCodeValidatorService;
    const service = new validator();

    expect(service.sanitizeDependencies({ recharts: 'latest' })).toMatchObject({
      react: 'latest',
      'react-dom': 'latest',
      'react-is': 'latest',
      recharts: 'latest',
    });
  });

  it('throws a BadRequestException when the AI provider fails instead of returning a generic fallback simulator', async () => {
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          id: 'sim-123',
          set: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    const firebaseAdmin = {
      getFirestore: jest.fn().mockReturnValue(firestore),
    } as any;

    const ai = {
      generate: jest.fn().mockRejectedValue(new Error('Invalid API Key')),
    } as any;

    const validator = {
      validate: jest.fn((payload) => payload),
      scanGeneratedFiles: jest.fn(),
      sanitizeDependencies: jest.fn((deps) => ({ react: 'latest', 'react-dom': 'latest', ...(deps ?? {}) })),
    } as any;

    const requirementsExtractor = {
      extractRequirements: jest.fn().mockResolvedValue({
        title: 'Fraction Compare Lab',
        requiredVisuals: ['fraction bar'],
        requiredControls: ['interactive comparison'],
        requiredCalculations: ['fraction comparison logic'],
        requiredInteractions: ['user updates denominator'],
        requiredSpecialCases: ['equal fractions'],
        requiredButtons: ['Reset'],
        themeRequirements: ['clear classroom colors'],
      }),
    } as any;

    const qualityReview = {
      review: jest.fn().mockResolvedValue({ approved: true, missingRequirements: [], reason: 'Requirements met.' }),
    } as any;

    const service = new SimulatorGenerationService(firebaseAdmin, ai, validator, requirementsExtractor, qualityReview);

    await expect(service.generateFromPrompt('teacher-1', {
      prompt: 'Create a fraction simulator with a bar model and compare 1/3 and 2/3',
      title: 'Fraction Compare Lab',
    })).rejects.toThrow(BadRequestException);
    await expect(service.generateFromPrompt('teacher-1', {
      prompt: 'Create a fraction simulator with a bar model and compare 1/3 and 2/3',
      title: 'Fraction Compare Lab',
    })).rejects.toThrow('Invalid API Key');
  });
});
