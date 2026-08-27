import { EthaksalawaLessonCatalogService } from './ethaksalawa-lesson-catalog.service';

describe('EthaksalawaLessonCatalogService', () => {
  it('discovers official mathematics lessons and preserves the canonical public source URL', () => {
    const service = new EthaksalawaLessonCatalogService();
    const html = `
      <html>
        <body>
          <ul>
            <li><a href="/lcms/course/view.php?id=342">Grade 8 Mathematics</a></li>
            <li><a href="/lcms/course/view.php?id=342&section=3">Lesson 1: Numbers</a></li>
            <li><a href="/lcms/course/view.php?id=342&section=5">Lesson 3: Fractions</a></li>
            <li><a href="/lcms/course/view.php?id=342&section=4">Lesson 2: Geometry</a></li>
            <li><a href="/lcms/course/view.php?id=342&section=6">Announcements</a></li>
          </ul>
        </body>
      </html>
    `;

    const lessons = service.parseLessonCatalog(html, 8, 'Sinhala');

    expect(lessons.map((lesson) => lesson.lessonNumber)).toEqual([1, 2, 3]);
    expect(lessons[0].officialCourseUrl).toBe('https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=342');
    expect(lessons[0].officialSectionUrl).toBe('https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=342&section=3');
    expect(lessons[0].sourceHash.length).toBeGreaterThan(20);
  });

  it('returns different lesson sets for different official grade pages', async () => {
    const service = new EthaksalawaLessonCatalogService();

    jest.spyOn(service, 'fetchCourseHtml').mockImplementation(async (courseUrl: string) => {
      if (courseUrl.includes('id=817')) {
        return `
          <html><body>
            <ul>
              <li><a href="/lcms/course/view.php?id=817&section=1">Lesson 1: Real numbers</a></li>
              <li><a href="/lcms/course/view.php?id=817&section=2">Lesson 2: Algebra</a></li>
            </ul>
          </body></html>
        `;
      }

      return `
        <html><body>
          <ul>
            <li><a href="/lcms/course/view.php?id=842&section=3">Lesson 1: Coordinate geometry</a></li>
            <li><a href="/lcms/course/view.php?id=842&section=4">Lesson 2: Trigonometry</a></li>
          </ul>
        </body></html>
      `;
    });

    const grade9 = await service.syncLessonCatalog({ grade: 9, medium: 'English' });
    const grade10 = await service.syncLessonCatalog({ grade: 10, medium: 'English' });

    expect(grade9.lessons.map((lesson) => lesson.lessonTitle)).toEqual(['Real numbers', 'Algebra']);
    expect(grade10.lessons.map((lesson) => lesson.lessonTitle)).toEqual(['Coordinate geometry', 'Trigonometry']);
    expect(grade9.lessons[0].lessonTitle).not.toBe(grade10.lessons[0].lessonTitle);
  });

  it('returns an unavailable state instead of generic fallback lessons when the official source cannot be fetched', async () => {
    const service = new EthaksalawaLessonCatalogService();
    jest.spyOn(service, 'fetchCourseHtml').mockRejectedValue(new Error('network timeout'));

    const result = await service.syncLessonCatalog({ grade: 11, medium: 'Tamil' });

    expect(result.lessonCount).toBe(0);
    expect(result.lessons).toEqual([]);
    expect(result.unavailableReason).toContain('Official lessons are currently unavailable');
  });
});
