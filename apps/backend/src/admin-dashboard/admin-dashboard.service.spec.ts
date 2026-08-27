import { Test, TestingModule } from '@nestjs/testing';
import * as admin from 'firebase-admin';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  beforeEach(async () => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: 'demo-project' });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminDashboardService],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  it('returns a summary from firestore data', async () => {
    const users = [
      { id: 'u1', role: 'admin', status: 'active', updatedAt: '2024-01-01T00:00:00.000Z', fullName: 'Admin User', displayName: 'Admin User', email: 'admin@example.com' },
      { id: 'u2', role: 'teacher', status: 'active', updatedAt: '2024-01-02T00:00:00.000Z', fullName: 'Teacher One', displayName: 'Teacher One', email: 'teacher@example.com' },
      { id: 'u3', role: 'student', status: 'suspended', updatedAt: '2024-01-03T00:00:00.000Z', fullName: 'Student One', displayName: 'Student One', email: 'student@example.com' },
    ];

    jest.spyOn(admin.firestore(), 'collection').mockImplementation((name: string) => {
      if (name === 'users') {
        return {
          get: jest.fn().mockResolvedValue({
            docs: users.map((user) => ({ id: user.id, data: () => user })),
          }),
        } as any;
      }

      if (name === 'subjects') {
        return {
          get: jest.fn().mockResolvedValue({ size: 4 }),
        } as any;
      }

      if (name === 'contentApprovals') {
        return {
          get: jest.fn().mockResolvedValue({
            docs: [{ data: () => ({ status: 'pending' }) }, { data: () => ({ status: 'approved' }) }],
          }),
        } as any;
      }

      return { get: jest.fn() } as any;
    });

    const summary = await service.getSummary();

    expect(summary.totalUsers).toBe(3);
    expect(summary.totalTeachers).toBe(1);
    expect(summary.totalStudents).toBe(1);
    expect(summary.totalAdmins).toBe(1);
    expect(summary.activeUsers).toBe(2);
    expect(summary.suspendedUsers).toBe(1);
    expect(summary.totalSubjects).toBe(4);
    expect(summary.pendingContentReviews).toBe(1);
    expect(summary.recentUsers).toHaveLength(3);
  });
});
