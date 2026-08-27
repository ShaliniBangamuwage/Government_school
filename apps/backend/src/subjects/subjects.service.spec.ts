import { BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { SubjectsService } from './subjects.service';

describe('SubjectsService', () => {
  let service: SubjectsService;

  beforeEach(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: 'demo-project' });
    }

    service = new SubjectsService();
    jest.restoreAllMocks();
  });

  it('allows admin to create a subject', async () => {
    const subjectRef = { set: jest.fn().mockResolvedValue(undefined) };
    const collectionSpy = jest.spyOn(admin.firestore(), 'collection').mockImplementation((name: string) => {
      if (name === 'subjects') {
        const query = {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          }),
        };

        return {
          doc: () => ({ id: 'subject-1', set: subjectRef.set }),
          where: jest.fn().mockReturnValue(query),
        } as any;
      }

      if (name === 'auditLogs') {
        return {
          doc: () => ({ set: jest.fn().mockResolvedValue(undefined) }),
        } as any;
      }

      return {} as any;
    });

    const result = await service.createSubject('admin-uid', 'admin@edunexa.app', {
      name: 'Grade 6 Mathematics',
      grade: 6,
      medium: 'English',
      description: 'Foundation mathematics',
    });

    expect(result.name).toBe('Grade 6 Mathematics');
    expect(collectionSpy).toHaveBeenCalled();
  });

  it('rejects duplicate grade/medium/slug combinations', async () => {
    jest.spyOn(admin.firestore(), 'collection').mockImplementation((name: string) => {
      if (name === 'subjects') {
        const query = {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ empty: false, docs: [{ id: 'existing' }] }),
          }),
        };

        return {
          where: jest.fn().mockReturnValue(query),
        } as any;
      }
      return {} as any;
    });

    await expect(service.createSubject('admin-uid', 'admin@edunexa.app', {
      name: 'Grade 6 Mathematics',
      grade: 6,
      medium: 'English',
    })).rejects.toThrow(BadRequestException);
  });

  it('allows admins to edit a subject', async () => {
    const setSpy = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(admin.firestore(), 'collection').mockImplementation((name: string) => {
      if (name === 'subjects') {
        const query = {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          }),
        };

        return {
          doc: () => ({
            get: jest.fn().mockResolvedValue({ exists: true, id: 'subject-1', data: () => ({ id: 'subject-1', name: 'Old Name', slug: '6-english-old-name', grade: 6, medium: 'English', status: 'active', assignedTeacherIds: [], createdBy: 'admin-uid', description: 'old', updatedAt: new Date().toISOString() }) }),
            set: setSpy,
          }),
          where: jest.fn().mockReturnValue(query),
        } as any;
      }
      if (name === 'auditLogs') {
        return {
          doc: () => ({ set: jest.fn().mockResolvedValue(undefined) }),
        } as any;
      }
      return {} as any;
    });

    const updated = await service.updateSubject('admin-uid', 'admin@edunexa.app', 'subject-1', {
      name: 'Updated Mathematics',
      description: 'Updated description',
    });

    expect(updated.name).toBe('Updated Mathematics');
    expect(setSpy).toHaveBeenCalled();
  });

  it('listPublicSubjects does not require a composite index and filters active subjects in app code', async () => {
    const getSpy = jest.fn().mockResolvedValue({
      docs: [
        { id: 's1', data: () => ({ name: 'Science', slug: 'science', grade: 6, medium: 'English', status: 'active', updatedAt: { toDate: () => new Date('2024-03-01T00:00:00Z') } }) },
        { id: 's2', data: () => ({ name: 'Inactive', slug: 'inactive', grade: 7, medium: 'English', status: 'archived', updatedAt: { toDate: () => new Date('2024-04-01T00:00:00Z') } }) },
        { id: 's3', data: () => ({ name: 'Missing status', slug: 'missing-status', grade: 8, medium: 'English', updatedAt: { toDate: () => new Date('2024-05-01T00:00:00Z') } }) },
      ],
    });

    const collectionSpy = jest.spyOn(admin.firestore(), 'collection').mockReturnValue({
      get: getSpy,
    } as any);

    const result = await service.listPublicSubjects();

    expect(collectionSpy).toHaveBeenCalledWith('subjects');
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(result.map((subject) => subject.name)).toEqual([]);
  });
});
