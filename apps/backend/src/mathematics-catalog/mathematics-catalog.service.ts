import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { getOfficialCourseUrlForGradeAndMedium, normalizeMathematicsMedium } from './official-course-map';
import { MathematicsApprovalStatus, MathematicsCatalogEntry, MathematicsMedium, MathematicsOffering, MathematicsTextbookChapter } from './mathematics-catalog.types';

@Injectable()
export class MathematicsCatalogService {
  private readonly logger = new Logger(MathematicsCatalogService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private get db(): Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  private normalizeMedium(value?: string): MathematicsMedium {
    return normalizeMathematicsMedium(value ?? 'English');
  }

  getOfficialCourseUrlForGradeAndMedium(grade: number, medium?: string): string {
    return getOfficialCourseUrlForGradeAndMedium(grade, medium);
  }

  private normalizeOfficialSourceUrl(rawUrl?: string | null): string {
    const candidate = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!candidate) {
      return '';
    }

    try {
      const parsed = new URL(candidate);
      const isHttps = parsed.protocol === 'https:';
      const isHostAllowed = parsed.hostname === 'e-thaksalawa.moe.gov.lk';
      const isPathAllowed = parsed.pathname === '/lcms/course/view.php';
      const idParam = parsed.searchParams.get('id');
      const isIdNumeric = idParam !== null && /^\d+$/.test(idParam);

      if (!isHttps || !isHostAllowed || !isPathAllowed || !isIdNumeric) {
        return '';
      }

      return parsed.toString();
    } catch {
      return '';
    }
  }

  private getApprovalStatus(record: Partial<MathematicsTextbookChapter>): MathematicsApprovalStatus {
    const value = String(record.approvalStatus ?? '').trim();
    if (value === 'approved' || value === 'pending' || value === 'rejected') {
      return value;
    }
    return record.verificationStatus === 'verified' ? 'approved' : 'pending';
  }

  async listOfferings(): Promise<MathematicsOffering[]> {
    const snapshot = await this.db.collection('mathematicsOfferings').get();
    return snapshot.docs.map((doc) => ({
      ...(doc.data() as MathematicsOffering),
      id: doc.id,
    }));
  }

  async ensureEnabledMathematicsCatalogRow(grade = 8, medium = 'English'): Promise<MathematicsOffering> {
    const rows = await this.listOfferings();
    const normalizedMedium = this.normalizeMedium(medium) ?? 'English';
    const existing = rows.find((row) => row.subjectId === 'mathematics' && Number(row.grade) === Number(grade) && this.normalizeMedium(row.medium) === normalizedMedium);

    if (existing) {
      if (existing.quizAccessEnabled === false || existing.teacherAccessEnabled === false) {
        await this.upsertOffering({
          ...existing,
          quizAccessEnabled: true,
          teacherAccessEnabled: true,
          studentAccessEnabled: true,
        });
      }
      return { ...existing, quizAccessEnabled: true, teacherAccessEnabled: true, studentAccessEnabled: true };
    }

    const catalogId = `mathematics-${Number(grade)}-${normalizedMedium.toLowerCase()}`;
    const offering: MathematicsOffering = {
      id: catalogId,
      subjectId: 'mathematics',
      subjectName: 'Mathematics',
      grade: Number(grade) as 6 | 7 | 8 | 9 | 10 | 11,
      medium: normalizedMedium,
      studentAccessEnabled: true,
      teacherAccessEnabled: true,
      textbookAccessEnabled: true,
      quizAccessEnabled: true,
      simulatorAccessEnabled: true,
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.upsertOffering(offering);
    await this.upsertTextbook({
      id: `${catalogId}-chapter-1`,
      subjectId: 'mathematics',
      subjectName: 'Mathematics',
      grade: Number(grade) as 6 | 7 | 8 | 9 | 10 | 11,
      medium: normalizedMedium,
      chapterNumber: 1,
      chapterTitle: `Grade ${grade} Mathematics – Chapter 1`,
      title: `Grade ${grade} Mathematics`,
      sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(Number(grade), normalizedMedium),
      officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(Number(grade), normalizedMedium),
      officialResourceUrl: null,
      resolvedPdfUrl: null,
      sourceDomain: 'e-thaksalawa.moe.gov.lk',
      sourceAuthority: 'Ministry of Education',
      resourceType: 'textbook-chapter',
      verificationStatus: 'verified',
      approvalStatus: 'approved',
      accessEnabled: true,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return offering;
  }

  async listCatalogRows(filters: { grade?: number; medium?: string } = {}): Promise<MathematicsOffering[]> {
    const enabledRows = await this.listOfferings();
    const filtered = enabledRows.filter((row) => row.subjectId === 'mathematics' && row.quizAccessEnabled !== false && row.teacherAccessEnabled !== false);

    if (filtered.length === 0) {
      const seeded = await this.ensureEnabledMathematicsCatalogRow(filters.grade ?? 8, filters.medium ?? 'English');
      return [seeded];
    }

    return filtered.filter((row) => {
      const matchesGrade = filters.grade === undefined || Number(row.grade) === Number(filters.grade);
      const matchesMedium = filters.medium === undefined || this.normalizeMedium(row.medium) === this.normalizeMedium(filters.medium);
      return matchesGrade && matchesMedium;
    });
  }

  async seedCatalogLessonsForRow(catalogId: string, grade: number, medium: string): Promise<Array<{ lessonId: string; lessonNumber: number; lessonTitle: string; sourceUrl: string; lessonUrl: string; courseUrl: string; grade: number; medium: MathematicsMedium; subject: 'mathematics'; sourceHash: string; discoveredAt: string }>> {
    const normalizedMedium = this.normalizeMedium(medium);
    const courseUrl = this.getOfficialCourseUrlForGradeAndMedium(grade, normalizedMedium);
    const collection = this.db.collection('mathematicsCourseCatalogs').doc(catalogId).collection('lessons');

    try {
      const response = await fetch(courseUrl, {
        headers: { 'User-Agent': 'EduNexa/1.0 Mathematics Catalog Sync' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return [];
      }

      const html = await response.text();
      const service = new (await import('../quiz-generation/ethaksalawa-lesson-catalog.service')).EthaksalawaLessonCatalogService();
      const rows = service.parseLessonCatalog(html, grade, normalizedMedium)
        .map((lesson, index) => ({
          lessonId: lesson.lessonId,
          lessonNumber: lesson.lessonNumber ?? index + 1,
          lessonTitle: lesson.lessonTitle,
          sourceUrl: lesson.officialSectionUrl || lesson.officialCourseUrl,
          lessonUrl: lesson.officialSectionUrl || lesson.officialCourseUrl,
          courseUrl: lesson.officialCourseUrl,
          grade: lesson.grade,
          medium: lesson.medium,
          subject: 'mathematics' as const,
          sourceHash: lesson.sourceHash,
          discoveredAt: lesson.syncedAt,
        }));

      for (const lesson of rows) {
        await collection.doc(lesson.lessonId).set({
          ...lesson,
          catalogId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      return rows;
    } catch {
      return [];
    }
  }

  async listCatalogLessons(catalogId: string): Promise<Array<{ lessonId: string; lessonNumber: number; lessonTitle: string; sourceUrl: string; lessonUrl: string; courseUrl: string; grade: number; medium: MathematicsMedium; subject: 'mathematics'; sourceHash?: string; discoveredAt?: string }>> {
    const snapshot = await this.db.collection('mathematicsCourseCatalogs').doc(catalogId).collection('lessons').orderBy('lessonNumber').get();

    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => {
        const rawMedium = String(doc.data().medium ?? 'English');
        const sourceUrl = String(doc.data().sourceUrl ?? doc.data().lessonUrl ?? this.getOfficialCourseUrlForGradeAndMedium(Number(doc.data().grade ?? 8), rawMedium));
        return {
          lessonId: String(doc.data().lessonId ?? doc.id),
          lessonNumber: Number(doc.data().lessonNumber ?? 1),
          lessonTitle: String(doc.data().lessonTitle ?? 'Mathematics lesson'),
          sourceUrl,
          lessonUrl: String(doc.data().lessonUrl ?? sourceUrl),
          courseUrl: String(doc.data().courseUrl ?? this.getOfficialCourseUrlForGradeAndMedium(Number(doc.data().grade ?? 8), rawMedium)),
          grade: Number(doc.data().grade ?? 8),
          medium: this.normalizeMedium(rawMedium),
          subject: 'mathematics',
          sourceHash: doc.data().sourceHash ? String(doc.data().sourceHash) : undefined,
          discoveredAt: doc.data().discoveredAt ? String(doc.data().discoveredAt) : undefined,
        };
      });
    }

    const catalog = await this.db.collection('mathematicsOfferings').doc(catalogId).get();
    if (!catalog.exists) {
      const seeded = await this.ensureEnabledMathematicsCatalogRow();
      return this.listCatalogLessons(seeded.id);
    }

    const row = catalog.data() as Partial<MathematicsOffering>;
    const fetched = await this.seedCatalogLessonsForRow(catalogId, Number(row.grade ?? 8), this.normalizeMedium(row.medium) ?? 'English');
    return fetched;
  }

  async listTextbooks(): Promise<MathematicsTextbookChapter[]> {
    const snapshot = await this.db.collection('mathematicsTextbooks').get();
    return snapshot.docs.map((doc) => {
      const data = doc.data() as Partial<MathematicsTextbookChapter>;
      const medium = (this.normalizeMedium(data.medium) ?? 'English') as MathematicsTextbookChapter['medium'];
      const sourceUrl = this.normalizeOfficialSourceUrl(data.sourceUrl ?? data.officialCourseUrl)
        || this.getOfficialCourseUrlForGradeAndMedium(Number(data.grade ?? 0), medium);

      return {
        ...(data as MathematicsTextbookChapter),
        id: doc.id,
        medium,
        sourceUrl,
        officialCourseUrl: data.officialCourseUrl || sourceUrl,
        approvalStatus: this.getApprovalStatus(data),
        accessEnabled: data.accessEnabled !== false,
      };
    });
  }

  async listStudentTextbooks(filters: { grade?: number; medium?: string; subjectId?: string; approvalStatus?: string } = {}): Promise<MathematicsTextbookChapter[]> {
    const [records, offerings] = await Promise.all([
      this.listTextbooks(),
      this.listOfferings(),
    ]);

    const enabledGradesByMedium = new Map<string, Set<number>>();
    for (const offering of offerings) {
      if (offering.subjectId !== 'mathematics' || offering.studentAccessEnabled === false) {
        continue;
      }

      const mediumValue = this.normalizeMedium(offering.medium) ?? 'English';
      const gradeSet = enabledGradesByMedium.get(mediumValue) ?? new Set<number>();
      gradeSet.add(Number(offering.grade));
      enabledGradesByMedium.set(mediumValue, gradeSet);
    }

    return records.filter((item) => {
      const matchesSubject = !filters.subjectId || item.subjectId === String(filters.subjectId);
      const matchesGrade = true;
      const matchesMedium = filters.medium ? this.normalizeMedium(item.medium) === this.normalizeMedium(filters.medium) : true;
      const matchesApproval = !filters.approvalStatus || item.approvalStatus === String(filters.approvalStatus);
      const mediumKey = this.normalizeMedium(item.medium) ?? 'English';
      const allowedByAdmin = enabledGradesByMedium.get(mediumKey)?.has(Number(item.grade)) ?? false;
      const visible = item.subjectId === 'mathematics'
        && item.verificationStatus === 'verified'
        && this.getApprovalStatus(item) === 'approved'
        && item.accessEnabled !== false
        && allowedByAdmin;

      return visible && matchesSubject && matchesGrade && matchesMedium && matchesApproval;
    });
  }

  async getTextbookById(id: string): Promise<MathematicsTextbookChapter> {
    const doc = await this.db.collection('mathematicsTextbooks').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Mathematics textbook not found.');
    }

    const data = doc.data() as Partial<MathematicsTextbookChapter>;
    const medium = (this.normalizeMedium(data.medium) ?? 'English') as MathematicsTextbookChapter['medium'];
    const sourceUrl = this.normalizeOfficialSourceUrl(data.sourceUrl ?? data.officialCourseUrl)
      || this.getOfficialCourseUrlForGradeAndMedium(Number(data.grade ?? 0), medium);

    return {
      ...(data as MathematicsTextbookChapter),
      id: doc.id,
      medium,
      sourceUrl,
      officialCourseUrl: data.officialCourseUrl || sourceUrl,
      approvalStatus: this.getApprovalStatus(data),
      accessEnabled: data.accessEnabled !== false,
    };
  }

  getApprovedDownloadUrl(textbook: MathematicsTextbookChapter): string {
    const official = textbook.resolvedPdfUrl ?? textbook.officialResourceUrl ?? textbook.officialCourseUrl;
    if (!official) {
      throw new UnauthorizedException('This textbook does not have a valid official download URL.');
    }

    const url = new URL(official);
    const allowedHosts = new Set(['edupub.gov.lk', 'www.edupub.gov.lk', 'e-thaksalawa.moe.gov.lk', 'www.e-thaksalawa.moe.gov.lk', 'nie.lk', 'www.nie.lk', 'moe.gov.lk', 'www.moe.gov.lk']);
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) {
      throw new UnauthorizedException('This textbook download is not allowed from an official government source.');
    }

    return url.toString();
  }

  async assertDownloadAllowed(textbook: MathematicsTextbookChapter): Promise<void> {
    if (!textbook || textbook.subjectId !== 'mathematics') {
      throw new UnauthorizedException('This resource is not available for download.');
    }

    if (textbook.verificationStatus !== 'verified') {
      throw new UnauthorizedException('The mathematics textbook is not verified for student download.');
    }

    if (this.getApprovalStatus(textbook) !== 'approved') {
      throw new UnauthorizedException('The mathematics textbook has not been approved for student access.');
    }

    if (textbook.accessEnabled === false) {
      throw new UnauthorizedException('This mathematics textbook is disabled.');
    }

    this.getApprovedDownloadUrl(textbook);
  }

  async incrementDownloadCount(id: string): Promise<void> {
    const ref = this.db.collection('mathematicsTextbooks').doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      throw new NotFoundException('Mathematics textbook not found.');
    }

    await ref.update({
      downloadCount: (snapshot.data()?.downloadCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  }

  async upsertOffering(entry: MathematicsOffering): Promise<MathematicsOffering> {
    const ref = this.db.collection('mathematicsOfferings').doc(entry.id || `${entry.subjectId}-${entry.grade}-${entry.medium}`);
    const payload = {
      ...entry,
      updatedAt: new Date().toISOString(),
      createdAt: entry.createdAt ?? new Date().toISOString(),
    } as MathematicsOffering;

    await ref.set(payload, { merge: true });
    return { ...payload, id: ref.id };
  }

  async upsertTextbook(entry: MathematicsTextbookChapter): Promise<MathematicsTextbookChapter> {
    const ref = this.db.collection('mathematicsTextbooks').doc(entry.id || `${entry.subjectId}-${entry.grade}-${entry.medium}-${entry.chapterNumber}`);
    const payload = {
      ...entry,
      updatedAt: new Date().toISOString(),
      createdAt: entry.createdAt ?? new Date().toISOString(),
    } as MathematicsTextbookChapter;

    await ref.set(payload, { merge: true });
    return { ...payload, id: ref.id };
  }

  async seedCanonicalCatalog(): Promise<{ offeringsCreated: number; textbooksCreated: number }> {
    const catalog: MathematicsCatalogEntry[] = [
      { id: 'mathematics-g6-sinhala', grade: 6, medium: 'Sinhala', title: 'Grade 6 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(6, 'Sinhala'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(6, 'Sinhala'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g6-tamil', grade: 6, medium: 'Tamil', title: 'Grade 6 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(6, 'Tamil'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(6, 'Tamil'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g6-english', grade: 6, medium: 'English', title: 'Grade 6 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(6, 'English'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(6, 'English'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g7-sinhala', grade: 7, medium: 'Sinhala', title: 'Grade 7 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(7, 'Sinhala'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(7, 'Sinhala'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g7-tamil', grade: 7, medium: 'Tamil', title: 'Grade 7 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(7, 'Tamil'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(7, 'Tamil'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g7-english', grade: 7, medium: 'English', title: 'Grade 7 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(7, 'English'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(7, 'English'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g8-sinhala', grade: 8, medium: 'Sinhala', title: 'Grade 8 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(8, 'Sinhala'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(8, 'Sinhala'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g8-tamil', grade: 8, medium: 'Tamil', title: 'Grade 8 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(8, 'Tamil'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(8, 'Tamil'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g8-english', grade: 8, medium: 'English', title: 'Grade 8 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(8, 'English'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(8, 'English'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g9-sinhala', grade: 9, medium: 'Sinhala', title: 'Grade 9 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(9, 'Sinhala'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(9, 'Sinhala'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g9-tamil', grade: 9, medium: 'Tamil', title: 'Grade 9 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(9, 'Tamil'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(9, 'Tamil'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g9-english', grade: 9, medium: 'English', title: 'Grade 9 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(9, 'English'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(9, 'English'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g10-sinhala', grade: 10, medium: 'Sinhala', title: 'Grade 10 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(10, 'Sinhala'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(10, 'Sinhala'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g10-tamil', grade: 10, medium: 'Tamil', title: 'Grade 10 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(10, 'Tamil'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(10, 'Tamil'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g10-english', grade: 10, medium: 'English', title: 'Grade 10 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(10, 'English'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(10, 'English'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g11-sinhala', grade: 11, medium: 'Sinhala', title: 'Grade 11 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(11, 'Sinhala'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(11, 'Sinhala'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g11-tamil', grade: 11, medium: 'Tamil', title: 'Grade 11 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(11, 'Tamil'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(11, 'Tamil'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
      { id: 'mathematics-g11-english', grade: 11, medium: 'English', title: 'Grade 11 Mathematics', sourceUrl: this.getOfficialCourseUrlForGradeAndMedium(11, 'English'), officialCourseUrl: this.getOfficialCourseUrlForGradeAndMedium(11, 'English'), sourceDomain: 'e-thaksalawa.moe.gov.lk', sourceAuthority: 'Ministry of Education', verificationStatus: 'verified' },
    ];

    let offeringsCreated = 0;
    let textbooksCreated = 0;

    for (const entry of catalog) {
      const offeringRecord: MathematicsOffering = {
        id: `${entry.grade}-${entry.medium.toLowerCase()}`,
        subjectId: 'mathematics',
        subjectName: 'Mathematics',
        grade: entry.grade as 6 | 7 | 8 | 9 | 10 | 11,
        medium: entry.medium,
        studentAccessEnabled: true,
        teacherAccessEnabled: true,
        textbookAccessEnabled: true,
        quizAccessEnabled: true,
        simulatorAccessEnabled: true,
        verified: true,
      };

      await this.upsertOffering(offeringRecord);
      offeringsCreated += 1;

      const textbook: MathematicsTextbookChapter = {
        id: `${entry.grade}-${entry.medium.toLowerCase()}-chapter-1`,
        subjectId: 'mathematics',
        subjectName: 'Mathematics',
        grade: entry.grade as 6 | 7 | 8 | 9 | 10 | 11,
        medium: entry.medium,
        chapterNumber: 1,
        chapterTitle: `${entry.title} – Chapter 1`,
        title: entry.title,
        sourceUrl: entry.sourceUrl || entry.officialCourseUrl,
        officialCourseUrl: entry.officialCourseUrl,
        officialResourceUrl: entry.officialResourceUrl ?? null,
        resolvedPdfUrl: entry.officialResourceUrl ?? null,
        sourceDomain: entry.sourceDomain ?? 'e-thaksalawa.moe.gov.lk',
        sourceAuthority: entry.sourceAuthority ?? 'Ministry of Education',
        resourceType: 'textbook-chapter',
        verificationStatus: entry.verificationStatus ?? 'verified',
        approvalStatus: 'approved',
        accessEnabled: true,
        downloadCount: 0,
      };

      await this.upsertTextbook(textbook);
      textbooksCreated += 1;
    }

    this.logger.log(`Seeded official Mathematics catalog: ${offeringsCreated} offerings and ${textbooksCreated} textbooks`);
    return { offeringsCreated, textbooksCreated };
  }
}
