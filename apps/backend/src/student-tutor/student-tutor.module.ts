import { Module } from '@nestjs/common';
import { QuizGenerationModule } from '../quiz-generation/quiz-generation.module';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { StudentTutorController } from './student-tutor.controller';
import { StudentTutorService } from './student-tutor.service';
import { TavusTutorService } from './tavus-tutor.service';

@Module({
  imports: [QuizGenerationModule],
  controllers: [StudentTutorController],
  providers: [StudentTutorService, TavusTutorService, FirebaseAdminService],
})
export class StudentTutorModule {}
