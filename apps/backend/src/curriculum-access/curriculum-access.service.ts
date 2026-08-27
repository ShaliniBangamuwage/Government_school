import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';

type CurriculumOfferingRecord = {
  id?: string;
  subjectId?: string;
  grade?: number;
  medium?: string;
  stream?: string;
  accessEnabled?: boolean;
  reviewStatus?: string;
  sourceUrl?: string;
  officialName?: string;
  canonicalSubjectKey?: string;
  [key: string]: unknown;
};

@Injectable()
export class CurriculumAccessService {
  private readonly logger = new Logger(CurriculumAccessService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private getDb() {
    return this.firebaseAdminService.getFirestore();
  }

  private normalizeMedium(value?: string): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) return 'English';
    const lower = normalized.toLowerCase();
    if (lower === 'sinhala') return 'Sinhala';
    if (lower === 'tamil') return 'Tamil';
    return 'English';
  }

  private isSameMedium(value: unknown, expected: string | undefined): boolean {
    if (!expected) return true;
    return this.normalizeMedium(String(value ?? '')) === this.normalizeMedium(expected);
  }

  private readonly catalogPath = path.resolve(process.cwd(), 'data', 'sri-lanka-curriculum-catalog.json');

  async listAdminAccess(filters: { grade?: number; medium?: string; subjectId?: string }) {
    const snapshot = await this.getDb().collection('curriculumOfferings').get();

    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((item: CurriculumOfferingRecord) => {
        if (filters.grade !== undefined && Number(item.grade) !== Number(filters.grade)) return false;
        if (filters.medium && !this.isSameMedium(item.medium, filters.medium)) return false;
        if (filters.subjectId && String(item.subjectId ?? '') !== String(filters.subjectId)) return false;
        return true;
      })
      .sort((a: CurriculumOfferingRecord, b: CurriculumOfferingRecord) => {
        const subjectCompare = String(a.subjectId ?? '').localeCompare(String(b.subjectId ?? ''));
        if (subjectCompare !== 0) return subjectCompare;
        return Number(a.grade ?? 0) - Number(b.grade ?? 0);
      });

    return { items, total: items.length };
  }

  async updateOfferingAccess(offeringId: string, update: { accessEnabled?: boolean; updatedBy?: string; medium?: string; stream?: string; sourceUrl?: string }) {
    const ref = this.getDb().collection('curriculumOfferings').doc(offeringId);
    const current = await ref.get();

    if (!current.exists) {
      throw new Error(`Curriculum offering ${offeringId} not found`);
    }

    const payload: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: update.updatedBy ?? 'system',
    };

    if (typeof update.accessEnabled === 'boolean') payload.accessEnabled = update.accessEnabled;
    if (update.medium) payload.medium = this.normalizeMedium(update.medium);
    if (update.stream) payload.stream = update.stream;
    if (update.sourceUrl) payload.sourceUrl = update.sourceUrl;

    await ref.update(payload);
    return { id: offeringId, ...payload };
  }

  async bulkUpdateAccess(updates: Array<{ id: string; accessEnabled?: boolean; medium?: string; stream?: string; sourceUrl?: string }>, actorUid: string) {
    const results: unknown[] = [];

    for (const update of updates) {
      const result = await this.updateOfferingAccess(update.id, {
        accessEnabled: update.accessEnabled,
        updatedBy: actorUid,
        medium: update.medium,
        stream: update.stream,
        sourceUrl: update.sourceUrl,
      });
      results.push(result);
    }

    return { updated: results.length, results };
  }

  async listStudentAvailableOfferings(filters: { grade: number; medium: string; stream?: string }) {
    const snapshot = await this.getDb().collection('curriculumOfferings').get();

    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((item: CurriculumOfferingRecord) => {
        if (Number(item.grade) !== Number(filters.grade)) return false;
        if (!this.isSameMedium(item.medium, filters.medium)) return false;
        if (filters.stream && String(item.stream ?? 'Common') !== String(filters.stream)) return false;
        if (item.accessEnabled !== true) return false;
        if (item.reviewStatus && item.reviewStatus !== 'approved') return false;
        return true;
      })
      .sort((a: CurriculumOfferingRecord, b: CurriculumOfferingRecord) => String(a.subjectId ?? '').localeCompare(String(b.subjectId ?? '')));

    return { items, total: items.length };
  }

  async syncCatalogFromJson(actorUid: string) {
    if (!fs.existsSync(this.catalogPath)) {
      throw new Error(`Catalog file not found at ${this.catalogPath}`);
    }

    const catalog = JSON.parse(fs.readFileSync(this.catalogPath, 'utf8')) as {
      subjects?: Array<{ id: string; canonicalName?: string; normalizedKey?: string; officialSourceUrls?: string[]; names?: Record<string, string> }>;
      offerings?: Array<{
        id: string;
        subjectId: string;
        grade: number;
        medium: string;
        stream?: string;
        officialName?: string;
        sourceUrl?: string;
        source?: string;
        canonicalSubjectKey?: string;
        accessEnabled?: boolean;
        confidence?: 'verified' | 'review-needed' | 'uncertain';
        reviewStatus?: 'approved' | 'needs-review' | 'rejected';
      }>;
    };

    const subjects = Array.isArray(catalog.subjects) ? catalog.subjects : [];
    const offerings = Array.isArray(catalog.offerings) ? catalog.offerings : [];

    const batch = this.getDb().batch();

    for (const subject of subjects) {
      const ref = this.getDb().collection('subjects').doc(subject.id);
      batch.set(ref, {
        id: subject.id,
        canonicalName: subject.canonicalName ?? subject.id,
        normalizedKey: subject.normalizedKey ?? subject.id,
        names: subject.names ?? {},
        officialSourceUrls: subject.officialSourceUrls ?? [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    for (const offering of offerings) {
      const normalizedMedium = this.normalizeMedium(offering.medium);
      const stream = offering.stream ?? 'Common';
      const ref = this.getDb().collection('curriculumOfferings').doc(offering.id);
      batch.set(ref, {
        id: offering.id,
        subjectId: offering.subjectId,
        canonicalSubjectKey: offering.canonicalSubjectKey ?? offering.subjectId,
        officialName: offering.officialName ?? offering.subjectId,
        grade: Number(offering.grade),
        medium: normalizedMedium,
        stream,
        source: offering.source ?? 'official',
        sourceUrl: offering.sourceUrl ?? '',
        accessEnabled: offering.accessEnabled ?? true,
        confidence: offering.confidence ?? 'verified',
        reviewStatus: offering.reviewStatus ?? 'approved',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: actorUid,
      }, { merge: true });
    }

    await batch.commit();

    const runRef = this.getDb().collection('catalogImportRuns').doc();
    await runRef.set({
      id: runRef.id,
      status: 'success',
      totalSubjects: subjects.length,
      totalOfferings: offerings.length,
      actorUid,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      subjects: subjects.length,
      offerings: offerings.length,
      runId: runRef.id,
    };
  }
}
