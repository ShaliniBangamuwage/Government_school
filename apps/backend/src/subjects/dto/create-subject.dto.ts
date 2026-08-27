export class CreateSubjectDto {
  name!: string;
  description?: string;
  grade!: number;
  medium!: 'Sinhala' | 'Tamil' | 'English';
  iconName?: string;
}
