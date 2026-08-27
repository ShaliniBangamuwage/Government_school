import { Module } from '@nestjs/common';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { CurriculumAccessController } from './curriculum-access.controller';
import { CurriculumAccessService } from './curriculum-access.service';

@Module({
  controllers: [CurriculumAccessController],
  providers: [CurriculumAccessService, FirebaseAdminService],
  exports: [CurriculumAccessService],
})
export class CurriculumAccessModule {}
