import { Module } from '@nestjs/common';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { MathematicsCatalogController } from './mathematics-catalog.controller';
import { MathematicsCatalogService } from './mathematics-catalog.service';
import { MathematicsCourseParserService } from './mathematics-course-parser.service';

@Module({
  controllers: [MathematicsCatalogController],
  providers: [FirebaseAdminService, MathematicsCatalogService, MathematicsCourseParserService],
  exports: [MathematicsCatalogService, MathematicsCourseParserService],
})
export class MathematicsCatalogModule {}
