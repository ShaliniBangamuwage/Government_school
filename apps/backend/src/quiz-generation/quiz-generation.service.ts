import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { DuplicateQuestionService } from './duplicate-question.service';
import { QuestionValidatorService } from './question-validator.service';
import { ConfiguredAiProviderService } from './providers/configured-ai-provider.service';
import { SourceGroundingService } from './source-grounding.service';

const GeneratedQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string().min(10),
  questionType: z.enum(['single-answer-mcq', 'true-false', 'short-answer']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  sourceReferences: z.array(z.object({ title: z.string(), pageUrl: z.string().url() })).min(1),
  language: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  reviewStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  isApproved: z.boolean().default(false),
});

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
};

export type TeacherQuizDraft = {
  id?: string;
  teacherId: string;
  grade: number;
  medium: 'Sinhala' | 'English' | 'Tamil';
  teacherPrompt: string;
  title: string;
  questions: QuizQuestion[];
  status: 'draft' | 'pending' | 'published' | 'deleted';
  createdAt?: unknown;
  updatedAt?: unknown;
  publishedAt?: unknown;
  deletedAt?: unknown;
};

@Injectable()
export class QuizGenerationService {
  constructor(
    private readonly sourceGroundingService: SourceGroundingService,
    private readonly questionValidatorService: QuestionValidatorService,
    private readonly duplicateQuestionService: DuplicateQuestionService,
    private readonly aiProvider: ConfiguredAiProviderService,
  ) {}

  private firestore() {
    return admin.firestore();
  }

  private normalizeMedium(value: string): 'Sinhala' | 'English' | 'Tamil' {
    const normalized = String(value ?? '').trim();
    const lowered = normalized.toLowerCase();
    if (lowered === 'sinhala') return 'Sinhala';
    if (lowered === 'tamil') return 'Tamil';
    return 'English';
  }

  private normalizeQuestionCount(value: unknown): number {
    const numericValue = Number(value ?? 10);
    if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 20) {
      throw new BadRequestException('questionCount must be an integer between 1 and 20.');
    }
    return numericValue;
  }

  private buildPrompt(grade: number, medium: 'Sinhala' | 'English' | 'Tamil', teacherPrompt: string, questionCount: number) {
    return `You are generating a Mathematics quiz for Grade ${grade} in ${medium}. Follow the teacher instructions exactly: ${teacherPrompt}. Generate exactly ${questionCount} basic Mathematics multiple-choice questions. Use ${medium} as the language of the quiz. Each question must have exactly four options and a valid correctAnswerIndex value between 0 and 3. Return valid JSON only in the format {"title":"...","questions":[{"id":"generated-id","question":"...","options":["...","...","...","..."],"correctAnswerIndex":0,"explanation":"..."}]}. Do not include markdown fences or any extra text. Ensure no duplicate questions and no more than one correct answer per question.`;
  }

  validateGeneratedQuiz(payload: any, expectedCount: number): { title: string; questions: QuizQuestion[] } {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Groq returned an invalid quiz payload.');
    }

    const title = typeof payload.title === 'string' && payload.title.trim().length > 0 ? payload.title.trim() : `Grade ${payload.grade ?? 'Mathematics'} Quiz`;
    const questions = Array.isArray(payload.questions) ? payload.questions : [];

    if (questions.length !== expectedCount) {
      throw new BadRequestException(`Groq must return exactly ${expectedCount} questions.`);
    }

    const normalizedQuestions: QuizQuestion[] = questions.map((question: any, index: number) => {
      if (!question || typeof question.question !== 'string' || question.question.trim().length < 10) {
        throw new BadRequestException(`Question ${index + 1} is missing a valid question text.`);
      }

      const options = Array.isArray(question.options) ? question.options.map((option: unknown) => String(option).trim()) : [];
      if (options.length !== 4 || options.some((option: string) => option.length === 0)) {
        throw new BadRequestException(`Question ${index + 1} must include exactly four non-empty options.`);
      }

      const correctAnswerIndex = Number(question.correctAnswerIndex ?? -1);
      if (!Number.isInteger(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex > 3) {
        throw new BadRequestException(`Question ${index + 1} requires a valid correctAnswerIndex between 0 and 3.`);
      }

      const explanation = typeof question.explanation === 'string' && question.explanation.trim().length > 0 ? question.explanation.trim() : '';
      if (!explanation) {
        throw new BadRequestException(`Question ${index + 1} is missing an explanation.`);
      }

      const uniqueOptions = new Set(options);
      if (uniqueOptions.size !== 4) {
        throw new BadRequestException(`Question ${index + 1} contains duplicate answer options.`);
      }

      return {
        id: typeof question.id === 'string' && question.id.trim().length > 0 ? question.id.trim() : `generated-${index + 1}`,
        question: question.question.trim(),
        options: options.slice(0, 4),
        correctAnswerIndex,
        explanation,
      };
    });

    const duplicateMap = new Set<string>();
    for (const question of normalizedQuestions) {
      const key = question.question.trim().toLowerCase();
      if (duplicateMap.has(key)) {
        throw new BadRequestException('Groq produced duplicate questions.');
      }
      duplicateMap.add(key);
    }

    return { title, questions: normalizedQuestions };
  }

  async createGenerationJob(actorUid: string, payload: Record<string, unknown>) {
    const unitId = String(payload.unitId ?? '');
    const questionCount = Number(payload.questionCount ?? 0);
    if (!unitId || questionCount <= 0 || questionCount > 20) {
      throw new BadRequestException('unitId and questionCount (1-20) are required.');
    }

    const grounding = await this.sourceGroundingService.loadApprovedSourceContext(unitId);
    if (!grounding.approvedSources.length) {
      throw new BadRequestException('No approved source text exists for this unit.');
    }

    const jobRef = this.firestore().collection('quizGenerationJobs').doc();
    const job = {
      id: jobRef.id,
      actorUid,
      unitId,
      questionCount,
      status: 'queued',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      sourceReferences: grounding.approvedSources.map((source) => ({
        title: source.title,
        pageUrl: source.pageUrl,
      })),
    };

    await jobRef.set(job);
    return job;
  }

  async getGenerationJob(jobId: string) {
    const snapshot = await this.firestore().collection('quizGenerationJobs').doc(jobId).get();
    if (!snapshot.exists) {
      throw new NotFoundException('Generation job not found.');
    }
    return snapshot.data();
  }

  async listQuestionBank(status?: string) {
    let query: FirebaseFirestore.Query = this.firestore().collection('questionBank');
    if (status) {
      query = query.where('reviewStatus', '==', status);
    }
    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async reviewQuestion(actorUid: string, questionId: string, payload: Record<string, unknown>) {
    const ref = this.firestore().collection('questionBank').doc(questionId);
    const current = await ref.get();
    if (!current.exists) {
      throw new NotFoundException('Question not found.');
    }

    const nextState = {
      reviewStatus: payload.reviewStatus ?? 'pending',
      reviewedBy: actorUid,
      reviewReason: payload.reviewReason,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.update(nextState);
    return { id: questionId, ...nextState };
  }

  async generateValidatedQuestions(unitId: string, payload: Record<string, unknown>) {
    const sourceContext = await this.sourceGroundingService.loadApprovedSourceContext(unitId);
    if (!sourceContext.approvedSources.length) {
      throw new BadRequestException('Missing approved source context.');
    }

    const generated = [
      {
        id: 'q-001',
        prompt: 'Which of these is the correct answer?',
        questionType: 'single-answer-mcq',
        difficulty: 'easy',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'B',
        sourceReferences: sourceContext.approvedSources.slice(0, 1),
        language: String(payload.language ?? 'English'),
        model: String(process.env.AI_MODEL ?? 'mock-model'),
        promptVersion: '2026.08-v1',
        reviewStatus: 'pending',
        isApproved: false,
      },
    ];

    const parsed = GeneratedQuestionSchema.parse(generated[0]);
    this.questionValidatorService.validateQuestion(parsed);
    await this.duplicateQuestionService.rejectIfDuplicate(parsed, this.firestore());

    const questionRef = this.firestore().collection('questionBank').doc(parsed.id);
    await questionRef.set(parsed, { merge: true });
    return parsed;
  }

  async generateQuestionsForMathematicsLesson(input: { catalogId: string; lessonId: string; grade?: number; medium?: string; lessonTitle?: string; sourceUrl?: string; questionCount?: number }) {
    const grade = Number(input.grade ?? 8);
    const medium = String(input.medium ?? 'English');
    const lessonTitle = String(input.lessonTitle ?? 'Mathematics lesson');
    const sourceUrl = String(input.sourceUrl ?? `https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=${grade}`);
    const questionCount = Math.min(Math.max(Number(input.questionCount ?? 3), 1), 5);

    return Array.from({ length: questionCount }, (_, index) => {
      const questionNumber = index + 1;
      const prompt = `In the ${lessonTitle} topic, which option correctly matches the concept being taught?`;
      const options = [
        `Concept ${questionNumber}A`,
        `Concept ${questionNumber}B`,
        `Concept ${questionNumber}C`,
        `Concept ${questionNumber}D`,
      ];

      return {
        id: `${input.lessonId}-q-${questionNumber}`,
        prompt,
        questionType: 'single-answer-mcq',
        difficulty: questionNumber % 3 === 0 ? 'hard' : questionNumber % 2 === 0 ? 'medium' : 'easy',
        options,
        correctAnswer: 'B',
        sourceReferences: [{ title: lessonTitle, pageUrl: sourceUrl }],
        language: medium,
        model: process.env.AI_MODEL ?? 'mock-mathematics-model',
        promptVersion: 'mathematics-lesson-v1',
        reviewStatus: 'pending',
        isApproved: false,
        explanation: `This item is grounded in the official Mathematics lesson content for Grade ${grade} ${medium}.`,
        sourceLessonId: input.lessonId,
        sourceLessonTitle: lessonTitle,
        sourceContentHash: `hash:${input.catalogId}:${input.lessonId}:${grade}:${medium}`,
      };
    });
  }

  async generateFromPrompt(actorUid: string, payload: Record<string, unknown>) {
    const grade = Number(payload.grade ?? NaN);
    const medium = this.normalizeMedium(String(payload.medium ?? 'English'));
    const teacherPrompt = String(payload.teacherPrompt ?? '').trim();
    const questionCount = this.normalizeQuestionCount(payload.questionCount ?? 10);

    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      throw new BadRequestException('A valid Grade between 1 and 13 is required.');
    }

    if (teacherPrompt.length < 15) {
      throw new BadRequestException('Teacher instructions must be at least 15 characters long.');
    }

    const prompt = this.buildPrompt(grade, medium, teacherPrompt, questionCount);

    let result: { title?: string; questions?: QuizQuestion[] } | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await this.aiProvider.generate(prompt, process.env.AI_MODEL || 'openai/gpt-oss-20b', [teacherPrompt]);
        const normalized = this.validateGeneratedQuiz(response, questionCount);
        result = normalized;
        break;
      } catch (error) {
        if (attempt === 1) {
          throw error;
        }
      }
    }

    if (!result) {
      throw new BadRequestException('Groq did not return a valid quiz.');
    }

    const title = result.title && result.title.trim().length > 0 ? result.title.trim() : `Grade ${grade} ${medium} Mathematics Quiz`;
    const questions = result.questions ?? [];
    const quizRef = this.firestore().collection('quizzes').doc();
    const quizRecord: TeacherQuizDraft = {
      id: quizRef.id,
      teacherId: actorUid,
      grade,
      medium,
      teacherPrompt,
      title,
      questions,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await quizRef.set(quizRecord, { merge: true });
    return { quiz: quizRecord };
  }

  async createTeacherQuiz(actorUid: string, payload: Record<string, unknown>) {
    const grade = Number(payload.grade ?? NaN);
    const medium = this.normalizeMedium(String(payload.medium ?? 'English'));
    const teacherPrompt = String(payload.teacherPrompt ?? '').trim();
    const questionCount = this.normalizeQuestionCount(payload.questionCount ?? (Array.isArray(payload.questions) ? payload.questions.length : 10));
    const title = String(payload.title ?? `Grade ${grade} ${medium} Mathematics Quiz`).trim();
    const questions = Array.isArray(payload.questions) ? (payload.questions as QuizQuestion[]) : [];

    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      throw new BadRequestException('A valid Grade between 1 and 13 is required.');
    }

    if (teacherPrompt.length < 15) {
      throw new BadRequestException('Teacher instructions must be at least 15 characters long.');
    }

    const validatedQuiz = this.validateGeneratedQuiz({ title, questions }, questionCount);

    const quizRef = this.firestore().collection('quizzes').doc();
    const quizRecord: TeacherQuizDraft = {
      id: quizRef.id,
      teacherId: actorUid,
      grade,
      medium,
      teacherPrompt,
      title: validatedQuiz.title,
      questions: validatedQuiz.questions,
      status: String(payload.status ?? 'draft') === 'published' ? 'published' : 'draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(String(payload.status ?? 'draft') === 'published' ? { publishedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
    };

    await quizRef.set(quizRecord, { merge: true });
    return { quiz: quizRecord };
  }

  async updateTeacherQuiz(actorUid: string, quizId: string, payload: Record<string, unknown>) {
    const ref = this.firestore().collection('quizzes').doc(quizId);
    const current = await ref.get();
    if (!current.exists) {
      throw new NotFoundException('Quiz not found.');
    }

    const quiz = current.data() as Record<string, unknown> | undefined;
    if (String(quiz?.teacherId ?? '') !== actorUid) {
      throw new BadRequestException('You do not have permission to edit this quiz.');
    }

    const nextGrade = Number(payload.grade ?? quiz?.grade ?? 8);
    const nextMedium = this.normalizeMedium(String(payload.medium ?? (typeof quiz?.medium === 'string' ? quiz.medium : 'English')));
    const nextPrompt = String(payload.teacherPrompt ?? (typeof quiz?.teacherPrompt === 'string' ? quiz.teacherPrompt : '')).trim();
    const nextTitle = String(payload.title ?? (typeof quiz?.title === 'string' ? quiz.title : `Grade ${nextGrade} ${nextMedium} Mathematics Quiz`)).trim();
    const nextQuestionCount = this.normalizeQuestionCount(Array.isArray(payload.questions) ? payload.questions.length : (Array.isArray(quiz?.questions) ? quiz.questions.length : 10));
    const nextQuestions = Array.isArray(payload.questions) ? (payload.questions as QuizQuestion[]) : (Array.isArray(quiz?.questions) ? quiz.questions as QuizQuestion[] : []);

    this.validateGeneratedQuiz({ title: nextTitle, questions: nextQuestions }, nextQuestionCount);

    const nextStatus = String(payload.status ?? quiz?.status ?? 'draft');
    const nextQuiz = {
      ...quiz,
      teacherId: actorUid,
      grade: nextGrade,
      medium: nextMedium,
      teacherPrompt: nextPrompt,
      title: nextTitle,
      questions: nextQuestions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(nextStatus === 'published'
        ? { status: 'published', publishedAt: admin.firestore.FieldValue.serverTimestamp() }
        : nextStatus === 'deleted'
          ? { status: 'deleted', deletedAt: admin.firestore.FieldValue.serverTimestamp() }
          : nextStatus === 'pending'
            ? { status: 'pending' }
            : { status: 'draft' }),
    };

    await ref.update(nextQuiz);
    return { quiz: nextQuiz };
  }

  async publishTeacherQuiz(actorUid: string, quizId: string) {
    const ref = this.firestore().collection('quizzes').doc(quizId);
    const current = await ref.get();
    if (!current.exists) {
      throw new NotFoundException('Quiz not found.');
    }

    const quiz = current.data() as Record<string, unknown> | undefined;
    if (String(quiz?.teacherId ?? '') !== actorUid) {
      throw new BadRequestException('You do not have permission to publish this quiz.');
    }

    const questions = Array.isArray(quiz?.questions) ? (quiz.questions as QuizQuestion[]) : [];
    this.validateGeneratedQuiz({ title: quiz?.title ?? 'Mathematics Quiz', questions }, questions.length || 10);

    await ref.update({
      status: 'published',
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedAt: admin.firestore.FieldValue.delete(),
    });

    return { quiz: { ...quiz, status: 'published' } };
  }

  async deleteTeacherQuiz(actorUid: string, quizId: string) {
    const ref = this.firestore().collection('quizzes').doc(quizId);
    const current = await ref.get();
    if (!current.exists) {
      throw new NotFoundException('Quiz not found.');
    }

    const quiz = current.data() as Record<string, unknown> | undefined;
    if (String(quiz?.teacherId ?? '') !== actorUid) {
      throw new BadRequestException('You do not have permission to delete this quiz.');
    }

    await ref.update({
      status: 'deleted',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedAt: admin.firestore.FieldValue.delete(),
    });

    return { quiz: { ...quiz, status: 'deleted' } };
  }

  async listTeacherQuizAttempts(actorUid: string, quizId: string) {
    const quizRef = this.firestore().collection('quizzes').doc(quizId);
    const quizSnapshot = await quizRef.get();
    if (!quizSnapshot.exists) {
      throw new NotFoundException('Quiz not found.');
    }

    const quiz = quizSnapshot.data() as Record<string, unknown> | undefined;
    if (String(quiz?.teacherId ?? '') !== actorUid) {
      throw new BadRequestException('You do not have access to these quiz results.');
    }

    const snapshot = await this.firestore().collection('quizAttempts').where('quizId', '==', quizId).limit(100).get();
    const attempts = snapshot.docs.map((doc) => doc.data());
    const studentUids = [...new Set(attempts.map((attempt) => String(attempt?.studentUid ?? '')).filter(Boolean))];

    const userDocs = await Promise.all(studentUids.map(async (studentUid) => {
      const userSnapshot = await this.firestore().collection('users').doc(studentUid).get();
      const user = userSnapshot.data() as Record<string, unknown> | undefined;
      return {
        studentUid,
        studentName: String(user?.fullName ?? user?.displayName ?? user?.name ?? 'Unknown Student').trim() || 'Unknown Student',
      };
    }));

    const studentNames = Object.fromEntries(userDocs.map((user) => [user.studentUid, user.studentName]));

    return attempts
      .sort((left, right) => {
        const leftTime = left?.submittedAt && typeof left.submittedAt === 'object' && 'toMillis' in left.submittedAt ? (left.submittedAt as { toMillis: () => number }).toMillis() : new Date(String(left?.submittedAt ?? 0)).getTime();
        const rightTime = right?.submittedAt && typeof right.submittedAt === 'object' && 'toMillis' in right.submittedAt ? (right.submittedAt as { toMillis: () => number }).toMillis() : new Date(String(right?.submittedAt ?? 0)).getTime();
        return rightTime - leftTime;
      })
      .map((attempt) => ({
        id: attempt.id,
        quizId: attempt.quizId,
        studentUid: attempt.studentUid,
        studentName: studentNames[String(attempt.studentUid ?? '')] ?? 'Unknown Student',
        quizTitle: String(quiz?.title ?? 'Untitled quiz'),
        score: Number(attempt.score ?? 0),
        totalQuestions: Number(attempt.totalQuestions ?? 0),
        percentage: Number(attempt.percentage ?? 0),
        passed: Boolean(attempt.passed),
        submittedAt: attempt.submittedAt,
      }));
  }

  async listTeacherQuizzes(actorUid: string) {
    const snapshot = await this.firestore().collection('quizzes').where('teacherId', '==', actorUid).limit(50).get();
    const items = snapshot.docs
      .map((doc) => doc.data())
      .filter((quiz) => quiz.status !== 'deleted')
      .sort((left, right) => {
        const leftTime = left?.updatedAt && typeof left.updatedAt === 'object' && 'toMillis' in left.updatedAt
          ? (left.updatedAt as { toMillis: () => number }).toMillis()
          : new Date(String(left?.updatedAt ?? 0)).getTime();
        const rightTime = right?.updatedAt && typeof right.updatedAt === 'object' && 'toMillis' in right.updatedAt
          ? (right.updatedAt as { toMillis: () => number }).toMillis()
          : new Date(String(right?.updatedAt ?? 0)).getTime();
        return rightTime - leftTime;
      });

    return items;
  }

  async listStudentQuizzes(profile?: { grade?: number; medium?: string }) {
    const snapshot = await this.firestore().collection('quizzes').where('status', '==', 'published').limit(50).get();

    const items = snapshot.docs
      .map((doc) => doc.data())
      .filter((quiz) => this.filterQuizForStudent(quiz, profile) !== null)
      .sort((left, right) => {
        const leftTime = left?.publishedAt && typeof left.publishedAt === 'object' && 'toMillis' in left.publishedAt
          ? (left.publishedAt as { toMillis: () => number }).toMillis()
          : new Date(String(left?.publishedAt ?? 0)).getTime();
        const rightTime = right?.publishedAt && typeof right.publishedAt === 'object' && 'toMillis' in right.publishedAt
          ? (right.publishedAt as { toMillis: () => number }).toMillis()
          : new Date(String(right?.publishedAt ?? 0)).getTime();
        return rightTime - leftTime;
      });

    return items.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      grade: quiz.grade,
      medium: quiz.medium,
      questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
      status: quiz.status,
      publishedAt: quiz.publishedAt,
    }));
  }

  async getStudentProgress(studentUid: string) {
    const [attemptSnapshot, quizSnapshot] = await Promise.all([
      this.firestore().collection('quizAttempts').where('studentUid', '==', studentUid).limit(100).get(),
      this.firestore().collection('quizzes').where('status', '==', 'published').limit(100).get(),
    ]);
    const quizzes = new Map<string, Record<string, unknown>>();
    quizSnapshot.docs.forEach((doc) => quizzes.set(doc.id, { id: doc.id, ...(doc.data() as Record<string, unknown>) }));
    const attemptRecords = attemptSnapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) as Array<Record<string, unknown> & { id: string }>;
    const attempts = attemptRecords
      .filter((attempt) => attempt.status === 'submitted')
      .map((attempt) => {
        const quiz = quizzes.get(String(attempt.quizId ?? '')) ?? {};
        return {
          id: String(attempt.id),
          quizId: String(attempt.quizId ?? ''),
          quizTitle: String(quiz.title ?? 'Mathematics quiz'),
          score: Number(attempt.score ?? 0),
          totalQuestions: Number(attempt.totalQuestions ?? 0),
          percentage: Number(attempt.percentage ?? 0),
          passed: Boolean(attempt.passed),
          submittedAt: this.progressTimestamp(attempt.submittedAt),
          topic: this.progressTopic(quiz),
        };
      })
      .sort((left, right) => new Date(right.submittedAt ?? 0).getTime() - new Date(left.submittedAt ?? 0).getTime());
    const averagePercentage = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length) : 0;
    const passedCount = attempts.filter((attempt) => attempt.passed).length;
    const topicMap = new Map<string, { total: number; count: number }>();
    attempts.forEach((attempt) => {
      const current = topicMap.get(attempt.topic) ?? { total: 0, count: 0 };
      current.total += attempt.percentage;
      current.count += 1;
      topicMap.set(attempt.topic, current);
    });
    const topicPerformance = [...topicMap.entries()]
      .map(([topic, value]) => ({ topic, attempts: value.count, averagePercentage: Math.round(value.total / value.count) }))
      .sort((left, right) => right.averagePercentage - left.averagePercentage);
    const summary = {
      totalAttempts: attempts.length,
      averagePercentage,
      passedCount,
      passRate: attempts.length ? Math.round((passedCount / attempts.length) * 100) : 0,
      bestScore: attempts.length ? Math.max(...attempts.map((attempt) => attempt.percentage)) : 0,
      recentAttempts: attempts.slice(0, 8),
      topicPerformance,
    };
    let aiInsight = this.buildProgressFallback(summary);
    if (attempts.length > 0) {
      try {
        const response = await this.aiProvider.generate(
          `You are an AI Mathematics study coach. Analyze this student's completed quiz progress and return JSON only: {"headline":"short headline","summary":"one evidence-based sentence","actions":["three specific study actions"]}. Do not invent topics or scores. Data: ${JSON.stringify(summary)}`,
          process.env.AI_MODEL || 'openai/gpt-oss-120b', [], 500,
        );
        if (typeof response?.headline === 'string' && typeof response?.summary === 'string' && Array.isArray(response?.actions)) {
          aiInsight = {
            headline: response.headline,
            summary: response.summary,
            actions: response.actions.filter((action): action is string => typeof action === 'string').slice(0, 3),
          };
        }
      } catch {
        // Keep score-based guidance available if the AI request fails.
      }
    }
    return { ...summary, aiInsight };
  }

  private progressTimestamp(value: unknown): string | null {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') return (value as { toDate: () => Date }).toDate().toISOString();
    if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') return new Date((value as { toMillis: () => number }).toMillis()).toISOString();
    const parsed = new Date(String(value ?? ''));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private progressTopic(quiz: Record<string, unknown>): string {
    const source = String(quiz.title ?? quiz.teacherPrompt ?? '').trim();
    return source ? source.slice(0, 48) : 'Mathematics';
  }

  private buildProgressFallback(summary: { totalAttempts: number; averagePercentage: number; topicPerformance: { topic: string; averagePercentage: number }[] }) {
    if (!summary.totalAttempts) return { headline: 'Your study journey starts here', summary: 'Complete a published quiz to unlock personalized progress insights.', actions: ['Choose a published Mathematics quiz', 'Review each explanation after submitting', 'Return here after your next attempt'] };
    const weakest = [...summary.topicPerformance].sort((left, right) => left.averagePercentage - right.averagePercentage)[0];
    return {
      headline: summary.averagePercentage >= 75 ? 'Strong progress is building' : 'Focused practice will help',
      summary: weakest ? `Your current average is ${summary.averagePercentage}%, with ${weakest.topic} as the best next topic to review.` : `Your current average is ${summary.averagePercentage}%.`,
      actions: weakest ? [`Review ${weakest.topic} using the textbook`, 'Retry a similar quiz after reviewing explanations', 'Improve one weak question type at a time'] : ['Review quiz explanations', 'Practice a similar problem set', 'Take another published quiz soon'],
    };
  }

  filterQuizForStudent(quiz: Record<string, unknown> | null | undefined, profile?: { grade?: number; medium?: string }) {
    if (!quiz || (quiz.status !== 'published' && quiz.status !== 'pending' && quiz.status !== 'draft')) {
      return null;
    }

    if (quiz.status !== 'published') {
      return null;
    }

    if (typeof profile?.grade === 'number' && Number.isFinite(profile.grade) && typeof quiz.grade === 'number' && Number(quiz.grade) !== Number(profile.grade)) {
      return null;
    }

    if (typeof profile?.medium === 'string' && quiz.medium && this.normalizeMedium(String(quiz.medium)) !== this.normalizeMedium(profile.medium)) {
      return null;
    }

    return {
      id: quiz.id,
      teacherId: quiz.teacherId,
      grade: quiz.grade,
      medium: quiz.medium,
      teacherPrompt: quiz.teacherPrompt,
      title: quiz.title,
      questions: Array.isArray(quiz.questions) ? quiz.questions.map((question: any) => ({
        id: question.id,
        question: question.question,
        options: Array.isArray(question.options) ? question.options : [],
        explanation: question.explanation,
      })) : [],
      status: quiz.status,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      publishedAt: quiz.publishedAt,
    };
  }

  async getStudentQuiz(quizId: string, profile?: { grade?: number; medium?: string }) {
    const snapshot = await this.firestore().collection('quizzes').doc(quizId).get();
    if (!snapshot.exists) {
      throw new NotFoundException('Quiz not found.');
    }

    const quiz = snapshot.data() as Record<string, unknown> | undefined;
    const allowedQuiz = this.filterQuizForStudent(quiz ?? null, profile);
    if (!allowedQuiz) {
      throw new BadRequestException('This quiz is not available for your profile.');
    }

    return {
      ...allowedQuiz,
      questions: Array.isArray(allowedQuiz.questions) ? allowedQuiz.questions.map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
      })) : [],
    };
  }

  async listStudentQuizSummaries(profile?: { grade?: number; medium?: string }) {
    return this.listStudentQuizzes(profile);
  }

  async createAttempt(studentUid: string, quizId: string) {
    const quizSnapshot = await this.firestore().collection('quizzes').doc(quizId).get();
    if (!quizSnapshot.exists) {
      throw new NotFoundException('Quiz not found.');
    }

    const quiz = quizSnapshot.data() as Record<string, unknown> | undefined;
    if (quiz?.status !== 'published') {
      throw new BadRequestException('This quiz is not published yet.');
    }

    const questions = Array.isArray(quiz?.questions) ? (quiz.questions as QuizQuestion[]) : [];
    if (questions.length === 0) {
      throw new BadRequestException('This published quiz does not contain any questions yet.');
    }

    const attemptRef = this.firestore().collection('quizAttempts').doc();
    const attempt = {
      id: attemptRef.id,
      quizId,
      studentUid,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      submittedAt: null,
      score: 0,
      totalQuestions: questions.length,
      percentage: 0,
      passed: false,
      status: 'in_progress',
      answers: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await attemptRef.set(attempt);
    return attempt;
  }

  async submitAttempt(studentUid: string, quizId: string, attemptId: string, answers: Record<string, string>) {
    const quizSnapshot = await this.firestore().collection('quizzes').doc(quizId).get();
    if (!quizSnapshot.exists) {
      throw new NotFoundException('Quiz not found.');
    }

    const attemptSnapshot = await this.firestore().collection('quizAttempts').doc(attemptId).get();
    if (!attemptSnapshot.exists) {
      throw new NotFoundException('Attempt not found.');
    }

    const attempt = attemptSnapshot.data();
    if (attempt?.studentUid !== studentUid) {
      throw new BadRequestException('You do not have access to this attempt.');
    }

    const questions = Array.isArray((quizSnapshot.data() as any)?.questions) ? (quizSnapshot.data() as any).questions as QuizQuestion[] : [];
    if (!questions.length) {
      throw new BadRequestException('This quiz has no questions to mark.');
    }

    let correct = 0;
    const results = questions.map((question) => {
      const rawAnswer = answers[String(question.id)] ?? answers[question.id] ?? answers[String(question.id)] ?? answers[question.question] ?? '';
      const answerValue = String(rawAnswer ?? '').trim();
      const numericChoice = Number(answerValue);
      const selectedIndex = Number.isInteger(numericChoice) && numericChoice >= 0 && numericChoice < question.options.length
        ? numericChoice
        : question.options.findIndex((option) => option.trim().toLowerCase() === answerValue.toLowerCase());
      const isCorrect = selectedIndex >= 0 && selectedIndex === question.correctAnswerIndex;
      if (isCorrect) {
        correct += 1;
      }
      return {
        id: question.id,
        correct: isCorrect,
        selectedIndex,
        answerText: selectedIndex >= 0 ? question.options[selectedIndex] : answerValue,
        explanation: question.explanation,
      };
    });

    const percentage = questions.length > 0 ? (correct / questions.length) * 100 : 0;
    const passed = percentage >= 50;
    const result = {
      id: attemptId,
      quizId,
      studentUid,
      status: 'submitted',
      score: correct,
      totalQuestions: questions.length,
      percentage,
      passed,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      results,
    };

    await attemptSnapshot.ref.update(result);
    return result;
  }

  async getAttempt(studentUid: string, attemptId: string) {
    const snapshot = await this.firestore().collection('quizAttempts').doc(attemptId).get();
    if (!snapshot.exists) {
      throw new NotFoundException('Attempt not found.');
    }

    const attempt = snapshot.data();
    if (attempt?.studentUid !== studentUid) {
      throw new BadRequestException('You do not have access to this attempt.');
    }

    return attempt;
  }
}
