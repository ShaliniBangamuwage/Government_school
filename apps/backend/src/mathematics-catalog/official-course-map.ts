export const MATHEMATICS_GRADES = [6, 7, 8, 9, 10, 11] as const;
export const MATHEMATICS_MEDIA = ['Sinhala', 'Tamil', 'English'] as const;

export const MATHEMATICS_OFFICIAL_COURSE_BY_GRADE_AND_MEDIUM: Record<string, string> = {
  '6|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=313',
  '6|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=57',
  '6|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=288',
  '7|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=341',
  '7|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=90',
  '7|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=451',
  '8|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=342',
  '8|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=103',
  '8|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=531',
  '9|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=339',
  '9|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=150',
  '9|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=817',
  '10|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=380',
  '10|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=247',
  '10|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=842',
  '11|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=435',
  '11|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=200',
  '11|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=799',
};

export function normalizeMathematicsMedium(value?: string): 'Sinhala' | 'Tamil' | 'English' {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return 'English';
  }

  const lookup = normalized.toLowerCase();
  if (lookup === 'sinhala' || lookup === 'si' || lookup === 'sm') {
    return 'Sinhala';
  }
  if (lookup === 'tamil' || lookup === 'ta' || lookup === 'tm') {
    return 'Tamil';
  }
  return 'English';
}

export function getOfficialCourseUrlForGradeAndMedium(grade: number, medium?: string): string {
  const normalizedMedium = normalizeMathematicsMedium(medium);
  const key = `${Number(grade)}|${normalizedMedium}`;
  return MATHEMATICS_OFFICIAL_COURSE_BY_GRADE_AND_MEDIUM[key] ?? `https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=${grade}`;
}
