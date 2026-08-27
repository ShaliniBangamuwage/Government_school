export class UpdateSubjectDto {
  name?: string;
  description?: string;
  grade?: number;
  medium?: 'Sinhala' | 'Tamil' | 'English';
  iconName?: string;
  status?: 'active' | 'archived';
  assignedTeacherIds?: string[];
}
