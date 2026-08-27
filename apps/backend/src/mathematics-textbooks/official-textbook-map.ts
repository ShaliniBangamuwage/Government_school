export const MATHEMATICS_TEXTBOOK_URL_BY_GRADE_AND_MEDIUM: Record<string, string> = {
  '6|Sinhala': 'https://www.edupub.gov.lk/images/Mathematics/Grade_6_Sinhala.pdf',
  '6|English': 'https://www.edupub.gov.lk/images/Mathematics/Grade_6_English.pdf',
  '6|Tamil': 'https://www.edupub.gov.lk/images/Mathematics/Grade_6_Tamil.pdf',
  '7|Sinhala': 'https://www.edupub.gov.lk/images/Mathematics/Grade_7_Sinhala.pdf',
  '7|English': 'https://www.edupub.gov.lk/images/Mathematics/Grade_7_English.pdf',
  '7|Tamil': 'https://www.edupub.gov.lk/images/Mathematics/Grade_7_Tamil.pdf',
  '8|Sinhala': 'https://www.edupub.gov.lk/images/Mathematics/Grade_8_Sinhala.pdf',
  '8|English': 'https://www.edupub.gov.lk/images/Mathematics/Grade_8_English.pdf',
  '8|Tamil': 'https://www.edupub.gov.lk/images/Mathematics/Grade_8_Tamil.pdf',
  '9|Sinhala': 'https://www.edupub.gov.lk/images/Mathematics/Grade_9_Sinhala.pdf',
  '9|English': 'https://www.edupub.gov.lk/images/Mathematics/Grade_9_English.pdf',
  '9|Tamil': 'https://www.edupub.gov.lk/images/Mathematics/Grade_9_Tamil.pdf',
  '10|Sinhala': 'https://www.edupub.gov.lk/images/Mathematics/Grade_10_Sinhala.pdf',
  '10|English': 'https://www.edupub.gov.lk/images/Mathematics/Grade_10_English.pdf',
  '10|Tamil': 'https://www.edupub.gov.lk/images/Mathematics/Grade_10_Tamil.pdf',
  '11|Sinhala': 'https://www.edupub.gov.lk/images/Mathematics/Grade_11_Sinhala.pdf',
  '11|English': 'https://www.edupub.gov.lk/images/Mathematics/Grade_11_English.pdf',
  '11|Tamil': 'https://www.edupub.gov.lk/images/Mathematics/Grade_11_Tamil.pdf',
  '12|Sinhala': 'https://www.edupub.gov.lk/images/Mathematics/Grade_12_Sinhala.pdf',
  '12|English': 'https://www.edupub.gov.lk/images/Mathematics/Grade_12_English.pdf',
  '12|Tamil': 'https://www.edupub.gov.lk/images/Mathematics/Grade_12_Tamil.pdf',
  '13|Sinhala': 'https://www.edupub.gov.lk/images/Mathematics/Grade_13_Sinhala.pdf',
  '13|English': 'https://www.edupub.gov.lk/images/Mathematics/Grade_13_English.pdf',
  '13|Tamil': 'https://www.edupub.gov.lk/images/Mathematics/Grade_13_Tamil.pdf',
};

export const SUPPORTED_MATHEMATICS_GRADES = [6, 7, 8, 9, 10, 11, 12, 13] as const;
export const SUPPORTED_MATHEMATICS_MEDIA = ['Sinhala', 'English', 'Tamil'] as const;

export function normalizeMathematicsMedium(medium: string): 'Sinhala' | 'English' | 'Tamil' {
  const normalized = String(medium ?? '').trim();
  const lowered = normalized.toLowerCase();

  if (lowered === 'sinhala') return 'Sinhala';
  if (lowered === 'english') return 'English';
  if (lowered === 'tamil') return 'Tamil';

  return 'English';
}

export function getOfficialMathematicsTextbookPdfUrl(grade: number, medium: string): string {
  const normalizedGrade = Number(grade);
  const normalizedMedium = normalizeMathematicsMedium(medium);
  const key = `${normalizedGrade}|${normalizedMedium}`;
  const url = MATHEMATICS_TEXTBOOK_URL_BY_GRADE_AND_MEDIUM[key];

  if (!url) {
    throw new Error(`No official Mathematics textbook PDF URL is configured for Grade ${normalizedGrade} ${normalizedMedium}.`);
  }

  return url;
}
