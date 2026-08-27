import { Module } from '@nestjs/common';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { CatalogImportController } from './catalog-import.controller';
import { CatalogImportService } from './catalog-import.service';
import { EthaksalawaMathematicsImporterService } from './ethaksalawa-mathematics-importer.service';
import { EthaksalawaMathematicsParserService } from './ethaksalawa-mathematics-parser.service';

@Module({
  controllers: [CatalogImportController],
  providers: [
    CatalogImportService,
    EthaksalawaMathematicsParserService,
    EthaksalawaMathematicsImporterService,
    FirebaseAdminService,
  ],
  exports: [
    CatalogImportService,
    EthaksalawaMathematicsImporterService,
    EthaksalawaMathematicsParserService,
    FirebaseAdminService,
  ],
})
export class CatalogImportModule {}
