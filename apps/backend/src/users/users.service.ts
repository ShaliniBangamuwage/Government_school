import { BadRequestException, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { AppUser, UserRole, UserStatus } from '@edunexa/shared-types';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';

interface AuditLogEntry {
  actorUid?: string;
  actorEmail?: string;
  action: 'create_staff_user' | 'update_user';
  targetUid: string;
  targetEmail?: string;
  role?: UserRole;
  status?: UserStatus;
  details?: Record<string, unknown>;
  createdAt: string;
}

interface CreateStaffUserInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
}

interface UpdateUserInput {
  fullName?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  mustChangePassword?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private async writeAuditLog(entry: AuditLogEntry) {
    const logId = admin.firestore().collection('auditLogs').doc().id;
    await admin.firestore().collection('auditLogs').doc(logId).set(entry, { merge: true });
    return logId;
  }

  async listUsers(): Promise<AppUser[]> {
    const snapshot = await admin.firestore().collection('users').orderBy('updatedAt', 'desc').get();
    const users = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const user = await this.firebaseAdminService.getUserProfile(doc.id);
        return user ?? null;
      }),
    );

    return users.filter((user): user is AppUser => Boolean(user));
  }

  async createStaffUser(input: CreateStaffUserInput): Promise<AppUser> {
    const safeRole = input.role === 'teacher' || input.role === 'reviewer' || input.role === 'admin' ? input.role : null;

    if (!safeRole) {
      throw new BadRequestException('Staff users must be created as teacher, reviewer, or admin.');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedFullName = input.fullName.trim();

    if (!normalizedEmail || !normalizedFullName || input.password.trim().length < 8) {
      throw new BadRequestException('Full name, email, and password are required.');
    }

    let userRecord: admin.auth.UserRecord;

    try {
      userRecord = await admin.auth().getUserByEmail(normalizedEmail);
    } catch {
      userRecord = await admin.auth().createUser({
        email: normalizedEmail,
        password: input.password,
        displayName: normalizedFullName,
        emailVerified: true,
      });
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, { role: safeRole });

    const uid = userRecord.uid;
    const profile = await this.firebaseAdminService.updateUserProfile(uid, {
      fullName: normalizedFullName,
      email: normalizedEmail,
      role: safeRole,
      status: input.status ?? 'active',
      mustChangePassword: true,
      displayName: normalizedFullName,
      onboardingCompleted: true,
    });

    await this.writeAuditLog({
      action: 'create_staff_user',
      targetUid: uid,
      targetEmail: normalizedEmail,
      role: safeRole,
      status: input.status ?? 'active',
      details: { fullName: normalizedFullName },
      createdAt: new Date().toISOString(),
    });

    return profile;
  }

  async updateCurrentUser(uid: string, input: { fullName?: string; email?: string; grade?: number; medium?: string; onboardingCompleted?: boolean; displayName?: string; mustChangePassword?: boolean }): Promise<AppUser> {
    const existing = await this.firebaseAdminService.getUserProfile(uid);

    if (!existing) {
      throw new BadRequestException('User profile not found.');
    }

    const nextGrade = typeof input.grade === 'number' && Number.isFinite(input.grade) ? Number(input.grade) : existing.grade;
    const nextMedium = this.firebaseAdminService.normalizeMedium(
      typeof input.medium === 'string' && input.medium.trim().length > 0 ? input.medium : existing.medium ?? 'English',
    );

    const profile = await this.firebaseAdminService.updateUserProfile(uid, {
      fullName: input.fullName?.trim() || existing.fullName,
      email: input.email?.trim().toLowerCase() || existing.email,
      grade: nextGrade,
      medium: nextMedium,
      displayName: input.displayName?.trim() || input.fullName?.trim() || existing.displayName || existing.fullName,
      onboardingCompleted: typeof input.onboardingCompleted === 'boolean' ? input.onboardingCompleted : existing.onboardingCompleted,
      mustChangePassword: typeof input.mustChangePassword === 'boolean' ? input.mustChangePassword : existing.mustChangePassword ?? false,
    });

    return profile;
  }

  async updateUser(uid: string, input: UpdateUserInput): Promise<AppUser> {
    const existing = await this.firebaseAdminService.getUserProfile(uid);

    if (!existing) {
      throw new BadRequestException('User profile not found.');
    }

    const nextRole = input.role && (input.role === 'student' || input.role === 'teacher' || input.role === 'reviewer' || input.role === 'admin')
      ? input.role
      : existing.role;

    if (input.role === 'student') {
      throw new BadRequestException('Public student accounts are not managed from this admin endpoint.');
    }

    const nextStatus = input.status && (input.status === 'active' || input.status === 'disabled' || input.status === 'suspended')
      ? input.status
      : existing.status;

    const profile = await this.firebaseAdminService.updateUserProfile(uid, {
      fullName: input.fullName?.trim() || existing.fullName,
      email: input.email?.trim().toLowerCase() || existing.email,
      role: nextRole,
      status: nextStatus,
      displayName: input.fullName?.trim() || existing.displayName || existing.fullName,
      mustChangePassword: typeof input.mustChangePassword === 'boolean' ? input.mustChangePassword : existing.mustChangePassword ?? false,
    });

    if (profile.role !== existing.role) {
      await admin.auth().setCustomUserClaims(uid, { role: profile.role });
    }

    await this.writeAuditLog({
      action: 'update_user',
      targetUid: uid,
      targetEmail: profile.email,
      role: profile.role,
      status: profile.status,
      details: { previousRole: existing.role, previousStatus: existing.status, changedFields: Object.keys(input) },
      createdAt: new Date().toISOString(),
    });

    return profile;
  }
}
