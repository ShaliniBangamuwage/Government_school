import { BadRequestException } from '@nestjs/common';
import { QuestionValidatorService } from './question-validator.service';
import { OfficialTextbookContentService } from './official-textbook-content.service';
import { QuizGenerationService } from './quiz-generation.service';
import { ConfiguredAiProviderService } from './providers/configured-ai-provider.service';

describe('ConfiguredAiProviderService', () => {
  it('accepts the Groq key from the project env variable name', async () => {
    const originalAiKey = process.env.AI_API_KEY;
    const originalGroqKey = process.env.GROQ_API_KEY;
    process.env.AI_PROVIDER = 'groq';
    delete process.env.AI_API_KEY;
    process.env.GROQ_API_KEY = 'test-groq-key';

    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          title: 'Demo Quiz',
          questions: Array.from({ length: 10 }, (_, index) => ({
            id: `q-${index + 1}`,
            question: `Question ${index + 1}?`,
            options: ['A', 'B', 'C', 'D'],
            correctAnswerIndex: 0,
            explanation: `Explanation ${index + 1}`,
          })),
        }) } }],
      }),
    } as any);

    try {
      const service = new ConfiguredAiProviderService();
      const result = await service.generate('Generate a quiz', 'openai/gpt-oss-20b', ['Topic: fractions']);
      expect(result.title).toBe('Demo Quiz');
      expect(Array.isArray(result.questions)).toBe(true);
      expect((result.questions as any[]).length).toBe(10);
    } finally {
      fetchMock.mockRestore();
      if (originalAiKey === undefined) delete process.env.AI_API_KEY; else process.env.AI_API_KEY = originalAiKey;
      if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalGroqKey;
    }
  });

  it('retries with a supported Groq model when the requested model is not available', async () => {
    const originalAiKey = process.env.AI_API_KEY;
    const originalGroqKey = process.env.GROQ_API_KEY;
    process.env.AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'test-groq-key';

    const fetchMock = jest.spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { message: 'The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.' } }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ title: 'Fallback Quiz', questions: [] }) } }],
        }),
      } as any);

    try {
      const service = new ConfiguredAiProviderService();
      const result = await service.generate('Generate a quiz', 'llama-3.3-70b-versatile', ['Topic: fractions']);
      expect(result.title).toBe('Fallback Quiz');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][1].body).toContain('llama-3.3-70b-versatile');
      expect(fetchMock.mock.calls[1][1].body).not.toContain('llama-3.3-70b-versatile');
    } finally {
      fetchMock.mockRestore();
      if (originalAiKey === undefined) delete process.env.AI_API_KEY; else process.env.AI_API_KEY = originalAiKey;
      if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalGroqKey;
    }
  });

  it('does not retry when the organization daily token quota is exhausted', async () => {
    const originalGroqKey = process.env.GROQ_API_KEY;
    process.env.AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'test-groq-key';

    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { message: 'tokens per day (TPD): Limit 200000, Used 199670, Requested 914' } }),
      headers: new Headers(),
    } as any);

    try {
      const service = new ConfiguredAiProviderService();
      await expect(service.generate('Generate a simulator', 'openai/gpt-oss-20b', [])).rejects.toThrow('Groq daily quota reached. Try again after the daily reset.');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      fetchMock.mockRestore();
      if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalGroqKey;
    }
  });
});

describe('Mathematics quiz grounding and validation', () => {
  it('rejects questions that do not contain exactly 10 valid MCQ items', () => {
    const service = new QuestionValidatorService();

    const invalidQuestion = {
      id: 'q-1',
      order: 1,
      questionText: 'What is 3 + 4?',
      options: [
        { id: 'A', text: '6' },
        { id: 'B', text: '7' },
        { id: 'C', text: '8' },
        { id: 'D', text: '7' },
      ],
      correctOptionId: 'B',
      explanation: '3 + 4 = 7.',
      difficulty: 'easy',
      learningOutcome: 'Add whole numbers.',
      sourceLessonId: 'lesson-1',
      sourceLessonTitle: 'Addition',
      sourcePageStart: 12,
      sourcePageEnd: 12,
      sourceExcerpt: 'Addition of whole numbers.',
      sourceContentHash: 'abc',
    };

    expect(() => service.validateQuestion(invalidQuestion)).toThrow(BadRequestException);
  });

  it('returns the unavailable source message when textbook content is not verified', async () => {
    const service = new OfficialTextbookContentService();
    const result = await service.resolveLessonContent({
      textbookId: 'missing',
      lessonId: 'lesson-1',
      lessonTitle: 'Addition',
      grade: 6,
      medium: 'Sinhala',
    });

    expect(result.available).toBe(false);
    expect(result.message).toContain('Official textbook content is currently unavailable');
  });

  it('rejects invalid teacher prompts before any AI call', async () => {
    const service = new QuizGenerationService(
      { loadApprovedSourceContext: jest.fn() } as any,
      { validateQuestion: jest.fn() } as any,
      { rejectIfDuplicate: jest.fn() } as any,
    );

    await expect(service.generateFromPrompt('teacher-1', {
      grade: 8,
      medium: 'English',
      teacherPrompt: 'too short',
      questionCount: 10,
    })).rejects.toThrow(BadRequestException);
  });

  it('lists published quizzes without requiring a composite Firestore index', async () => {
    const collection = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [{
          data: () => ({
            id: 'published-1',
            teacherId: 'teacher-1',
            grade: 8,
            medium: 'English',
            teacherPrompt: 'Fractions',
            title: 'Fractions quiz',
            questions: [{ id: 'q1', question: '1/2 + 1/4?', options: ['1/6', '2/6', '3/4', '1'], correctAnswerIndex: 2, explanation: '...' }],
            status: 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
          }),
        }],
      }),
    };

    const service = new QuizGenerationService(
      { loadApprovedSourceContext: jest.fn() } as any,
      { validateQuestion: jest.fn() } as any,
      { rejectIfDuplicate: jest.fn() } as any,
    );

    (service as any).firestore = jest.fn(() => ({ collection: jest.fn(() => collection) }));

    const result = await service.listStudentQuizzes({ grade: 8, medium: 'English' });

    expect(collection.where).toHaveBeenCalledWith('status', '==', 'published');
    expect((collection as any).orderBy).toBeUndefined();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Fractions quiz');
  });

  it('creates a student attempt from the published quiz question list', async () => {
    const collection = {
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            id: 'quiz-1',
            status: 'published',
            questions: [
              { id: 'q1', question: '2 + 2?', options: ['3', '4', '5', '6'], correctAnswerIndex: 1, explanation: '2 + 2 = 4.' },
              { id: 'q2', question: '3 x 3?', options: ['6', '7', '8', '9'], correctAnswerIndex: 3, explanation: '3 x 3 = 9.' },
            ],
          }),
        }),
        set: jest.fn(),
        update: jest.fn(),
      })),
    };

    const service = new QuizGenerationService(
      { loadApprovedSourceContext: jest.fn() } as any,
      { validateQuestion: jest.fn() } as any,
      { rejectIfDuplicate: jest.fn() } as any,
    );

    (service as any).firestore = jest.fn(() => ({ collection: jest.fn(() => collection) }));

    const attempt = await service.createAttempt('student-1', 'quiz-1');
    expect(attempt.totalQuestions).toBe(2);
    expect(attempt.status).toBe('in_progress');
  });

  it('returns teacher-visible marks for a published quiz', async () => {
    const quizDoc = { get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ id: 'quiz-1', teacherId: 'teacher-1', status: 'published', title: 'Fractions quiz' }) }) };
    const userDoc = { get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ fullName: 'Ada Student' }) }) };
    const attemptDocs = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [{ data: () => ({ id: 'attempt-1', quizId: 'quiz-1', studentUid: 'student-1', score: 2, totalQuestions: 2, percentage: 100, passed: true, submittedAt: new Date().toISOString() }) }] }),
    };

    const service = new QuizGenerationService(
      { loadApprovedSourceContext: jest.fn() } as any,
      { validateQuestion: jest.fn() } as any,
      { rejectIfDuplicate: jest.fn() } as any,
    );

    (service as any).firestore = jest.fn(() => ({
      collection: jest.fn((name: string) => {
        if (name === 'quizzes') {
          return { doc: jest.fn(() => quizDoc) };
        }
        if (name === 'users') {
          return { doc: jest.fn(() => userDoc) };
        }
        return { where: jest.fn(() => attemptDocs), doc: jest.fn() };
      }),
    }));

    const records = await service.listTeacherQuizAttempts('teacher-1', 'quiz-1');
    expect(records).toHaveLength(1);
    expect(records[0].score).toBe(2);
    expect(records[0].studentName).toBe('Ada Student');
    expect(records[0].quizTitle).toBe('Fractions quiz');
  });

  it('returns an empty list when a quiz has no student submissions', async () => {
    const quizDoc = { get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ id: 'quiz-2', teacherId: 'teacher-1', status: 'published', title: 'No attempts quiz' }) }) };
    const attemptDocs = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const service = new QuizGenerationService(
      { loadApprovedSourceContext: jest.fn() } as any,
      { validateQuestion: jest.fn() } as any,
      { rejectIfDuplicate: jest.fn() } as any,
    );

    (service as any).firestore = jest.fn(() => ({
      collection: jest.fn((name: string) => {
        if (name === 'quizzes') {
          return { doc: jest.fn(() => quizDoc) };
        }
        if (name === 'users') {
          return { doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }) })) };
        }
        return { where: jest.fn(() => attemptDocs), doc: jest.fn() };
      }),
    }));

    const records = await service.listTeacherQuizAttempts('teacher-1', 'quiz-2');
    expect(records).toEqual([]);
  });

  it('requires exactly 10 questions and 4 options from Groq output', () => {
    const service = new QuizGenerationService(
      { loadApprovedSourceContext: jest.fn() } as any,
      { validateQuestion: jest.fn() } as any,
      { rejectIfDuplicate: jest.fn() } as any,
    );

    expect(() => service.validateGeneratedQuiz({
      title: 'Fractions Quiz',
      questions: [
        {
          id: 'q-1',
          question: 'What is 1/2 + 1/4?',
          options: ['1/6', '2/6', '3/4', '1'],
          correctAnswerIndex: 2,
          explanation: '1/2 = 2/4, plus 1/4 = 3/4.',
        },
      ],
    })).toThrow(BadRequestException);
  });

  it('does not return draft quizzes to students', async () => {
    const service = new QuizGenerationService(
      { loadApprovedSourceContext: jest.fn() } as any,
      { validateQuestion: jest.fn() } as any,
      { rejectIfDuplicate: jest.fn() } as any,
    );

    const draftQuiz = {
      id: 'draft-1',
      teacherId: 'teacher-1',
      grade: 8,
      medium: 'English',
      teacherPrompt: 'Fractions',
      title: 'Draft quiz',
      questions: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const visible = await service.filterQuizForStudent(draftQuiz as any, { grade: 8, medium: 'English' });
    expect(visible).toBeNull();
  });

  it('returns published quizzes that match the student profile', async () => {
    const service = new QuizGenerationService(
      { loadApprovedSourceContext: jest.fn() } as any,
      { validateQuestion: jest.fn() } as any,
      { rejectIfDuplicate: jest.fn() } as any,
    );

    const publishedQuiz = {
      id: 'published-1',
      teacherId: 'teacher-1',
      grade: 8,
      medium: 'English',
      teacherPrompt: 'Fractions',
      title: 'Fractions quiz',
      questions: [{ id: 'q1', question: '1/2 + 1/4?', options: ['1/6', '2/6', '3/4', '1'], correctAnswerIndex: 2, explanation: '...' }],
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };

    const visible = await service.filterQuizForStudent(publishedQuiz as any, { grade: 8, medium: 'English' });
    expect(visible).not.toBeNull();
    expect(visible?.title).toBe('Fractions quiz');
  });

  it('hides pending and deleted quizzes from student visibility', async () => {
    const service = new QuizGenerationService(
      { loadApprovedSourceContext: jest.fn() } as any,
      { validateQuestion: jest.fn() } as any,
      { rejectIfDuplicate: jest.fn() } as any,
    );

    const pendingQuiz = {
      id: 'pending-1',
      teacherId: 'teacher-1',
      grade: 8,
      medium: 'English',
      teacherPrompt: 'Fractions',
      title: 'Pending quiz',
      questions: [{ id: 'q1', question: '1/2 + 1/4?', options: ['1/6', '2/6', '3/4', '1'], correctAnswerIndex: 2, explanation: '...' }],
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const deletedQuiz = {
      ...pendingQuiz,
      id: 'deleted-1',
      status: 'deleted',
      title: 'Deleted quiz',
    };

    expect(await service.filterQuizForStudent(pendingQuiz as any, { grade: 8, medium: 'English' })).toBeNull();
    expect(await service.filterQuizForStudent(deletedQuiz as any, { grade: 8, medium: 'English' })).toBeNull();
  });
});
