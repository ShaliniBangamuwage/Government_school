import { MathematicsTextbookService } from './mathematics-textbook.service';

describe('MathematicsTextbookService', () => {
  it('rejects HTML pages and non-200 responses for textbook PDFs', async () => {
    const service = new MathematicsTextbookService({ generate: jest.fn() } as any);

    await expect(service.validatePdfResponse({ status: 200, headers: { 'content-type': 'text/html' }, buffer: Buffer.from('<html>bad</html>') } as any)).rejects.toThrow('PDF');
    await expect(service.validatePdfResponse({ status: 500, headers: { 'content-type': 'application/pdf' }, buffer: Buffer.from('%PDF-1.4\n') } as any)).rejects.toThrow('status 200');
  });

  it('extracts chapter titles from textbook text for Grade 9 and Grade 10 fixtures', () => {
    const service = new MathematicsTextbookService({ generate: jest.fn() } as any);

    const grade9Text = `Table of Contents\nChapter 1: Set Theory\nChapter 2: Algebraic Expressions\nChapter 3: Geometry\n`;
    const grade10Text = `Unit 1: Real Numbers\nUnit 2: Linear Equations\nUnit 3: Trigonometry\n`;

    const grade9 = service.extractLessonTitles(grade9Text, 9, 'English');
    const grade10 = service.extractLessonTitles(grade10Text, 10, 'Tamil');

    expect(grade9).toContain('Set Theory');
    expect(grade9).toContain('Algebraic Expressions');
    expect(grade10).toContain('Linear Equations');
    expect(grade10).toContain('Trigonometry');
  });

  it('does not return default or hardcoded lesson names when a textbook is unavailable', async () => {
    const service = new MathematicsTextbookService({ generate: jest.fn() } as any);

    const result = await service.getLessonsForGradeAndMedium(99, 'English');

    expect(result.lessons).toEqual([]);
    expect(result.unavailableReason).toBeTruthy();
    expect(result.unavailableReason).not.toMatch(/sample|fallback|default|generic/i);
  });

  it('validates that generated quizzes always have exactly 10 MCQs with four options each', () => {
    const service = new MathematicsTextbookService({ generate: jest.fn() } as any);

    const validQuiz = Array.from({ length: 10 }, (_, index) => ({
      question: `Question ${index + 1}`,
      options: ['A', 'B', 'C', 'D'],
      correctAnswerIndex: index % 4,
      explanation: 'Reason',
      sourceLessonTitle: 'Chapter 1',
      sourcePages: '1-2',
    }));

    expect(() => service.validateGeneratedQuiz(validQuiz as any)).not.toThrow();
    expect(() => service.validateGeneratedQuiz([{ question: 'Only one', options: ['A', 'B', 'C'], correctAnswerIndex: 1, explanation: 'x', sourceLessonTitle: 'T', sourcePages: '1-2' }] as any)).toThrow();
  });
});
