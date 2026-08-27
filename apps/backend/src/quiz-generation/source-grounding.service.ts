import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class SourceGroundingService {
  private firestore(): admin.firestore.Firestore | null {
    if (!admin.apps.length) {
      return null;
    }
    return admin.firestore();
  }

  async loadApprovedSourceContext(unitId: string, more?: { grade?: number; medium?: string; textbookId?: string; lessonId?: string }) {
    const fallback: Array<{ title: string; pageUrl: string; sourceText: string; lessonId?: string }> = [];

    const firestore = this.firestore();
    if (!firestore) {
      return { approvedSources: fallback, unitId };
    }

    if (unitId && unitId !== 'unknown') {
      const parentRef = await firestore.collection('textbookUnits').doc(unitId).get();
      const row = parentRef.data() ?? {};
      if (row.sourcePageUrl || row.sourceText) {
        fallback.push({
          title: String(row.title ?? 'Source reference'),
          pageUrl: String(row.sourcePageUrl ?? 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=313'),
          sourceText: String(row.sourceText ?? ''),
          lessonId: String(row.lessonId ?? ''),
        });
      }
    }

    if (more?.textbookId) {
      const textbookDoc = await firestore.collection('mathematicsTextbooks').doc(more.textbookId).get();
      const textbook = textbookDoc.data() ?? {};
      if (textbook.officialCourseUrl || textbook.sourceUrl || textbook.sourceText) {
        fallback.push({
          title: String(textbook.title ?? 'Mathematics textbook'),
          pageUrl: String(textbook.officialCourseUrl ?? textbook.sourceUrl ?? 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=313'),
          sourceText: String(textbook.sourceText ?? ''),
          lessonId: String(more.lessonId ?? textbook.lessonId ?? ''),
        });
      }
    }

    const approvedSources = fallback.filter((item) => item.sourceText || item.pageUrl);
    return { approvedSources, unitId };
  }
}
