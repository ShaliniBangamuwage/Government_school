import * as admin from 'firebase-admin';
import type { AppUser, UserMedium, UserRole, UserStatus } from '@edunexa/shared-types';

function isUserRole(value: unknown): value is UserRole {
  return value === 'student' || value === 'teacher' || value === 'reviewer' || value === 'admin';
}

function isUserStatus(value: unknown): value is UserStatus {
  return value === 'active' || value === 'disabled' || value === 'suspended';
}

export class FirebaseAdminService {
  private app: admin.app.App | null = null;

  public getApp(): admin.app.App {
    if (this.app) {
      return this.app;
    }

    if (admin.apps.length > 0) {
      this.app = admin.app();
      return this.app;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID ?? 'edunexa-d34ae';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    this.app = admin.initializeApp({
      projectId,
      credential:
        clientEmail && privateKey
          ? admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            })
          : admin.credential.applicationDefault(),
    });

    return this.app;
  }

  public getFirestore(): admin.firestore.Firestore {
    return this.getApp().firestore();
  }

  normalizeMedium(value?: string): UserMedium {
    const normalized = value?.trim();
    if (!normalized) {
      return 'English';
    }

    switch (normalized.toLowerCase()) {
      case 'sinhala':
      case 'sm':
        return 'Sinhala';
      case 'tamil':
      case 'tm':
        return 'Tamil';
      case 'english':
      case 'em':
        return 'English';
      case 'Sinhala':
        return 'Sinhala';
      case 'Tamil':
        return 'Tamil';
      case 'English':
        return 'English';
      default:
        return 'English';
    }
  }

  private normalizeUserRole(value: unknown): UserRole {
    return isUserRole(value) ? value : 'student';
  }

  private normalizeUserStatus(value: unknown): UserStatus {
    return isUserStatus(value) ? value : 'active';
  }

  private toAppUser(uid: string, data: Record<string, unknown>): AppUser {
    const fullName =
      typeof data.fullName === 'string' && data.fullName.trim().length > 0
        ? data.fullName.trim()
        : typeof data.displayName === 'string' && data.displayName.trim().length > 0
          ? data.displayName.trim()
          : typeof data.email === 'string' && data.email.trim().length > 0
            ? data.email.split('@')[0]
            : 'EduNexa user';

    const email =
      typeof data.email === 'string' && data.email.trim().length > 0
        ? data.email.trim().toLowerCase()
        : '';

    return {
      id: typeof data.id === 'string' && data.id.length > 0 ? data.id : uid,
      uid,
      fullName,
      displayName: typeof data.displayName === 'string' && data.displayName.trim().length > 0 ? data.displayName.trim() : fullName,
      email,
      role: this.normalizeUserRole(data.role),
      status: this.normalizeUserStatus(data.status),
      grade: typeof data.grade === 'number' ? data.grade : undefined,
      medium: this.normalizeMedium(typeof data.medium === 'string' ? data.medium : 'English'),
      emailVerified: data.emailVerified === true,
      onboardingCompleted: data.onboardingCompleted === true,
      mustChangePassword: data.mustChangePassword === true,
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  }

  async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    const app = this.getApp();
    return app.auth().verifyIdToken(token);
  }

  async getUserProfile(uid: string): Promise<AppUser | null> {
    const firestore = this.getApp().firestore();
    const snapshot = await firestore.collection('users').doc(uid).get();
    const data = snapshot.data() as Record<string, unknown> | undefined;

    if (!data) {
      return null;
    }

    return this.toAppUser(uid, data);
  }

  async createOrUpdateStudentProfile(
    decoded: admin.auth.DecodedIdToken,
    profileInput: {
      fullName?: string;
      email?: string;
      grade?: number;
      medium?: UserMedium | string;
      status?: UserStatus;
    },
  ): Promise<AppUser> {
    const firestore = this.getApp().firestore();
    const uid = decoded.uid;
    const existing = await this.getUserProfile(uid);

    const emailSource =
      typeof profileInput.email === 'string' && profileInput.email.trim().length > 0
        ? profileInput.email.trim().toLowerCase()
        : (decoded.email ?? existing?.email ?? '').trim().toLowerCase();

    if (!emailSource) {
      throw new Error('Verified Firebase user email is required for profile creation.');
    }

    const fullName =
      typeof profileInput.fullName === 'string' && profileInput.fullName.trim().length > 0
        ? profileInput.fullName.trim()
        : existing?.fullName || decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'EduNexa user');

    const medium = this.normalizeMedium(
      typeof profileInput.medium === 'string' && profileInput.medium.trim().length > 0
        ? profileInput.medium
        : existing?.medium ?? 'English',
    );

    const grade = Number.isFinite(profileInput.grade)
      ? Number(profileInput.grade)
      : typeof existing?.grade === 'number'
        ? existing.grade
        : undefined;

    const role: UserRole = existing?.role ?? 'student';
    const status: UserStatus = existing ? existing.status : (profileInput.status ?? 'active');
    const createdAtValue = existing?.createdAt ?? admin.firestore.FieldValue.serverTimestamp();
    const updatedAtValue = admin.firestore.FieldValue.serverTimestamp();

    const profile: AppUser = {
      id: uid,
      uid,
      fullName,
      displayName: fullName,
      email: emailSource,
      role,
      grade,
      medium,
      status,
      emailVerified: decoded.email_verified ?? existing?.emailVerified ?? true,
      onboardingCompleted: existing?.onboardingCompleted ?? false,
      mustChangePassword: existing?.mustChangePassword ?? false,
      createdAt: createdAtValue,
      updatedAt: updatedAtValue,
    };

    const documentData: Record<string, unknown> = {
      ...profile,
      ...(existing ? {} : { createdAt: createdAtValue }),
      updatedAt: updatedAtValue,
    };

    await firestore.collection('users').doc(uid).set(documentData, { merge: true });
    return profile;
  }

  async upsertUserProfile(decoded: admin.auth.DecodedIdToken): Promise<AppUser> {
    return this.createOrUpdateStudentProfile(decoded, {
      fullName: decoded.name ?? decoded.email?.split('@')[0] ?? 'EduNexa user',
      email: decoded.email ?? undefined,
      medium: 'English',
      status: 'active',
    });
  }

  async updateUserProfile(uid: string, profileInput: Partial<AppUser> & { fullName?: string; email?: string; role?: UserRole; status?: UserStatus; displayName?: string; mustChangePassword?: boolean; bio?: string; avatarUrl?: string; coverPhotoUrl?: string }): Promise<AppUser> {
    const firestore = this.getApp().firestore();
    const existing = await this.getUserProfile(uid);

    const normalizedGrade = Number.isFinite(profileInput.grade) ? Number(profileInput.grade) : existing?.grade;
    const normalizedMedium = this.normalizeMedium(
      typeof profileInput.medium === 'string' && profileInput.medium.trim().length > 0
        ? profileInput.medium
        : existing?.medium ?? 'English',
    );

    const nextProfile: AppUser = {
      id: uid,
      uid,
      fullName: profileInput.fullName?.trim() || existing?.fullName || 'EduNexa user',
      displayName: profileInput.displayName?.trim() || profileInput.fullName?.trim() || existing?.displayName || existing?.fullName || 'EduNexa user',
      email: (profileInput.email ?? existing?.email ?? '').trim().toLowerCase(),
      role: profileInput.role || existing?.role || 'student',
      status: profileInput.status || existing?.status || 'active',
      grade: normalizedGrade,
      medium: normalizedMedium,
      emailVerified: profileInput.emailVerified ?? existing?.emailVerified ?? true,
      onboardingCompleted: profileInput.onboardingCompleted ?? existing?.onboardingCompleted ?? false,
      mustChangePassword: typeof profileInput.mustChangePassword === 'boolean' ? profileInput.mustChangePassword : existing?.mustChangePassword ?? false,
      bio: typeof profileInput.bio === 'string' ? profileInput.bio.trim().slice(0, 240) : existing?.bio,
      avatarUrl: typeof profileInput.avatarUrl === 'string' ? profileInput.avatarUrl : existing?.avatarUrl,
      coverPhotoUrl: typeof profileInput.coverPhotoUrl === 'string' ? profileInput.coverPhotoUrl : existing?.coverPhotoUrl,
      createdAt: existing?.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const documentData: Record<string, unknown> = {
      ...nextProfile,
      ...(existing ? {} : { createdAt: nextProfile.createdAt }),
      updatedAt: nextProfile.updatedAt,
    };

    await firestore.collection('users').doc(uid).set(documentData, { merge: true });
    return nextProfile;
  }
}
