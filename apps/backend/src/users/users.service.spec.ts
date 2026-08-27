import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { UsersService } from './users.service';

beforeEach(() => {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'demo-project' });
  }
});

describe('UsersService', () => {
  let service: UsersService;
  let firebaseAdminService: FirebaseAdminService;

  beforeEach(() => {
    firebaseAdminService = new FirebaseAdminService();
    service = new UsersService(firebaseAdminService);
    jest.restoreAllMocks();
  });

  it('rejects student role assignments through the staff creation flow', async () => {
    const createUserSpy = jest.spyOn(admin.auth(), 'createUser');

    await expect(
      service.createStaffUser({
        fullName: 'Student User',
        email: 'student@example.com',
        password: 'Password123',
        role: 'student',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(createUserSpy).not.toHaveBeenCalled();
  });

  it('writes an audit log whenever a privileged user is updated', async () => {
    const setSpy = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(firebaseAdminService, 'getUserProfile').mockResolvedValue({
      id: 'uid-1',
      uid: 'uid-1',
      fullName: 'Ada',
      displayName: 'Ada',
      email: 'ada@example.com',
      role: 'teacher',
      status: 'active',
      emailVerified: true,
      onboardingCompleted: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    jest.spyOn(firebaseAdminService, 'updateUserProfile').mockResolvedValue({
      id: 'uid-1',
      uid: 'uid-1',
      fullName: 'Ada',
      displayName: 'Ada',
      email: 'ada@example.com',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      onboardingCompleted: true,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    jest.spyOn(admin.firestore(), 'collection').mockReturnValue({
      doc: () => ({ set: setSpy }),
    } as any);
    jest.spyOn(admin.auth(), 'setCustomUserClaims').mockResolvedValue(undefined as any);

    await service.updateUser('uid-1', { role: 'admin' });

    expect(setSpy).toHaveBeenCalled();
  });
});
