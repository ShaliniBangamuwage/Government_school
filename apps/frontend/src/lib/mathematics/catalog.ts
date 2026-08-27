export type MathematicsMedium = 'Sinhala' | 'Tamil' | 'English';
export type MathematicsGrade = 6 | 7 | 8 | 9 | 10 | 11;

export const MATHEMATICS_GRADES: MathematicsGrade[] = [6, 7, 8, 9, 10, 11];
export const MATHEMATICS_MEDIA: MathematicsMedium[] = ['Sinhala', 'Tamil', 'English'];

export function getDefaultStudentGrade(profile?: { grade?: number | null } | null): number {
  const nextGrade = Number(profile?.grade ?? 6);
  return MATHEMATICS_GRADES.includes(nextGrade as MathematicsGrade) ? nextGrade : 6;
}

export function getDefaultStudentMedium(profile?: { medium?: string | null } | null): MathematicsMedium {
  const nextMedium = String(profile?.medium ?? 'English');
  return MATHEMATICS_MEDIA.includes(nextMedium as MathematicsMedium) ? (nextMedium as MathematicsMedium) : 'English';
}

export function resolveMathematicsMedium(savedMedium?: string | null, selectedMedium?: string | null): MathematicsMedium {
  if (selectedMedium && MATHEMATICS_MEDIA.includes(selectedMedium as MathematicsMedium)) {
    return selectedMedium as MathematicsMedium;
  }

  return getDefaultStudentMedium({ medium: savedMedium ?? 'English' });
}
