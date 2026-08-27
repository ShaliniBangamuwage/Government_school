import { Module } from '@nestjs/common';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { GeminiSimulatorProviderService } from './providers/gemini-simulator-provider.service';
import { GroqSimulatorProviderService } from './providers/groq-simulator-provider.service';
import { SimulatorAiProvider } from './providers/simulator-ai-provider.interface';
import { SimulatorCodeValidatorService } from './simulator-code-validator.service';
import { SimulatorGenerationController } from './simulator-generation.controller';
import { SimulatorGenerationService } from './simulator-generation.service';
import { SimulatorRequirementsExtractorService } from './simulator-requirements-extractor.service';
import { SimulatorQualityReviewService } from './simulator-quality-review.service';

export function selectSimulatorAiProvider(providerName: string, groq: SimulatorAiProvider, gemini: SimulatorAiProvider) {
  return providerName.toLowerCase() === 'gemini' ? gemini : groq;
}

@Module({
  imports: [],
  controllers: [SimulatorGenerationController],
  providers: [
    SimulatorGenerationService,
    SimulatorCodeValidatorService,
    SimulatorRequirementsExtractorService,
    SimulatorQualityReviewService,
    GroqSimulatorProviderService,
    GeminiSimulatorProviderService,
    {
      provide: 'SIMULATOR_AI_PROVIDER',
      useFactory: (groq: SimulatorAiProvider, gemini: SimulatorAiProvider) =>
        selectSimulatorAiProvider(process.env.AI_PROVIDER ?? 'groq', groq, gemini),
      inject: [GroqSimulatorProviderService, GeminiSimulatorProviderService],
    },
    FirebaseAdminService,
  ],
  exports: [SimulatorGenerationService],
})
export class SimulatorGenerationModule {}
