import { Module } from '@nestjs/common';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { MathematicsCatalogModule } from '../mathematics-catalog/mathematics-catalog.module';
import { QuizGenerationController } from './quiz-generation.controller';
import { QuizGenerationService } from './quiz-generation.service';
import { DuplicateQuestionService } from './duplicate-question.service';
import { QuestionValidatorService } from './question-validator.service';
import { SourceGroundingService } from './source-grounding.service';
import { ConfiguredAiProviderService } from './providers/configured-ai-provider.service';

@Module({
  imports: [MathematicsCatalogModule],
  controllers: [QuizGenerationController],
  providers: [
    QuizGenerationService,
    SourceGroundingService,
    QuestionValidatorService,
    DuplicateQuestionService,
    ConfiguredAiProviderService,
    FirebaseAdminService,
  ],
  exports: [QuizGenerationService],
})
export class QuizGenerationModule {}
