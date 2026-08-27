import { BadRequestException, Injectable } from '@nestjs/common';
import type { AppUser, UserMedium, UserStatus } from '@edunexa/shared-types';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';

interface RegisterProfileInput {
  fullName?: string;
  email?: string;
  grade?: number;
  medium?: UserMedium | string;
}

@Injectable()
export class AuthService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async verifyToken(token: string): Promise<{ accessToken: string; user: AppUser }> {
    if (!token) {
      throw new BadRequestException('Firebase token is required.');
    }

    const decoded = await this.firebaseAdminService.verifyToken(token);
    const user = await this.firebaseAdminService.upsertUserProfile(decoded);

    return {
      accessToken: token,
      user,
    };
  }

  async registerProfile(token: string, input: RegisterProfileInput): Promise<{ user: AppUser }> {
    if (!token) {
      throw new BadRequestException('Firebase token is required.');
    }

    const decoded = await this.firebaseAdminService.verifyToken(token);
    const uid = decoded.uid;

    const safeInput = {
      fullName: String(input.fullName ?? decoded.name ?? decoded.email?.split('@')[0] ?? 'EduNexa user').trim(),
      email: String(input.email ?? decoded.email ?? `${uid}@placeholder.local`).trim().toLowerCase(),
      grade: Number.isFinite(input.grade) ? Number(input.grade) : 0,
      medium: this.firebaseAdminService.normalizeMedium(input.medium as string | undefined),
    };

    const user = await this.firebaseAdminService.createOrUpdateStudentProfile(decoded, {
      fullName: safeInput.fullName,
      email: safeInput.email,
      grade: safeInput.grade,
      medium: safeInput.medium,
      status: 'active' as UserStatus,
    });

    return { user };
  }

  async getCurrentUserProfile(token: string): Promise<AppUser> {
    if (!token) {
      throw new BadRequestException('Firebase token is required.');
    }

    const decoded = await this.firebaseAdminService.verifyToken(token);
    const user = await this.firebaseAdminService.getUserProfile(decoded.uid);

    if (!user) {
      throw new BadRequestException('Profile not found.');
    }

    return user;
  }

  async changePasswordStatus(uid: string, update: { mustChangePassword?: boolean }): Promise<AppUser> {
    const current = await this.firebaseAdminService.getUserProfile(uid);

    if (!current) {
      throw new BadRequestException('User profile not found.');
    }

    const nextProfile = await this.firebaseAdminService.updateUserProfile(uid, {
      mustChangePassword: update.mustChangePassword === false ? false : current.mustChangePassword ?? false,
    });

    return nextProfile;
  }
}
