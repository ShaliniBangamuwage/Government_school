import { fetchWithAuth } from '@/lib/api/client';

export type TextbookMedium = 'Sinhala' | 'Tamil' | 'English';
export type TextbookStream = 'biological-science' | 'physical-science' | 'commerce' | 'arts' | 'technology' | 'common' | 'vocational';
export type TextbookType = 'textbook' | 'resource-book' | 'workbook' | 'practical-handbook' | 'teacher-guide' | 'supplementary-reader';
export type TextbookVerificationStatus = 'pending' | 'verified' | 'broken' | 'archived';
export type TextbookHostingMode = 'official-link' | 'firebase-storage';
export type TextbookHostingPermission = 'link-only' | 'pending' | 'confirmed';

export interface TextbookRecord {
  id: string;
  subjectId?: string;
  title: string;
  subjectSlug: string;
  grade: number;
  medium: TextbookMedium;
  stream?: TextbookStream | null;
  bookType: TextbookType;
  part?: string;
  syllabusYear?: number;
  editionYear?: number;
  officialPageUrl?: string;
  officialFileUrl?: string;
  sourceDomain?: string;
  hostingMode: TextbookHostingMode;
  hostingPermission: TextbookHostingPermission;
  verificationStatus: TextbookVerificationStatus;
  isActive: boolean;
  lastVerifiedAt?: string | null;
  lastCheckedAt?: string | null;
  fileSizeBytes?: number;
  coverImageUrl?: string;
  downloadCount?: number;
  createdBy?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TextbookFilters {
  grade?: number | 'all';
  medium?: TextbookMedium | 'all';
  subjectId?: string;
  subjectSlug?: string;
  stream?: TextbookStream | 'all';
  bookType?: TextbookType | 'all';
  verificationStatus?: TextbookVerificationStatus | 'all';
}

export interface TextbookPayload {
  title: string;
  subjectId?: string;
  subjectSlug: string;
  grade: number;
  medium: TextbookMedium;
  stream?: TextbookStream | null;
  bookType: TextbookType;
  part?: string;
  syllabusYear?: number;
  editionYear?: number;
  officialPageUrl?: string;
  officialFileUrl?: string;
  sourceDomain?: string;
  hostingMode?: TextbookHostingMode;
  hostingPermission?: TextbookHostingPermission;
  verificationStatus?: TextbookVerificationStatus;
  isActive?: boolean;
  coverImageUrl?: string;
  fileSizeBytes?: number;
}

export async function fetchTextbooks(filters: TextbookFilters = {}): Promise<TextbookRecord[]> {
  const params = new URLSearchParams();
  if (filters.grade && filters.grade !== 'all') params.set('grade', String(filters.grade));
  if (filters.medium && filters.medium !== 'all') params.set('medium', filters.medium);
  if (filters.subjectId) params.set('subjectId', filters.subjectId);
  if (filters.subjectSlug) params.set('subjectSlug', filters.subjectSlug);
  if (filters.stream && filters.stream !== 'all') params.set('stream', filters.stream);
  if (filters.bookType && filters.bookType !== 'all') params.set('bookType', filters.bookType);
  if (filters.verificationStatus && filters.verificationStatus !== 'all') params.set('verificationStatus', filters.verificationStatus);

  const query = params.toString();
  const response = await fetchWithAuth<{ items?: TextbookRecord[]; textbooks?: TextbookRecord[] }>(`/api/textbooks${query ? `?${query}` : ''}`);
  return response.items ?? response.textbooks ?? [];
}

export async function createTextbook(payload: TextbookPayload): Promise<TextbookRecord> {
  const response = await fetchWithAuth<{ textbook?: TextbookRecord }>('/api/admin/textbooks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.textbook ?? null as never;
}

export async function updateTextbook(id: string, payload: Partial<TextbookPayload>): Promise<TextbookRecord> {
  const response = await fetchWithAuth<{ textbook?: TextbookRecord }>(`/api/admin/textbooks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.textbook ?? null as never;
}

export async function updateTextbookVerification(id: string, verificationStatus: TextbookVerificationStatus): Promise<TextbookRecord> {
  const response = await fetchWithAuth<{ textbook?: TextbookRecord }>(`/api/admin/textbooks/${id}/verification`, {
    method: 'PATCH',
    body: JSON.stringify({ verificationStatus }),
  });
  return response.textbook ?? null as never;
}
