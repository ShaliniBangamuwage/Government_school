import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import type { Textbook } from '@edunexa/shared-types';
import { EthaksalawaMathematicsParserService, type ParsedMathematicsCatalogEntry } from './ethaksalawa-mathematics-parser.service';

@Injectable()
export class EthaksalawaMathematicsImporterService {
  private readonly logger = new Logger(EthaksalawaMathematicsImporterService.name);

  constructor(private readonly parser: EthaksalawaMathematicsParserService) {}

  private firestore() {
    return admin.firestore();
  }

  private get defaultCatalogPath() {
    return path.resolve(process.cwd(), 'data', 'mathematics-course-catalog.json');
  }

  loadCatalog(filePath?: string): unknown {
    const target = filePath ? path.resolve(filePath) : this.defaultCatalogPath;
    if (!fs.existsSync(target)) {
      throw new NotFoundException(`Mathematics catalog not found at ${target}.`);
    }

    return JSON.parse(fs.readFileSync(target, 'utf8'));
  }

  buildTextbookRecord(entry: ParsedMathematicsCatalogEntry): Partial<Textbook> {
    const subjectId = 'mathematics';
    const title = entry.title.trim();

    return {
      id: entry.id,
      sourceId: entry.id,
      subjectId,
      subjectSlug: subjectId,
      title,
      grade: entry.grade,
      medium: entry.medium,
      bookType: 'textbook',
      officialPageUrl: entry.officialPageUrl ?? undefined,
      officialFileUrl: entry.officialPdfUrl ?? undefined,
      officialPdfUrl: entry.officialPdfUrl ?? null,
      sourceDomain: entry.sourceDomain,
      sourceAuthority: 'Educational Publications Department, Sri Lanka',
      hostingMode: 'official-link',
      hostingPermission: entry.officialPdfUrl ? 'confirmed' : 'pending',
      verificationStatus: entry.verificationStatus,
      isActive: entry.isActive,
      verified: entry.verificationStatus === 'verified',
      lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastVerifiedAt: entry.verificationStatus === 'verified' ? admin.firestore.FieldValue.serverTimestamp() : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      downloadCount: 0,
    };
  }

  async importCatalog(filePath?: string): Promise<{ imported: number; updated: number; skipped: number; total: number; source: string; }> {
    const source = filePath ? path.resolve(filePath) : this.defaultCatalogPath;
    const catalog = this.loadCatalog(source);
    const entries = this.parser.parseCatalog(catalog);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const entry of entries) {
      const record = this.buildTextbookRecord(entry);
      const ref = this.firestore().collection('textbooks').doc(String(record.id));
      const existing = await ref.get();

      if (!existing.exists) {
        await ref.set(record, { merge: true });
        imported += 1;
        continue;
      }

      if (existing.data()?.verificationStatus === record.verificationStatus && existing.data()?.officialFileUrl === record.officialFileUrl) {
        skipped += 1;
        continue;
      }

      await ref.set(record, { merge: true });
      updated += 1;
    }

    this.logger.log(`Imported ${imported} new mathematics textbooks, updated ${updated}, skipped ${skipped}.`);
    return {
      imported,
      updated,
      skipped,
      total: entries.length,
      source,
    };
  }
}
