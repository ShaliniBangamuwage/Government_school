import { MathematicsCatalogService } from './mathematics-catalog.service';

describe('MathematicsCatalogService', () => {
  it('filters only approved, verified and enabled mathematics textbooks for student access', async () => {
    const service = new MathematicsCatalogService({
      getFirestore: () => ({
        collection: (name: string) => ({
          get: async () => {
            if (name === 'mathematicsOfferings') {
              return {
                docs: [
                  { id: 'g9-en', data: () => ({ subjectId: 'mathematics', grade: 9, medium: 'English', studentAccessEnabled: true }) },
                ],
              };
            }

            return {
              docs: [
                {
                  id: 'ok',
                  data: () => ({
                    subjectId: 'mathematics',
                    grade: 9,
                    medium: 'English',
                    verificationStatus: 'verified',
                    approvalStatus: 'approved',
                    accessEnabled: true,
                    title: 'Approved',
                    subjectName: 'Mathematics',
                    chapterNumber: 1,
                    chapterTitle: 'Numbers',
                    resourceType: 'textbook-chapter',
                  }),
                },
                {
                  id: 'pending',
                  data: () => ({
                    subjectId: 'mathematics',
                    grade: 9,
                    medium: 'English',
                    verificationStatus: 'pending',
                    approvalStatus: 'approved',
                    accessEnabled: true,
                    title: 'Pending',
                    subjectName: 'Mathematics',
                    chapterNumber: 2,
                    chapterTitle: 'Algebra',
                    resourceType: 'textbook-chapter',
                  }),
                },
                {
                  id: 'unapproved',
                  data: () => ({
                    subjectId: 'mathematics',
                    grade: 9,
                    medium: 'English',
                    verificationStatus: 'verified',
                    approvalStatus: 'pending',
                    accessEnabled: true,
                    title: 'Pending Approval',
                    subjectName: 'Mathematics',
                    chapterNumber: 3,
                    chapterTitle: 'Geometry',
                    resourceType: 'textbook-chapter',
                  }),
                },
                {
                  id: 'disabled',
                  data: () => ({
                    subjectId: 'mathematics',
                    grade: 9,
                    medium: 'English',
                    verificationStatus: 'verified',
                    approvalStatus: 'approved',
                    accessEnabled: false,
                    title: 'Disabled',
                    subjectName: 'Mathematics',
                    chapterNumber: 4,
                    chapterTitle: 'Measures',
                    resourceType: 'textbook-chapter',
                  }),
                },
                {
                  id: 'wrong-medium',
                  data: () => ({
                    subjectId: 'mathematics',
                    grade: 9,
                    medium: 'Sinhala',
                    verificationStatus: 'verified',
                    approvalStatus: 'approved',
                    accessEnabled: true,
                    title: 'Other medium',
                    subjectName: 'Mathematics',
                    chapterNumber: 5,
                    chapterTitle: 'Statistics',
                    resourceType: 'textbook-chapter',
                  }),
                },
              ],
            };
          },
        }),
      }),
    } as any);

    const items = await service.listStudentTextbooks({ grade: 9, medium: 'English' });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('ok');
  });

  it('shows all admin-enabled grade access rows instead of locking students to their own grade', async () => {
    const service = new MathematicsCatalogService({
      getFirestore: () => ({
        collection: (name: string) => ({
          get: async () => {
            if (name === 'mathematicsOfferings') {
              return {
                docs: [
                  { id: 'g7-en', data: () => ({ subjectId: 'mathematics', grade: 7, medium: 'English', studentAccessEnabled: true }) },
                  { id: 'g9-en', data: () => ({ subjectId: 'mathematics', grade: 9, medium: 'English', studentAccessEnabled: true }) },
                  { id: 'g10-en', data: () => ({ subjectId: 'mathematics', grade: 10, medium: 'English', studentAccessEnabled: false }) },
                ],
              };
            }

            return {
              docs: [
                {
                  id: 'grade7',
                  data: () => ({ subjectId: 'mathematics', grade: 7, medium: 'English', verificationStatus: 'verified', approvalStatus: 'approved', accessEnabled: true, title: 'Grade 7', subjectName: 'Mathematics', chapterNumber: 1, chapterTitle: 'Algebra', resourceType: 'textbook-chapter' }),
                },
                {
                  id: 'grade9',
                  data: () => ({ subjectId: 'mathematics', grade: 9, medium: 'English', verificationStatus: 'verified', approvalStatus: 'approved', accessEnabled: true, title: 'Grade 9', subjectName: 'Mathematics', chapterNumber: 1, chapterTitle: 'Geometry', resourceType: 'textbook-chapter' }),
                },
                {
                  id: 'grade10',
                  data: () => ({ subjectId: 'mathematics', grade: 10, medium: 'English', verificationStatus: 'verified', approvalStatus: 'approved', accessEnabled: true, title: 'Grade 10', subjectName: 'Mathematics', chapterNumber: 1, chapterTitle: 'Trigonometry', resourceType: 'textbook-chapter' }),
                },
              ],
            };
          },
        }),
      }),
    } as any);

    const items = await service.listStudentTextbooks({ grade: 6, medium: 'English' });

    expect(items.map((item) => item.grade).sort((a, b) => a - b)).toEqual([7, 9]);
  });

  it('maps each mathematics grade and medium to the correct official e-Thaksalawa collection page', () => {
    const service = new MathematicsCatalogService({ getFirestore: () => ({ collection: () => ({ get: async () => ({ docs: [] }) }) }) } as any);

    const expected: Record<string, string> = {
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

    for (const [grade, medium] of Object.keys(expected).map((key) => key.split('|') as [string, string])) {
      expect((service as any).getOfficialCourseUrlForGradeAndMedium(Number(grade), medium)).toBe(expected[`${grade}|${medium}`]);
    }
  });
});
