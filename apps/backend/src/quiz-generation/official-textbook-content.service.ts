import { BadRequestException, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';

export type OfficialLessonContent = {
  available: boolean;
  textbookId: string;
  lessonId: string;
  lessonTitle: string;
  pageStart: number;
  pageEnd: number;
  sourceText: string;
  sourceExcerpt: string;
  contentHash: string;
  sourceDomain: string;
  message?: string;
};

@Injectable()
export class OfficialTextbookContentService {
  private firestore(): admin.firestore.Firestore | null {
    if (!admin.apps.length) {
      return null;
    }
    return admin.firestore();
  }

  private normalizeText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/\s+/g, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
  }

  private isMoodleOrPhpErrorHtml(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('<html') || lower.includes('moodle') || lower.includes('php') || lower.includes('fatal error') || lower.includes('warning:') || lower.includes('error occurred');
  }

  private async resolveTextbookRecord(textbookId?: string, grade?: number, medium?: string) {
    const firestore = this.firestore();
    if (!firestore) {
      return null;
    }

    if (textbookId && textbookId !== 'unknown' && textbookId !== 'missing') {
      try {
        const doc = await firestore.collection('mathematicsTextbooks').doc(textbookId).get();
        if (doc.exists) {
          return doc.data();
        }
      } catch {
        return null;
      }
    }

    if (grade !== undefined && medium) {
      try {
        const snapshot = await firestore
          .collection('mathematicsTextbooks')
          .where('grade', '==', Number(grade))
          .where('medium', '==', String(medium))
          .limit(1)
          .get();

        if (!snapshot.empty) {
          return snapshot.docs[0].data();
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  async resolveLessonContent(input: { textbookId?: string; lessonId?: string; lessonTitle?: string; grade?: number; medium?: string }): Promise<OfficialLessonContent> {
    const textbookId = String(input.textbookId ?? '');
    const lessonId = String(input.lessonId ?? '');
    const lessonTitle = String(input.lessonTitle ?? 'Mathematics lesson');
    const grade = Number(input.grade ?? 0);
    const medium = String(input.medium ?? '');

    if (!textbookId && !grade) {
      return {
        available: false,
        textbookId: 'unknown',
        lessonId: lessonId || 'unknown',
        lessonTitle,
        pageStart: 1,
        pageEnd: 1,
        sourceText: '',
        sourceExcerpt: '',
        contentHash: '',
        sourceDomain: 'official',
        message: 'Official textbook content is currently unavailable. Quiz generation cannot continue until the source is verified.',
      };
    }

    const textbook = await this.resolveTextbookRecord(textbookId || undefined, grade || undefined, medium || undefined);
    if (!textbook) {
      return {
        available: false,
        textbookId: textbookId || 'unknown',
        lessonId: lessonId || 'unknown',
        lessonTitle,
        pageStart: 1,
        pageEnd: 1,
        sourceText: '',
        sourceExcerpt: '',
        contentHash: '',
        sourceDomain: 'official',
        message: 'Official textbook content is currently unavailable. Quiz generation cannot continue until the source is verified.',
      };
    }

    const resolvedUrl = String(textbook.officialResourceUrl ?? textbook.officialCourseUrl ?? textbook.sourceUrl ?? '');
    const recordText = this.normalizeText(textbook.sourceText ?? textbook.lessonText ?? textbook.chapterText ?? textbook.summary ?? '');

    if (!recordText) {
      return {
        available: false,
        textbookId: textbookId || String(textbook.id ?? 'unknown'),
        lessonId: lessonId || String(textbook.lessonId ?? 'unknown'),
        lessonTitle: lessonTitle || String(textbook.chapterTitle ?? 'Mathematics lesson'),
        pageStart: Number(textbook.pageStart ?? 1),
        pageEnd: Number(textbook.pageEnd ?? 1),
        sourceText: '',
        sourceExcerpt: '',
        contentHash: '',
        sourceDomain: String(textbook.sourceDomain ?? 'e-thaksalawa.moe.gov.lk'),
        message: 'Official textbook content is currently unavailable. Quiz generation cannot continue until the source is verified.',
      };
    }

    if (!resolvedUrl && this.isMoodleOrPhpErrorHtml(recordText)) {
      throw new BadRequestException('Official textbook content is currently unavailable. Quiz generation cannot continue until the source is verified.');
    }

    const sourceText = recordText.length > 12000 ? recordText.slice(0, 12000) : recordText;
    const sourceExcerpt = sourceText.slice(0, 400);
    const contentHash = createHash('sha256').update(sourceText).digest('hex');

    const resolvedHostname = (() => {
      if (resolvedUrl) {
        try {
          return new URL(resolvedUrl).hostname;
        } catch {
          return 'e-thaksalawa.moe.gov.lk';
        }
      }
      return 'e-thaksalawa.moe.gov.lk';
    })();

    return {
      available: true,
      textbookId: textbookId || String(textbook.id ?? 'unknown'),
      lessonId: lessonId || String(textbook.lessonId ?? 'unknown'),
      lessonTitle: lessonTitle || String(textbook.chapterTitle ?? 'Mathematics lesson'),
      pageStart: Number(textbook.pageStart ?? 1),
      pageEnd: Number(textbook.pageEnd ?? 1),
      sourceText,
      sourceExcerpt,
      contentHash,
      sourceDomain: String(textbook.sourceDomain ?? resolvedHostname),
    };
  }
}
