import { Injectable } from '@nestjs/common';

export interface ParsedCoursePage {
  courseUrl: string;
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  title: string;
  sections: Array<{ chapterNumber: number; chapterTitle: string; href?: string; url?: string; source?: string }>; 
}

@Injectable()
export class MathematicsCourseParserService {
  private readonly allowedDomains = new Set(['e-thaksalawa.moe.gov.lk', 'edupub.gov.lk', 'www.edupub.gov.lk', 'www.nie.lk']);

  normalizeGrade(value: unknown): number | null {
    const grade = Number(value);
    return [6, 7, 8, 9, 10, 11].includes(grade) ? grade : null;
  }

  normalizeMedium(value: unknown): 'Sinhala' | 'Tamil' | 'English' {
    const normalized = String(value ?? 'English').trim().toLowerCase();
    if (normalized === 'sinhala') return 'Sinhala';
    if (normalized === 'tamil') return 'Tamil';
    return 'English';
  }

  isAllowedOfficialUrl(rawUrl?: string | null): boolean {
    if (!rawUrl) return false;

    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:') return false;
      if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) return false;
      return this.allowedDomains.has(url.hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  extractSections(html: string, courseUrl: string, grade: number, medium: 'Sinhala' | 'Tamil' | 'English'): Array<{ chapterNumber: number; chapterTitle: string; href?: string; url?: string; source?: string }> {
    const sections: Array<{ chapterNumber: number; chapterTitle: string; href?: string; url?: string; source?: string }> = [];

    const matches = [...html.matchAll(/(?:Text\s*Book|Textbook|Text\s*-\s*Lesson|Text\s*Book\s*-\s*Lesson)[^<\n]{0,180}/gi)];

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const startIndex = Math.max(0, match.index ?? 0);
      const window = html.slice(startIndex, startIndex + 500);
      const titleMatch = window.match(/(?:chapter|lesson|unit)[^\n<]{0,60}[:\-]?\s*([A-Za-z0-9][^<\n]{0,80})/i) ?? window.match(/([A-Za-z][A-Za-z0-9\s&/\-]{4,80})/i);
      const chapterTitle = (titleMatch?.[1] ?? `Chapter ${index + 1}`).replace(/\s+/g, ' ').trim();
      const resourceHref = window.match(/href=["']([^"']+)["']/i)?.[1] ?? undefined;

      if (resourceHref) {
        sections.push({
          chapterNumber: index + 1,
          chapterTitle: chapterTitle || `Chapter ${index + 1}`,
          href: resourceHref,
          url: resourceHref.startsWith('http') ? resourceHref : new URL(resourceHref, courseUrl).toString(),
          source: 'official-course-page',
        });
      } else {
        sections.push({
          chapterNumber: index + 1,
          chapterTitle: chapterTitle || `Chapter ${index + 1}`,
          url: courseUrl,
          source: 'official-course-page',
        });
      }
    }

    if (sections.length === 0) {
      return [{ chapterNumber: 1, chapterTitle: `${medium} Grade ${grade} Mathematics`, url: courseUrl, source: 'official-course-page' }];
    }

    return sections;
  }

  parseCoursePage(html: string, courseUrl: string, grade: number, medium: 'Sinhala' | 'Tamil' | 'English'): ParsedCoursePage {
    const titleMatch = html.match(/<title>(.*?)<\/title>/is);
    const title = (titleMatch?.[1] ?? `${medium} Grade ${grade} Mathematics`).replace(/\s+/g, ' ').trim();

    return {
      courseUrl,
      grade,
      medium,
      title,
      sections: this.extractSections(html, courseUrl, grade, medium),
    };
  }
}
