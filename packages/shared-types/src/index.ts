export type UserRole = 'student' | 'teacher' | 'reviewer' | 'admin';
export type UserMedium = 'Sinhala' | 'Tamil' | 'English';
export type UserStatus = 'active' | 'disabled' | 'suspended';
export type SubjectStatus = 'active' | 'archived';

export interface AppUser {
  id: string;
  uid: string;
  fullName: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  grade?: number;
  medium?: UserMedium;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  mustChangePassword?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SafeUserProfile {
  id: string;
  uid: string;
  fullName: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  grade?: number;
  medium?: UserMedium;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuthenticatedRequestUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  role: UserRole;
  profile: AppUser | null;
}

export interface DashboardSummary {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  activeUsers: number;
  suspendedUsers: number;
  totalSubjects: number;
  activeSubjects: number;
  archivedSubjects: number;
  totalTextbooks: number;
  pendingContentReviews: number;
  recentUsers: SafeUserProfile[];
}

export interface UserFilters {
  search?: string;
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  limit?: number;
  cursor?: string;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  grade: number;
  medium: UserMedium;
  iconName?: string;
  status: SubjectStatus;
  assignedTeacherIds: string[];
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CreateSubjectInput {
  name: string;
  description?: string;
  grade: number;
  medium: UserMedium;
  iconName?: string;
}

export interface UpdateSubjectInput {
  name?: string;
  description?: string;
  grade?: number;
  medium?: UserMedium;
  iconName?: string;
  status?: SubjectStatus;
  assignedTeacherIds?: string[];
}

export interface AssignSubjectTeachersInput {
  teacherIds: string[];
}

export interface SubjectFilters {
  search?: string;
  grade?: number;
  medium?: UserMedium;
  status?: SubjectStatus | 'all';
  assignedToUid?: string;
  limit?: number;
  cursor?: string;
}

export interface CurriculumSubject {
  id: string;
  canonicalName: string;
  normalizedKey: string;
  names: Record<string, string>;
  officialSourceUrls: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CurriculumOffering {
  id: string;
  subjectId: string;
  grade: number;
  medium: UserMedium;
  stream?: TextbookStream;
  syllabusVersion?: string;
  accessEnabled: boolean;
  source: 'e-thaksalawa' | 'edupub' | 'nie' | 'manual';
  sourceUrl?: string;
  confidence: 'verified' | 'review-needed' | 'uncertain';
  reviewStatus: 'approved' | 'needs-review' | 'rejected';
  createdAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface PaginatedSubjectsResponse {
  items: Subject[];
  total: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface CreateSubjectDto extends CreateSubjectInput {}

export interface UpdateSubjectDto extends UpdateSubjectInput {}

export interface SubjectListQuery {
  search?: string;
  grade?: number;
  medium?: UserMedium;
  status?: SubjectStatus | 'all';
}

export type EducationMedium = 'Sinhala' | 'Tamil' | 'English';
export type TextbookMedium = EducationMedium;
export type TextbookStream =
  | null
  | 'biological-science'
  | 'physical-science'
  | 'commerce'
  | 'arts'
  | 'technology'
  | 'common'
  | 'vocational';
export type TextbookResourceType =
  | 'textbook'
  | 'pupil-book'
  | 'workbook'
  | 'reading-book'
  | 'activity-book'
  | 'practical-book';
export type TextbookType = TextbookResourceType | 'resource-book' | 'practical-handbook' | 'teacher-guide' | 'supplementary-reader';
export type HostingPermission = 'link-only' | 'confirmed' | 'pending';
export type TextbookHostingMode = 'official-link' | 'firebase-storage';
export type TextbookHostingPermission = HostingPermission;
export type TextbookVerificationStatus = 'pending' | 'verified' | 'broken' | 'archived';

export interface TextbookChapter {
  chapterNumber: number | null;
  chapterTitle: string | null;
  officialPdfUrl: string;
  verified: boolean;
}

export interface TextbookUnit {
  id: string;
  textbookId: string;
  title: string;
  summary?: string;
  unitNumber?: number;
  sourcePageUrl?: string;
  sourceText?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Textbook {
  id: string;
  sourceId?: string;
  bookId?: string;
  subjectId?: string;
  title: string;
  officialTitle?: string;
  normalizedTitle?: string;
  subjectSlug: string;
  subject?: string;
  grade: number;
  gradeRange?: number[] | null;
  medium: TextbookMedium;
  stream?: TextbookStream | string | null;
  bookType: TextbookType;
  resourceType?: TextbookResourceType;
  part?: string | null;
  syllabusYear?: number;
  editionYear?: number;
  officialPageUrl?: string;
  officialCatalogUrl?: string;
  officialFileUrl?: string;
  officialPdfUrl?: string | null;
  sourceDomain?: string;
  sourceAuthority?: 'Educational Publications Department, Sri Lanka';
  hostingMode: TextbookHostingMode;
  hostingPermission: TextbookHostingPermission;
  verificationStatus: TextbookVerificationStatus;
  verified?: boolean;
  accessEnabled?: boolean;
  isActive: boolean;
  lastVerifiedAt?: unknown;
  lastCheckedAt?: unknown;
  verificationMethod?: string;
  lastVerifiedDate?: string;
  fileSizeBytes?: number;
  coverImageUrl?: string;
  downloadCount?: number;
  lastDownloadedAt?: string | null;
  chapters?: TextbookChapter[];
  assignedTeacherIds?: string[];
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TextbookFilters {
  search?: string;
  grade?: number;
  medium?: TextbookMedium | 'all';
  subjectId?: string;
  subjectSlug?: string;
  stream?: TextbookStream | 'all';
  bookType?: TextbookType | 'all';
  verificationStatus?: TextbookVerificationStatus | 'all';
  limit?: number;
  cursor?: string;
}

export interface PaginatedTextbooksResponse {
  items: Textbook[];
  total: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface TextbookCoverageSummary {
  totalTextbooks: number;
  verifiedTextbooks: number;
  pendingTextbooks: number;
  brokenTextbooks: number;
  byGrade: Record<string, number>;
  byMedium: Record<TextbookMedium, number>;
  byStream: Record<string, number>;
}

export interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'pdf' | 'worksheet' | 'link';
  url?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  subjectId?: string;
  questions: Array<{ id: string; prompt: string; maxScore: number; options?: string[]; correctOptionIndex?: number }>; 
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}
