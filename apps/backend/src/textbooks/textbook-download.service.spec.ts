import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { TextbookDownloadService } from './textbook-download.service';

describe('TextbookDownloadService', () => {
  let service: TextbookDownloadService;

  beforeEach(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: 'demo-project' });
    }

    service = new TextbookDownloadService();
    jest.restoreAllMocks();
  });

  it('rejects unverified textbooks', async () => {
    await expect(service.assertDownloadAllowed({
      id: 't1',
      title: 'Test',
      grade: 6,
      medium: 'English',
      subjectSlug: 'mathematics',
      bookType: 'textbook',
      hostingMode: 'official-link',
      hostingPermission: 'link-only',
      verificationStatus: 'pending',
      isActive: true,
      officialFileUrl: 'https://edupub.gov.lk/files/test.pdf',
    } as any)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects archived textbooks', async () => {
    await expect(service.assertDownloadAllowed({
      id: 't1',
      title: 'Test',
      grade: 6,
      medium: 'English',
      subjectSlug: 'mathematics',
      bookType: 'textbook',
      hostingMode: 'official-link',
      hostingPermission: 'link-only',
      verificationStatus: 'verified',
      isActive: false,
      officialFileUrl: 'https://edupub.gov.lk/files/test.pdf',
    } as any)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects malicious external URLs and local/private addresses', async () => {
    await expect(service.validateOfficialUrl('https://example.com/malicious')).resolves.toBeNull();
    await expect(service.validateOfficialUrl('https://localhost/test.pdf')).resolves.toBeNull();
    await expect(service.validateOfficialUrl('https://127.0.0.1/test.pdf')).resolves.toBeNull();
    await expect(service.validateOfficialUrl('https://192.168.1.10/test.pdf')).resolves.toBeNull();
  });

  it('accepts valid official HTTPS domains', async () => {
    await expect(service.validateOfficialUrl('https://edupub.gov.lk/files/test.pdf')).resolves.toContain('https://edupub.gov.lk/files/test.pdf');
    await expect(service.validateOfficialUrl('https://www.nie.lk/resources/test.pdf')).resolves.toContain('https://www.nie.lk/resources/test.pdf');
  });

  it('throws when the textbook does not exist on download logging', async () => {
    const docRef = { get: jest.fn().mockResolvedValue({ exists: false }) };
    jest.spyOn(admin.firestore(), 'collection').mockReturnValue({
      doc: jest.fn().mockReturnValue(docRef),
    } as any);

    await expect(service.recordDownload('missing-book')).rejects.toThrow(NotFoundException);
  });

  it('increments the download count atomically for known textbooks', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const docRef = {
      get: jest.fn().mockResolvedValue({ exists: true }),
      update,
    };
    const downloadDocRef = { set: jest.fn().mockResolvedValue(undefined) };
    const collectionSpy = jest.spyOn(admin.firestore(), 'collection');

    collectionSpy.mockImplementation((name: string) => {
      if (name === 'textbooks') {
        return { doc: jest.fn().mockReturnValue(docRef) } as any;
      }
      if (name === 'textbookDownloads') {
        return { doc: jest.fn().mockReturnValue(downloadDocRef) } as any;
      }
      return { doc: jest.fn() } as any;
    });

    await expect(service.recordDownload('book-1')).resolves.toBeUndefined();
    expect(update).toHaveBeenCalled();
  });
});
