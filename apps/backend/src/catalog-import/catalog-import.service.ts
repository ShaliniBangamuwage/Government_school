import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CatalogImportService {
  private readonly logger = new Logger(CatalogImportService.name);

  private readonly catalogPath = path.resolve(process.cwd(), 'data', 'sri-lanka-curriculum-catalog.json');
  private readonly mathematicsCatalogPath = path.resolve(process.cwd(), 'data', 'mathematics-course-catalog.json');

  async loadCatalog() {
    if (!fs.existsSync(this.catalogPath)) {
      return { subjects: [], offerings: [], importedAt: null };
    }

    const raw = fs.readFileSync(this.catalogPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed;
  }

  async loadMathematicsCatalog() {
    if (!fs.existsSync(this.mathematicsCatalogPath)) {
      return { entries: [], importedAt: null };
    }

    return JSON.parse(fs.readFileSync(this.mathematicsCatalogPath, 'utf8'));
  }

  async ensureCatalogLoaded() {
    const catalog = await this.loadCatalog();
    this.logger.log(`Loaded catalog snapshot with ${catalog.subjects?.length ?? 0} subjects and ${catalog.offerings?.length ?? 0} offerings.`);
    return catalog;
  }
}
