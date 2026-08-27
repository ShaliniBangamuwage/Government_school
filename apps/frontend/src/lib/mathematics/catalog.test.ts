import { describe, expect, it } from 'vitest';
import { getDefaultStudentGrade, getDefaultStudentMedium, resolveMathematicsMedium } from './catalog';

describe('mathematics catalog helpers', () => {
  it('defaults to the saved profile grade and medium', () => {
    expect(getDefaultStudentGrade({ grade: 9 })).toBe(9);
    expect(getDefaultStudentMedium({ medium: 'Tamil' })).toBe('Tamil');
  });

  it('keeps a temporary medium choice separate from the saved profile medium', () => {
    const saved = 'English';
    expect(resolveMathematicsMedium(saved, 'Sinhala')).toBe('Sinhala');
    expect(resolveMathematicsMedium(saved, null)).toBe('English');
  });
});
