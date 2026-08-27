import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { Textbook, TextbookCoverageSummary, TextbookFilters, TextbookMedium, TextbookStream, TextbookType, TextbookUnit, TextbookVerificationStatus } from '@edunexa/shared-types';
import { TextbookDownloadService } from './textbook-download.service';

interface TextbookRecord extends Textbook {
  id: string;
}

@Injectable()
export class TextbooksService {
  constructor(private readonly textbookDownloadService: TextbookDownloadService) {}

  private firestore() {
    return admin.firestore();
  }

  private normalizeSubjectSlug(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'subject';
  }

  private isValidStreamForGrade(grade: number, stream?: TextbookStream): boolean {
    if (grade < 12) {
      return stream === undefined || stream === null || stream === 'common';
    }

    return !!stream && ['biological-science', 'physical-science', 'commerce', 'arts', 'technology', 'common', 'vocational'].includes(stream);
  }

  private timestampToMs(value: unknown): number {
    if (!value) {
      return 0;
    }

    if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private toTextbook(doc: FirebaseFirestore.DocumentSnapshot): Textbook {
    const data = (doc.data() ?? {}) as Partial<TextbookRecord> & { archived?: boolean; verified?: boolean; subjectId?: string; subjectSlug?: string; };
    return {
      id: doc.id,
      sourceId: data.sourceId,
      subjectId: data.subjectId,
      title: String(data.title ?? 'Untitled textbook'),
      subjectSlug: String(data.subjectSlug ?? 'general'),
      grade: Number(data.grade ?? 6),
      medium: (data.medium ?? 'English') as TextbookMedium,
      stream: data.stream ?? undefined,
      bookType: (data.bookType ?? 'textbook') as TextbookType,
      part: data.part,
      syllabusYear: data.syllabusYear,
      editionYear: data.editionYear,
      officialPageUrl: data.officialPageUrl,
      officialFileUrl: data.officialFileUrl,
      sourceDomain: data.sourceDomain,
      hostingMode: (data.hostingMode ?? 'official-link') as Textbook['hostingMode'],
      hostingPermission: (data.hostingPermission ?? 'link-only') as Textbook['hostingPermission'],
      verificationStatus: (data.verificationStatus ?? (data.verified === true ? 'verified' : 'pending')) as TextbookVerificationStatus,
      isActive: data.isActive ?? true,
      archived: data.archived,
      verified: data.verified,
      lastVerifiedAt: data.lastVerifiedAt,
      lastCheckedAt: data.lastCheckedAt,
      fileSizeBytes: data.fileSizeBytes,
      coverImageUrl: data.coverImageUrl,
      downloadCount: data.downloadCount ?? 0,
      assignedTeacherIds: data.assignedTeacherIds ?? [],
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Textbook & { archived?: boolean; verified?: boolean; };
  }

  private async resolveSourceId(sourceId?: string): Promise<string | undefined> {
    if (!sourceId) {
      return undefined;
    }

    return String(sourceId).trim();
  }

  async listTextbooks(filters: Partial<TextbookFilters> = {}): Promise<Textbook[]> {
    const snapshot = await this.firestore().collection('textbooks').get();
    const textbooks = snapshot.docs.map((doc) => this.toTextbook(doc));

    const visible = textbooks.filter((book) => {
      const legacyVerified = (book as Textbook & { verified?: boolean }).verified === true;
      const canonicalVisible = book.isActive !== false && (book as Textbook & { archived?: boolean }).archived !== true && (book.verificationStatus === 'verified' || legacyVerified);
      if (!canonicalVisible) {
        return false;
      }

      if (filters.subjectId && book.subjectId !== filters.subjectId) {
        return false;
      }

      if (filters.grade !== undefined && Number(book.grade) !== Number(filters.grade)) {
        return false;
      }

      if (filters.medium && filters.medium !== 'all' && book.medium !== filters.medium) {
        return false;
      }

      if (filters.subjectSlug && this.normalizeSubjectSlug(book.subjectSlug ?? '') !== this.normalizeSubjectSlug(filters.subjectSlug)) {
        return false;
      }

      if (filters.stream && filters.stream !== 'all' && (book.stream ?? '') !== filters.stream) {
        return false;
      }

      if (filters.bookType && filters.bookType !== 'all' && book.bookType !== filters.bookType) {
        return false;
      }

      if (filters.verificationStatus && filters.verificationStatus !== 'all' && book.verificationStatus !== filters.verificationStatus) {
        return false;
      }

      if (filters.search) {
        const value = filters.search.trim().toLowerCase();
        const searchable = `${book.title ?? ''} ${book.subjectSlug ?? ''} ${book.medium ?? ''}`.toLowerCase();
        if (!searchable.includes(value)) {
          return false;
        }
      }

      return true;
    });

    return visible.sort((a, b) => this.timestampToMs((b as Textbook & { updatedAt?: unknown }).updatedAt) - this.timestampToMs((a as Textbook & { updatedAt?: unknown }).updatedAt)).slice(0, filters.limit ?? 200);
  }

  async getTextbookById(id: string): Promise<Textbook> {
    const doc = await this.firestore().collection('textbooks').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Textbook not found.');
    }
    return this.toTextbook(doc);
  }

  async getCoverageSummary(): Promise<TextbookCoverageSummary> {
    const snapshot = await this.firestore().collection('textbooks').get();
    const textbooks = snapshot.docs.map((doc) => this.toTextbook(doc));

    const summary: TextbookCoverageSummary = {
      totalTextbooks: textbooks.length,
      verifiedTextbooks: textbooks.filter((book) => book.verificationStatus === 'verified').length,
      pendingTextbooks: textbooks.filter((book) => book.verificationStatus === 'pending').length,
      brokenTextbooks: textbooks.filter((book) => book.verificationStatus === 'broken').length,
      byGrade: {},
      byMedium: { Sinhala: 0, Tamil: 0, English: 0 },
      byStream: {},
    };

    for (const textbook of textbooks) {
      summary.byGrade[String(textbook.grade)] = (summary.byGrade[String(textbook.grade)] ?? 0) + 1;
      summary.byMedium[textbook.medium] = (summary.byMedium[textbook.medium] ?? 0) + 1;
      if (textbook.stream) {
        summary.byStream[textbook.stream] = (summary.byStream[textbook.stream] ?? 0) + 1;
      }
    }

    return summary;
  }

  async createTextbook(actorUid: string, payload: Partial<Textbook>): Promise<Textbook> {
    const title = String(payload.title ?? '').trim();
    const grade = Number(payload.grade ?? 6);
    const medium = (payload.medium ?? 'English') as TextbookMedium;
    const stream = (payload.stream ?? undefined) as TextbookStream | undefined;

    if (!Number.isInteger(grade) || grade < 6 || grade > 13) {
      throw new BadRequestException('Grades must be integers between 6 and 13.');
    }

    if (!['Sinhala', 'Tamil', 'English'].includes(medium)) {
      throw new BadRequestException('Invalid textbook medium.');
    }

    if (!this.isValidStreamForGrade(grade, stream)) {
      throw new BadRequestException('The selected stream is invalid for the grade.');
    }

    const sourceId = await this.resolveSourceId(payload.sourceId);
    const subjectSlug = this.normalizeSubjectSlug(String(payload.subjectSlug ?? 'general'));
    const subjectId = payload.subjectId?.trim() || undefined;
    const officialPageUrl = payload.officialPageUrl?.trim();
    const officialFileUrl = payload.officialFileUrl?.trim();

    const book: Textbook = {
      id: this.firestore().collection('textbooks').doc().id,
      sourceId,
      subjectId,
      title,
      subjectSlug,
      grade,
      medium,
      stream,
      bookType: payload.bookType ?? 'textbook',
      part: payload.part,
      syllabusYear: payload.syllabusYear,
      editionYear: payload.editionYear,
      officialPageUrl,
      officialFileUrl,
      sourceDomain: payload.sourceDomain,
      hostingMode: payload.hostingMode ?? 'official-link',
      hostingPermission: payload.hostingPermission ?? 'link-only',
      verificationStatus: payload.verificationStatus ?? 'pending',
      isActive: payload.isActive ?? true,
      lastVerifiedAt: payload.lastVerifiedAt,
      lastCheckedAt: payload.lastCheckedAt,
      fileSizeBytes: payload.fileSizeBytes,
      coverImageUrl: payload.coverImageUrl,
      downloadCount: 0,
      assignedTeacherIds: payload.assignedTeacherIds ?? [],
      createdBy: actorUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await this.firestore().collection('textbooks').doc(book.id).set(book, { merge: true });
    return book;
  }

  async updateTextbook(actorUid: string, id: string, payload: Partial<Textbook>): Promise<Textbook> {
    const docRef = this.firestore().collection('textbooks').doc(id);
    const current = await docRef.get();

    if (!current.exists) {
      throw new NotFoundException('Textbook not found.');
    }

    const existing = this.toTextbook(current);
    const next: Textbook = {
      ...existing,
      ...payload,
      subjectId: payload.subjectId?.trim() || existing.subjectId,
      title: payload.title?.trim() || existing.title,
      subjectSlug: this.normalizeSubjectSlug(String(payload.subjectSlug ?? existing.subjectSlug)),
      grade: payload.grade ?? existing.grade,
      medium: (payload.medium ?? existing.medium) as TextbookMedium,
      stream: payload.stream ?? existing.stream,
      hostingMode: payload.hostingMode ?? existing.hostingMode,
      hostingPermission: payload.hostingPermission ?? existing.hostingPermission,
      verificationStatus: payload.verificationStatus ?? existing.verificationStatus,
      isActive: payload.isActive ?? existing.isActive,
      createdBy: existing.createdBy ?? actorUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(next, { merge: true });
    return next;
  }

  async updateVerificationStatus(actorUid: string, id: string, body: { verificationStatus?: string; lastCheckedAt?: string }): Promise<Textbook> {
    const docRef = this.firestore().collection('textbooks').doc(id);
    const current = await docRef.get();
    if (!current.exists) {
      throw new NotFoundException('Textbook not found.');
    }

    const existing = this.toTextbook(current);
    const verificationStatus = (body.verificationStatus ?? existing.verificationStatus) as TextbookVerificationStatus;
    const next: Textbook = {
      ...existing,
      verificationStatus,
      isActive: verificationStatus === 'verified',
      lastVerifiedAt: verificationStatus === 'verified' ? admin.firestore.FieldValue.serverTimestamp() : existing.lastVerifiedAt,
      lastCheckedAt: body.lastCheckedAt ? new Date(body.lastCheckedAt) : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(next, { merge: true });
    return next;
  }

  async checkOfficialLink(id: string) {
    const textbook = await this.getTextbookById(id);
    const url = await this.textbookDownloadService.validateOfficialUrl(textbook.officialFileUrl);
    const isBroken = !url;

    await this.firestore().collection('textbooks').doc(id).update({
      verificationStatus: isBroken ? 'broken' : 'verified',
      lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: !isBroken,
    });

    return { textbookId: id, valid: !isBroken, url };
  }

  async checkAllLinks() {
    const snapshot = await this.firestore().collection('textbooks').where('hostingMode', '==', 'official-link').get();
    const results = await Promise.all(snapshot.docs.map((doc) => this.checkOfficialLink(doc.id)));
    return { checked: results.length, results };
  }

  async getDownloadRedirectUrl(textbook: Textbook): Promise<string> {
    if (!textbook.isActive || textbook.verificationStatus !== 'verified') {
      throw new BadRequestException('The textbook is not verified and cannot be downloaded.');
    }

    if (textbook.hostingMode === 'official-link') {
      const validatedUrl = await this.textbookDownloadService.validateOfficialUrl(textbook.officialFileUrl);
      if (!validatedUrl) {
        throw new BadRequestException('The official textbook link is not allowed or is broken.');
      }
      return validatedUrl;
    }

    if (textbook.hostingPermission !== 'confirmed' || !textbook.officialFileUrl) {
      throw new BadRequestException('This textbook is not approved for storage-backed downloads.');
    }

    return textbook.officialFileUrl;
  }

  async incrementDownloadCount(id: string, actorUid?: string) {
    const docRef = this.firestore().collection('textbooks').doc(id);
    const current = await docRef.get();
    if (!current.exists) {
      throw new NotFoundException('Textbook not found.');
    }

    await docRef.update({
      downloadCount: admin.firestore.FieldValue.increment(1),
      lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await this.firestore().collection('downloadEvents').doc().set({
      textbookId: id,
      actorUid: actorUid ?? 'anonymous',
      downloadedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async listUnits(textbookId: string): Promise<TextbookUnit[]> {
    const snapshot = await this.firestore().collection('textbookUnits').where('textbookId', '==', textbookId).get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      textbookId: String(doc.data().textbookId ?? textbookId),
      title: String(doc.data().title ?? 'Untitled unit'),
      summary: doc.data().summary,
      unitNumber: doc.data().unitNumber,
      sourcePageUrl: doc.data().sourcePageUrl,
      sourceText: doc.data().sourceText,
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt,
    }));
  }

  async createUnit(actorUid: string, textbookId: string, payload: Partial<TextbookUnit>): Promise<TextbookUnit> {
    const ref = this.firestore().collection('textbookUnits').doc();
    const unit: TextbookUnit = {
      id: ref.id,
      textbookId,
      title: String(payload.title ?? 'Untitled unit'),
      summary: payload.summary,
      unitNumber: payload.unitNumber,
      sourcePageUrl: payload.sourcePageUrl,
      sourceText: payload.sourceText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set({ ...unit, createdBy: actorUid });
    return unit;
  }

  async updateUnit(actorUid: string, unitId: string, payload: Partial<TextbookUnit>): Promise<TextbookUnit> {
    const ref = this.firestore().collection('textbookUnits').doc(unitId);
    const current = await ref.get();
    if (!current.exists) {
      throw new NotFoundException('Textbook unit not found.');
    }

    const next: TextbookUnit = {
      ...(current.data() as TextbookUnit),
      ...payload,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(next, { merge: true });
    return next;
  }
}
