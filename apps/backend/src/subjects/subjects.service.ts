import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { AssignSubjectTeachersInput, CreateSubjectInput, Subject, SubjectFilters, SubjectStatus, UpdateSubjectInput } from '@edunexa/shared-types';

interface SubjectRecord extends Subject {
  createdBy: string;
}

@Injectable()
export class SubjectsService {
  private firestore() {
    return admin.firestore();
  }

  private normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'subject';
  }

  private async writeAuditLog(entry: {
    action: 'create_subject' | 'update_subject' | 'archive_subject' | 'reactivate_subject' | 'assign_subject_teachers';
    actorUid: string;
    actorEmail?: string;
    subjectId: string;
    subjectName?: string;
    details?: Record<string, unknown>;
    createdAt: string;
  }) {
    const logId = this.firestore().collection('auditLogs').doc().id;
    await this.firestore().collection('auditLogs').doc(logId).set(entry, { merge: true });
    return logId;
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

  private toSubject(doc: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot): Subject {
    const data = doc.data() as Partial<SubjectRecord> | undefined;
    return {
      id: doc.id,
      name: String(data?.name ?? 'Untitled subject'),
      slug: String(data?.slug ?? this.normalizeSlug(String(data?.name ?? 'Untitled subject'))),
      description: data?.description,
      grade: Number(data?.grade ?? 6),
      medium: (data?.medium ?? 'English') as Subject['medium'],
      status: (data?.status ?? 'active') as SubjectStatus,
      iconName: data?.iconName,
      assignedTeacherIds: Array.isArray(data?.assignedTeacherIds) ? data.assignedTeacherIds.filter(Boolean) : [],
      createdBy: data?.createdBy ? String(data.createdBy) : undefined,
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
    };
  }

  private async resolveTeacherUid(uid: string) {
    const userDoc = await this.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new BadRequestException(`Teacher UID ${uid} does not have a Firestore profile.`);
    }

    const profile = userDoc.data() as { role?: string; status?: string; email?: string; fullName?: string } | undefined;
    if (!profile) {
      throw new BadRequestException(`Teacher UID ${uid} does not have a valid profile.`);
    }

    if (profile.role !== 'teacher' && profile.role !== 'reviewer') {
      throw new BadRequestException(`UID ${uid} is not a valid teacher or reviewer account.`);
    }

    if (profile.status !== 'active') {
      throw new BadRequestException(`UID ${uid} is suspended or inactive and cannot be assigned.`);
    }

    return profile;
  }

  private async validateTeacherIds(teacherIds: string[]): Promise<string[]> {
    const uniqueTeacherIds = [...new Set(teacherIds.map((value) => value.trim()).filter(Boolean))];

    if (uniqueTeacherIds.length !== teacherIds.length) {
      throw new BadRequestException('Teacher IDs must be unique.');
    }

    for (const uid of uniqueTeacherIds) {
      try {
        const authUser = await admin.auth().getUser(uid);
        if (!authUser.email) {
          throw new BadRequestException(`UID ${uid} is missing an email in Firebase Authentication.`);
        }
        await this.resolveTeacherUid(uid);
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(`UID ${uid} could not be validated as an active teacher.`);
      }
    }

    return uniqueTeacherIds;
  }

  async createSubject(actorUid: string, actorEmail: string | null, payload: CreateSubjectInput): Promise<Subject> {
    const name = payload.name.trim();
    const description = payload.description?.trim();
    const grade = Number(payload.grade);
    const medium = payload.medium;

    const baseSlug = this.normalizeSlug(name);
    const slug = `${grade}-${medium.toLowerCase()}-${baseSlug}`;

    const snapshot = await this.firestore().collection('subjects').where('grade', '==', grade).where('medium', '==', medium).where('slug', '==', slug).limit(1).get();
    if (!snapshot.empty) {
      throw new BadRequestException('A subject with the same grade, medium and slug already exists.');
    }

    const subjectId = this.firestore().collection('subjects').doc().id;
    const createdAt = admin.firestore.FieldValue.serverTimestamp();
    const updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const subject: SubjectRecord = {
      id: subjectId,
      name,
      slug,
      description,
      grade,
      medium,
      status: 'active',
      iconName: payload.iconName?.trim() || undefined,
      assignedTeacherIds: [],
      createdBy: actorUid,
      createdAt,
      updatedAt,
    };

    await this.firestore().collection('subjects').doc(subjectId).set(subject);
    await this.writeAuditLog({
      action: 'create_subject',
      actorUid,
      actorEmail: actorEmail ?? undefined,
      subjectId,
      subjectName: name,
      details: { grade, medium, slug },
      createdAt: new Date().toISOString(),
    });

    return subject;
  }

  async updateSubject(actorUid: string, actorEmail: string | null, subjectId: string, payload: UpdateSubjectInput): Promise<Subject> {
    const docRef = this.firestore().collection('subjects').doc(subjectId);
    const existingDoc = await docRef.get();

    if (!existingDoc.exists) {
      throw new NotFoundException('Subject not found.');
    }

    const existing = this.toSubject(existingDoc);
    const nextName = payload.name?.trim() || existing.name;
    const nextGrade = typeof payload.grade === 'number' ? payload.grade : existing.grade;
    const nextMedium = payload.medium || existing.medium;
    const nextDescription = payload.description !== undefined ? payload.description.trim() || undefined : existing.description;
    const nextIconName = payload.iconName !== undefined ? payload.iconName.trim() || undefined : existing.iconName;
    const nextStatus = payload.status || existing.status;
    const nextAssignedTeacherIds = Array.isArray(payload.assignedTeacherIds) ? payload.assignedTeacherIds : existing.assignedTeacherIds;

    const slugInputBase = nextName;
    const nextSlug = `${nextGrade}-${nextMedium.toLowerCase()}-${this.normalizeSlug(slugInputBase)}`;

    const duplicateSnapshot = await this.firestore().collection('subjects').where('grade', '==', nextGrade).where('medium', '==', nextMedium).where('slug', '==', nextSlug).limit(1).get();
    if (!duplicateSnapshot.empty && duplicateSnapshot.docs.some((doc) => doc.id !== subjectId)) {
      throw new BadRequestException('Another subject already exists with the same grade, medium and slug.');
    }

    const updated: SubjectRecord = {
      ...existing,
      name: nextName,
      slug: nextSlug,
      description: nextDescription,
      grade: nextGrade,
      medium: nextMedium,
      status: nextStatus,
      iconName: nextIconName,
      assignedTeacherIds: nextAssignedTeacherIds,
      createdBy: existing.createdBy ?? actorUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(updated, { merge: true });
    await this.writeAuditLog({
      action: nextStatus === 'archived' && existing.status !== 'archived' ? 'archive_subject' : 'update_subject',
      actorUid,
      actorEmail: actorEmail ?? undefined,
      subjectId,
      subjectName: nextName,
      details: { changes: payload },
      createdAt: new Date().toISOString(),
    });

    return updated;
  }

  async updateSubjectStatus(actorUid: string, actorEmail: string | null, subjectId: string, status: SubjectStatus): Promise<Subject> {
    const docRef = this.firestore().collection('subjects').doc(subjectId);
    const existingDoc = await docRef.get();

    if (!existingDoc.exists) {
      throw new NotFoundException('Subject not found.');
    }

    const existing = this.toSubject(existingDoc);
    const next = { ...existing, status, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    await docRef.set(next, { merge: true });
    await this.writeAuditLog({
      action: status === 'archived' ? 'archive_subject' : 'reactivate_subject',
      actorUid,
      actorEmail: actorEmail ?? undefined,
      subjectId,
      subjectName: existing.name,
      details: { from: existing.status, to: status },
      createdAt: new Date().toISOString(),
    });

    return next;
  }

  async assignTeachers(actorUid: string, actorEmail: string | null, subjectId: string, payload: AssignSubjectTeachersInput): Promise<Subject> {
    const teacherIds = await this.validateTeacherIds(payload.teacherIds ?? []);
    const docRef = this.firestore().collection('subjects').doc(subjectId);
    const existingDoc = await docRef.get();

    if (!existingDoc.exists) {
      throw new NotFoundException('Subject not found.');
    }

    const existing = this.toSubject(existingDoc);
    const next = { ...existing, assignedTeacherIds: teacherIds, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    await docRef.set(next, { merge: true });
    await this.writeAuditLog({
      action: 'assign_subject_teachers',
      actorUid,
      actorEmail: actorEmail ?? undefined,
      subjectId,
      subjectName: existing.name,
      details: { teacherIds },
      createdAt: new Date().toISOString(),
    });

    return next;
  }

  private isMathematicsSubject(subject: Subject): boolean {
    const values = [subject.name, subject.slug, subject.description ?? ''];
    return values.some((value) => value.toLowerCase().includes('math') || value.toLowerCase().includes('mathematics'));
  }

  async listAdminSubjects(filters: SubjectFilters = {}): Promise<Subject[]> {
    let query: FirebaseFirestore.Query = this.firestore().collection('subjects');

    if (filters.grade !== undefined) {
      query = query.where('grade', '==', Number(filters.grade));
    }

    if (filters.medium) {
      query = query.where('medium', '==', filters.medium);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.where('status', '==', filters.status);
    }

    if (filters.search) {
      const value = filters.search.trim().toLowerCase();
      const searchSnapshot = await this.firestore().collection('subjects').where('nameLower', '==', value).get();
      const ids = searchSnapshot.docs.map((doc) => doc.id);
      const base = ids.length > 0 ? this.firestore().collection('subjects').where(admin.firestore.FieldPath.documentId(), 'in', ids.slice(0, 10)) : this.firestore().collection('subjects').where(admin.firestore.FieldPath.documentId(), 'in', ['__no_match__']);
      return (await base.get()).docs.map((doc) => this.toSubject(doc)).filter((subject) => this.isMathematicsSubject(subject));
    }

    const snapshot = await query.orderBy('updatedAt', 'desc').limit(filters.limit ?? 200).get();
    return snapshot.docs.map((doc) => this.toSubject(doc)).filter((subject) => this.isMathematicsSubject(subject));
  }

  async listPublicSubjects(): Promise<Subject[]> {
    const snapshot = await this.firestore().collection('subjects').get();
    const subjects = snapshot.docs.map((doc) => this.toSubject(doc));

    return subjects
      .filter((subject) => subject.status === 'active' && this.isMathematicsSubject(subject))
      .sort((a, b) => this.timestampToMs(b.updatedAt) - this.timestampToMs(a.updatedAt));
  }

  async getSubjectById(subjectId: string): Promise<Subject> {
    const doc = await this.firestore().collection('subjects').doc(subjectId).get();
    if (!doc.exists) {
      throw new NotFoundException('Subject not found.');
    }
    return this.toSubject(doc);
  }

  async listTeacherSubjects(uid: string): Promise<Subject[]> {
    const snapshot = await this.firestore().collection('subjects').where('assignedTeacherIds', 'array-contains', uid).orderBy('updatedAt', 'desc').get();
    return snapshot.docs.map((doc) => this.toSubject(doc));
  }
}
