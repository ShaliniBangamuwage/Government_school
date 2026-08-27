import { Module } from '@nestjs/common';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { TextbookDownloadService } from './textbook-download.service';
import { TextbookVerificationService } from './textbook-verification.service';
import { TextbooksController } from './textbooks.controller';
import { TextbooksService } from './textbooks.service';

@Module({
  controllers: [TextbooksController],
  providers: [
    TextbooksService,
    TextbookDownloadService,
    TextbookVerificationService,
    FirebaseAdminService,
  ],
  exports: [TextbooksService, TextbookDownloadService, TextbookVerificationService],
})
export class TextbooksModule {}
