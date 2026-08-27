import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { DashboardSummary, SafeUserProfile } from '@edunexa/shared-types';

interface FirestoreUserSummary {
  id?: string;
  uid?: string;
  fullName?: string;
  displayName?: string;
  email?: string;
  role?: SafeUserProfile['role'];
  status?: SafeUserProfile['status'];
  grade?: number;
  medium?: SafeUserProfile['medium'];
  createdAt?: unknown;
  updatedAt?: unknown;
}

function ensureFirebaseApp() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-project';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    admin.initializeApp({
      projectId,
      credential:
        clientEmail && privateKey
          ? admin.credential.cert({ projectId, clientEmail, privateKey })
          : admin.credential.applicationDefault(),
    });
  }
}

@Injectable()
export class AdminDashboardService {
  async getSummary(): Promise<DashboardSummary> {
    ensureFirebaseApp();

    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FirestoreUserSummary) }));

    const totalUsers = users.length;
    const totalStudents = users.filter((user) => user.role === 'student').length;
    const totalTeachers = users.filter((user) => user.role === 'teacher').length;
    const totalAdmins = users.filter((user) => user.role === 'admin').length;
    const activeUsers = users.filter((user) => user.status === 'active').length;
    const suspendedUsers = users.filter((user) => user.status === 'suspended').length;

    const subjectsSnapshot = await admin.firestore().collection('subjects').get();
    const subjectDocs = Array.isArray(subjectsSnapshot?.docs) ? subjectsSnapshot.docs : [];
    const totalSubjects = subjectsSnapshot?.size ?? subjectDocs.length;
    const activeSubjects = subjectDocs.filter((doc) => (doc.data().status ?? 'active') === 'active').length;
    const archivedSubjects = subjectDocs.filter((doc) => (doc.data().status ?? 'active') === 'archived').length;
    const totalTextbooks = 0;

    const approvalsSnapshot = await admin.firestore().collection('contentApprovals').get();
    const pendingContentReviews = approvalsSnapshot.docs.filter((doc) => {
      const value = doc.data();
      return value.status === 'pending';
    }).length;

    const recentUsers = users
      .slice()
      .sort((left, right) => {
        const leftTime = new Date(String((left.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? left.updatedAt ?? 0)).getTime();
        const rightTime = new Date(String((right.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? right.updatedAt ?? 0)).getTime();
        return rightTime - leftTime;
      })
      .slice(0, 5)
      .map((user) => ({
        id: String(user.id ?? user.uid ?? ''),
        uid: String(user.uid ?? user.id ?? ''),
        fullName: String(user.fullName ?? user.displayName ?? 'EduNexa user'),
        displayName: String(user.displayName ?? user.fullName ?? 'EduNexa user'),
        email: String(user.email ?? ''),
        role: (user.role ?? 'student') as SafeUserProfile['role'],
        status: (user.status ?? 'active') as SafeUserProfile['status'],
        grade: typeof user.grade === 'number' ? user.grade : undefined,
        medium: user.medium,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

    return {
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      activeUsers,
      suspendedUsers,
      totalSubjects,
      activeSubjects,
      archivedSubjects,
      totalTextbooks,
      pendingContentReviews,
      recentUsers,
    };
  }
}
