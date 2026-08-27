import { describe, expect, it, jest } from '@jest/globals';

declare const describe: any;
declare const expect: any;
declare const it: any;

import * as admin from 'firebase-admin';
import { FirebaseAdminService } from './firebase-admin.service';

describe('FirebaseAdminService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves createdAt for existing profiles and only updates updatedAt on later writes', async () => {
    const service = new FirebaseAdminService();
    const createdAt = { iso: '2024-01-01T00:00:00.000Z' };
    const updatedAt = { iso: '2024-01-02T00:00:00.000Z' };
    const setSpy = jest.fn().mockResolvedValue(undefined);

    const serverTimestampMock = jest.spyOn(admin.firestore.FieldValue, 'serverTimestamp');
    serverTimestampMock.mockReturnValue(updatedAt as any);

    jest.spyOn(service as any, 'getApp').mockReturnValue({
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            set: setSpy,
          }),
        }),
      }),
    } as any);

    jest.spyOn(service, 'getUserProfile' as any).mockResolvedValue({
      id: 'uid-1',
      uid: 'uid-1',
      fullName: 'Ava Student',
      displayName: 'Ava Student',
      email: 'ava@example.com',
      role: 'student',
      status: 'active',
      medium: 'English',
      emailVerified: true,
      onboardingCompleted: false,
      createdAt,
      updatedAt: { iso: '2024-01-02T00:00:00.000Z' },
    } as any);

    const decoded = { uid: 'uid-1', email: 'ava@example.com', email_verified: true } as admin.auth.DecodedIdToken;

    await service.createOrUpdateStudentProfile(decoded, {
      fullName: 'Ava Student',
      email: 'ava@example.com',
      grade: 10,
      medium: 'English',
    });

    expect(setSpy).toHaveBeenCalledTimes(1);
    const documentData = setSpy.mock.calls[0][0];
    expect(documentData.createdAt).toBe(createdAt);
    expect(documentData.updatedAt).toBe(updatedAt);
    expect(serverTimestampMock).toHaveBeenCalledTimes(1);
  });

  it('sets createdAt from serverTimestamp only when creating a new profile', async () => {
    const service = new FirebaseAdminService();
    const setSpy = jest.fn().mockResolvedValue(undefined);
    const createdStamp = { stamp: 'created' };
    const updatedStamp = { stamp: 'updated' };

    const serverTimestampMock = jest.spyOn(admin.firestore.FieldValue, 'serverTimestamp');
    serverTimestampMock.mockReturnValueOnce(createdStamp as any).mockReturnValueOnce(updatedStamp as any);

    jest.spyOn(service as any, 'getApp').mockReturnValue({
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            set: setSpy,
          }),
        }),
      }),
    } as any);

    jest.spyOn(service, 'getUserProfile' as any).mockResolvedValue(null);

    const decoded = { uid: 'uid-2', email: 'beth@example.com', email_verified: true } as admin.auth.DecodedIdToken;

    await service.createOrUpdateStudentProfile(decoded, {
      fullName: 'Beth Student',
      email: 'beth@example.com',
      grade: 11,
      medium: 'Sinhala',
    });

    const documentData = setSpy.mock.calls[0][0];
    expect(documentData.createdAt).toBe(createdStamp);
    expect(documentData.updatedAt).toBe(updatedStamp);
    expect(serverTimestampMock).toHaveBeenCalledTimes(2);
  });

  it('normalizes legacy medium aliases and preserves a student profile grade and medium', async () => {
    const service = new FirebaseAdminService();
    const setSpy = jest.fn().mockResolvedValue(undefined);

    jest.spyOn(service as any, 'getApp').mockReturnValue({
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            set: setSpy,
          }),
        }),
      }),
    } as any);

    jest.spyOn(service, 'getUserProfile' as any).mockResolvedValue({
      id: 'uid-3',
      uid: 'uid-3',
      fullName: 'Carmen Student',
      displayName: 'Carmen Student',
      email: 'carmen@example.com',
      role: 'student',
      status: 'active',
      grade: 9,
      medium: 'Sinhala',
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: { iso: '2024-01-01T00:00:00.000Z' },
      updatedAt: { iso: '2024-01-02T00:00:00.000Z' },
    } as any);

    const decoded = { uid: 'uid-3', email: 'carmen@example.com', email_verified: true } as admin.auth.DecodedIdToken;
    await service.createOrUpdateStudentProfile(decoded, {
      fullName: 'Carmen Student',
      email: 'carmen@example.com',
      grade: 9,
      medium: 'EM',
    });

    expect(service.normalizeMedium('english')).toBe('English');
    expect(service.normalizeMedium('sinhala')).toBe('Sinhala');
    expect(service.normalizeMedium('tamil')).toBe('Tamil');
    expect(service.normalizeMedium('EM')).toBe('English');
    expect(service.normalizeMedium('SM')).toBe('Sinhala');
    expect(service.normalizeMedium('TM')).toBe('Tamil');

    const documentData = setSpy.mock.calls[0][0];
    expect(documentData.role).toBe('student');
    expect(documentData.grade).toBe(9);
    expect(documentData.medium).toBe('English');
  });
});
