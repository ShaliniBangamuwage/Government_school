import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CatalogImportService } from './catalog-import.service';
import { EthaksalawaMathematicsImporterService } from './ethaksalawa-mathematics-importer.service';

@Controller('admin/catalog-import')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
export class CatalogImportController {
  constructor(
    private readonly catalogImportService: CatalogImportService,
    private readonly mathematicsImporter: EthaksalawaMathematicsImporterService,
  ) {}

  @Get('mathematics')
  async readMathematicsCatalog() {
    return {
      catalog: await this.catalogImportService.loadMathematicsCatalog(),
    };
  }

  @Post('mathematics')
  async importMathematics(@CurrentUser() _user: { uid: string }, @Body() body: { filePath?: string } = {}) {
    const result = await this.mathematicsImporter.importCatalog(body.filePath);
    return { success: true, result };
  }
}
