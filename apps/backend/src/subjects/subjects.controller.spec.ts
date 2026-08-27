import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

describe('SubjectsController', () => {
  let controller: SubjectsController;
  let service: SubjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubjectsController],
      providers: [
        {
          provide: SubjectsService,
          useValue: {
            createSubject: jest.fn(),
            getSubjectById: jest.fn(),
            listPublicSubjects: jest.fn(),
            listTeacherSubjects: jest.fn(),
            listAdminSubjects: jest.fn(),
            updateSubject: jest.fn(),
            updateSubjectStatus: jest.fn(),
            assignTeachers: jest.fn(),
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

    controller = module.get<SubjectsController>(SubjectsController);
    service = module.get<SubjectsService>(SubjectsService);
  });

  it('returns admin subjects from the service', async () => {
    const subjects = [{ id: 'subject-1', name: 'Math', grade: 6, medium: 'English', status: 'active', assignedTeacherIds: [], slug: '6-english-math', createdBy: 'admin-uid' }];
    jest.spyOn(service, 'listAdminSubjects').mockResolvedValue(subjects as any);

    await expect(controller.getAdminSubjects()).resolves.toEqual({ subjects });
  });
});
