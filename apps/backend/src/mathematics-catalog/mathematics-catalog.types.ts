export type MathematicsMedium = 'Sinhala' | 'Tamil' | 'English';
export type MathematicsGrade = 6 | 7 | 8 | 9 | 10 | 11;
export type MathematicsVerificationStatus = 'verified' | 'pending' | 'broken';
export type MathematicsApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface MathematicsOffering {
  id: string;
  subjectId: 'mathematics';
  subjectName: 'Mathematics';
  grade: MathematicsGrade;
  medium: MathematicsMedium;
  studentAccessEnabled: boolean;
  teacherAccessEnabled: boolean;
  textbookAccessEnabled: boolean;
  quizAccessEnabled: boolean;
  simulatorAccessEnabled: boolean;
  verified: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MathematicsTextbookChapter {
  id: string;
  subjectId: 'mathematics';
  subjectName: 'Mathematics';
  grade: MathematicsGrade;
  medium: MathematicsMedium;
  chapterNumber: number;
  chapterTitle: string;
  title: string;
  sourceUrl: string;
  officialCourseUrl: string;
  officialResourceUrl?: string | null;
  resolvedPdfUrl?: string | null;
  sourceDomain: string;
  sourceAuthority: string;
  resourceType: 'textbook-chapter';
  verificationStatus: MathematicsVerificationStatus;
  approvalStatus?: MathematicsApprovalStatus;
  accessEnabled: boolean;
  downloadCount: number;
  lastVerifiedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MathematicsCatalogEntry {
  id: string;
  grade: MathematicsGrade;
  medium: MathematicsMedium;
  title: string;
  sourceUrl: string;
  officialCourseUrl: string;
  officialResourceUrl?: string | null;
  resolvedPdfUrl?: string | null;
  sourceDomain?: string;
  sourceAuthority?: string;
  verificationStatus?: MathematicsVerificationStatus;
}
