import { Module } from '@nestjs/common';
import { ConfiguredAiProviderService } from '../quiz-generation/providers/configured-ai-provider.service';
import { MathematicsTextbookController } from './mathematics-textbook.controller';
import { MathematicsTextbookService } from './mathematics-textbook.service';

@Module({
  controllers: [MathematicsTextbookController],
  providers: [ConfiguredAiProviderService, MathematicsTextbookService],
  exports: [MathematicsTextbookService],
})
export class MathematicsTextbookModule {}
