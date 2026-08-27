export type CurriculumMedium = 'sinhala' | 'tamil' | 'english';

export interface CurriculumOfferingRecord {
  id: string;
  subjectId: string;
  subjectName?: string;
  grade: number;
  medium: CurriculumMedium;
  stream?: string;
  accessEnabled: boolean;
  source: 'e-thaksalawa' | 'edupub' | 'nie' | 'manual';
  sourceUrl?: string;
  reviewStatus: 'approved' | 'needs-review' | 'rejected';
  confidence: 'verified' | 'review-needed' | 'uncertain';
  syllabusVersion?: string;
  updatedAt?: string;
  updatedBy?: string;
}
