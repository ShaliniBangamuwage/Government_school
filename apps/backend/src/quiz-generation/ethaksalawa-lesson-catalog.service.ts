import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { getOfficialCourseUrlForGradeAndMedium, MATHEMATICS_MEDIA, normalizeMathematicsMedium } from '../mathematics-catalog/official-course-map';

export type LessonCatalogEntry = {
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  officialCourseUrl: string;
  officialSectionUrl: string;
  officialResourceUrl?: string;
  resourceType?: string;
  resourceId?: string;
  sourceHash: string;
  syncedAt: string;
};

@Injectable()
export class EthaksalawaLessonCatalogService {
  private readonly logger = new Logger(EthaksalawaLessonCatalogService.name);
  private readonly lessonCache = new Map<string, { expiresAt: number; lessons: LessonCatalogEntry[] }>();

  private getCacheKey(grade: number, medium: string): string {
    return `${Number(grade)}|${normalizeMathematicsMedium(medium)}`;
  }

  getOfficialCourseUrl(grade: number, medium: string): string {
    return getOfficialCourseUrlForGradeAndMedium(Number(grade), medium);
  }

  async fetchCourseHtml(courseUrl: string): Promise<string> {
    const response = await fetch(courseUrl, {
      headers: {
        'User-Agent': 'EduNexa/1.0 Mathematics Catalog Sync',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new BadRequestException(`Official course ${courseUrl} is temporarily unavailable.`);
    }

    return await response.text();
  }

  private isLessonLikeSectionText(text: string): boolean {
    const lower = text.toLowerCase();
    if (!lower) {
      return false;
    }

    const blocked = [
      'announcement',
      'news',
      'forum',
      'teacher guide',
      'syllabus',
      'question paper',
      'exam paper',
      'video',
      'quiz',
      'revision',
      'general',
      'course summary',
      'grade 6 mathematics',
      'grade 7 mathematics',
      'grade 8 mathematics',
      'grade 9 mathematics',
      'grade 10 mathematics',
      'grade 11 mathematics',
      'mathematics course',
      'course overview',
      'lesson overview',
      'home',
      'about',
    ];

    if (blocked.some((phrase) => lower.includes(phrase))) {
      return false;
    }

    return /(lesson|chapter|unit|module)/i.test(lower);
  }

  private parseLessonNumber(text: string): number | null {
    const match = text.match(/(?:lesson|chapter|unit|module)\s*(\d+)|(?:lesson|chapter|unit|module)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
    if (!match) {
      return null;
    }
    const raw = match[1] ?? match[2];
    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }
    return null;
  }

  private normalizeLessonTitle(text: string): string {
    const cleaned = text
      .replace(/^(lesson|chapter|unit|module)\s*(\d+|[A-Za-z]+)?\s*[:.-]?\s*/i, '')
      .replace(/\s+/g, ' ')
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .trim();
    return cleaned.length > 0 ? cleaned : '';
  }

  private buildSourceHash(source: string): string {
    return createHash('sha256').update(source).digest('hex');
  }

  parseLessonCatalog(html: string, grade: number, medium: string): LessonCatalogEntry[] {
    const $ = load(html);
    const seen = new Map<string, LessonCatalogEntry>();

    const candidateSelectors = [
      'a[href]',
      'li',
      'div',
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'tr',
      'td',
    ];

    candidateSelectors.forEach((selector) => {
      $(selector).each((_, element) => {
        const rawText = $(element).text().replace(/\s+/g, ' ').trim();
        const anchorHref = $(element).find('a[href]').first().attr('href') ?? $(element).attr('href') ?? '';
        const href = anchorHref || $(element).attr('data-href') || '';

        if (!href || !this.isLessonLikeSectionText(rawText)) {
          return;
        }

        const lessonNumber = this.parseLessonNumber(rawText);
        if (lessonNumber === null) {
          return;
        }

        const title = this.normalizeLessonTitle(rawText);
        if (!title || title.length < 3) {
          return;
        }

        const absoluteHref = href.startsWith('http')
          ? href
          : `https://e-thaksalawa.moe.gov.lk${href.startsWith('/') ? href : `/${href}`}`;

        const entry: LessonCatalogEntry = {
          lessonId: `${grade}-${medium}-${lessonNumber}-${title.slice(0, 24).replace(/[^\w\u0D80-\u0DFF]/g, '').toLowerCase() || 'lesson'}`,
          lessonNumber,
          lessonTitle: title,
          grade,
          medium: normalizeMathematicsMedium(medium) as 'Sinhala' | 'Tamil' | 'English',
          officialCourseUrl: this.getOfficialCourseUrl(grade, medium),
          officialSectionUrl: absoluteHref,
          officialResourceUrl: undefined,
          resourceType: 'lesson',
          resourceId: undefined,
          sourceHash: this.buildSourceHash(`${grade}|${medium}|${absoluteHref}|${title}`),
          syncedAt: new Date().toISOString(),
        };

        if (!seen.has(entry.lessonId)) {
          seen.set(entry.lessonId, entry);
        }
      });
    });

    return Array.from(seen.values()).sort((a, b) => a.lessonNumber - b.lessonNumber);
  }

  async syncLessonCatalog(options: { grade?: number; medium?: string; force?: boolean; all?: boolean } = {}): Promise<{ catalogId: string; courseUrl: string; lessonCount: number; lessons: LessonCatalogEntry[]; unavailableReason: string | null }> {
    const grade = Number(options.grade ?? 6);
    const medium = normalizeMathematicsMedium(options.medium ?? 'English');
    const courseUrl = this.getOfficialCourseUrl(grade, medium);

    if (!MATHEMATICS_MEDIA.includes(medium)) {
      throw new BadRequestException('Unsupported medium. Use Sinhala, Tamil, or English.');
    }

    const cacheKey = this.getCacheKey(grade, medium);
    const cached = this.lessonCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`Using cached official lessons for Grade ${grade} ${medium} from ${courseUrl}. Count=${cached.lessons.length}`);
      return {
        catalogId: `${grade}-${medium}`,
        courseUrl,
        lessonCount: cached.lessons.length,
        lessons: cached.lessons,
        unavailableReason: cached.lessons.length ? null : 'Official lessons are currently unavailable for this grade and medium.',
      };
    }

    try {
      this.logger.log(`Fetching official lessons for Grade ${grade} ${medium}. URL=${courseUrl}`);
      const html = await this.fetchCourseHtml(courseUrl);
      const lessons = this.parseLessonCatalog(html, grade, medium);
      this.logger.log(`Parsed official lessons for Grade ${grade} ${medium}. URL=${courseUrl} Count=${lessons.length}`);

      if (!lessons.length) {
        this.logger.warn(`No official lesson titles were extracted for Grade ${grade} ${medium}. URL=${courseUrl}`);
        return {
          catalogId: `${grade}-${medium}`,
          courseUrl,
          lessonCount: 0,
          lessons: [],
          unavailableReason: 'Official lessons are currently unavailable for this grade and medium.',
        };
      }

      this.lessonCache.set(cacheKey, { expiresAt: Date.now() + 60 * 60 * 1000, lessons });

      return {
        catalogId: `${grade}-${medium}`,
        courseUrl,
        lessonCount: lessons.length,
        lessons,
        unavailableReason: null,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Official course fetch failed.';
      this.logger.warn(`Unable to fetch official lessons for Grade ${grade} ${medium}. URL=${courseUrl}. Reason=${reason}`);
      return {
        catalogId: `${grade}-${medium}`,
        courseUrl,
        lessonCount: 0,
        lessons: [],
        unavailableReason: 'Official lessons are currently unavailable for this grade and medium.',
      };
    }
  }
}