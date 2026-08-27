import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { MathematicsCatalogService } from '../mathematics-catalog/mathematics-catalog.service';
import { QuizGenerationController } from './quiz-generation.controller';
import { QuizGenerationService } from './quiz-generation.service';

describe('QuizGenerationController', () => {
  let controller: QuizGenerationController;
  let service: { createGenerationJob: jest.Mock; getGenerationJob: jest.Mock; listQuestionBank: jest.Mock; reviewQuestion: jest.Mock; listStudentQuizzes: jest.Mock; getStudentQuiz: jest.Mock; createAttempt: jest.Mock; submitAttempt: jest.Mock; getAttempt: jest.Mock; };

  beforeEach(async () => {
    service = {
      createGenerationJob: jest.fn(),
      getGenerationJob: jest.fn(),
      listQuestionBank: jest.fn(),
      reviewQuestion: jest.fn(),
      listStudentQuizzes: jest.fn(),
      getStudentQuiz: jest.fn(),
      createAttempt: jest.fn(),
      submitAttempt: jest.fn(),
      getAttempt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizGenerationController],
      providers: [
        { provide: QuizGenerationService, useValue: service },
        {
          provide: MathematicsCatalogService,
          useValue: {
            listCatalogRows: jest.fn(),
            listCatalogLessons: jest.fn(),
          },
        },
        {
          provide: FirebaseAdminService,
          useValue: {
            verifyToken: jest.fn(),
            upsertUserProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<QuizGenerationController>(QuizGenerationController);
  });

  it('lists student quizzes through the controller', async () => {
    service.listStudentQuizzes.mockResolvedValue([{ id: 'quiz-1', status: 'published' }]);

    await expect(controller.listStudentQuizzes()).resolves.toEqual({ quizzes: [{ id: 'quiz-1', status: 'published' }] });
  });

  it('creates a student attempt through the controller', async () => {
    service.createAttempt.mockResolvedValue({ id: 'attempt-1' });

    await expect(controller.createAttempt({ uid: 'u-1' }, 'quiz-1')).resolves.toEqual({ attempt: { id: 'attempt-1' } });
  });

  it('submits a student attempt through the controller', async () => {
    service.submitAttempt.mockResolvedValue({ id: 'attempt-1', score: 1 });

    await expect(controller.submitAttempt({ uid: 'u-1' }, 'quiz-1', { answers: { attemptId: 'attempt-1', q1: 'A' } })).resolves.toEqual({ result: { id: 'attempt-1', score: 1 } });
  });
});
