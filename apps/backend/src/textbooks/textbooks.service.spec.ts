import * as admin from 'firebase-admin';
import { TextbooksService } from './textbooks.service';
import { TextbookDownloadService } from './textbook-download.service';

describe('TextbooksService', () => {
  let service: TextbooksService;

  beforeEach(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: 'demo-project' });
    }

    service = new TextbooksService({} as TextbookDownloadService);
    jest.restoreAllMocks();
  });

  it('listTextbooks does not require a composite index and keeps only verified active books', async () => {
    const getSpy = jest.fn().mockResolvedValue({
      docs: [
        { id: 'b1', data: () => ({ title: 'Verified Book', subjectId: 'math', grade: 6, medium: 'English', verificationStatus: 'verified', isActive: true, updatedAt: { toDate: () => new Date('2024-03-01T00:00:00Z') }, archived: false }) },
        { id: 'b2', data: () => ({ title: 'Draft Book', subjectId: 'math', grade: 6, medium: 'English', verificationStatus: 'draft', isActive: true, updatedAt: { toDate: () => new Date('2024-04-01T00:00:00Z') }, archived: false }) },
        { id: 'b3', data: () => ({ title: 'Inactive Book', subjectId: 'math', grade: 6, medium: 'English', verificationStatus: 'verified', isActive: false, updatedAt: { toDate: () => new Date('2024-05-01T00:00:00Z') }, archived: false }) },
        { id: 'b4', data: () => ({ title: 'Archived Book', subjectId: 'math', grade: 6, medium: 'English', verificationStatus: 'verified', isActive: true, updatedAt: { toDate: () => new Date('2024-06-01T00:00:00Z') }, archived: true }) },
        { id: 'b5', data: () => ({ title: 'Legacy Verified', subjectId: 'math', grade: 6, medium: 'English', verified: true, isActive: true, updatedAt: { toDate: () => new Date('2024-07-01T00:00:00Z') }, archived: false }) },
      ],
    });

    const collectionSpy = jest.spyOn(admin.firestore(), 'collection').mockReturnValue({ get: getSpy } as any);

    const result = await service.listTextbooks();

    expect(collectionSpy).toHaveBeenCalledWith('textbooks');
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(result.map((book) => book.title)).toEqual(['Legacy Verified', 'Verified Book']);
  });

  it('supports legacy verified=true records and ignores missing updatedAt safely', async () => {
    const getSpy = jest.fn().mockResolvedValue({
      docs: [
        { id: 'legacy', data: () => ({ title: 'Legacy', subjectId: 'bio', grade: 11, medium: 'English', verified: true, isActive: true, archived: false }) },
        { id: 'no-date', data: () => ({ title: 'No Date', subjectId: 'bio', grade: 11, medium: 'English', verificationStatus: 'verified', isActive: true, archived: false }) },
      ],
    });

    jest.spyOn(admin.firestore(), 'collection').mockReturnValue({ get: getSpy } as any);

    await expect(service.listTextbooks()).resolves.toHaveLength(2);
    const titles = (await service.listTextbooks()).map((book) => book.title);
    expect(titles).toContain('Legacy');
    expect(titles).toContain('No Date');
  });

  it('returns an empty list when the collection is empty', async () => {
    jest.spyOn(admin.firestore(), 'collection').mockReturnValue({ get: jest.fn().mockResolvedValue({ docs: [] }) } as any);

    await expect(service.listTextbooks()).resolves.toEqual([]);
  });
});
