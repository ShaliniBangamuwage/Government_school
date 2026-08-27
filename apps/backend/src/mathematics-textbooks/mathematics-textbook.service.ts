import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfiguredAiProviderService } from '../quiz-generation/providers/configured-ai-provider.service';
import { getOfficialMathematicsTextbookPdfUrl, normalizeMathematicsMedium } from './official-textbook-map';

export type OfficialMathematicsLesson = {
  id: string;
  title: string;
  grade: number;
  medium: 'Sinhala' | 'English' | 'Tamil';
  textbookUrl: string;
  startPage: number;
  endPage: number;
  extractedText: string;
  sourceType: 'official-textbook-pdf';
};

export type OfficialMathematicsLessonResponse = {
  grade: number;
  medium: 'Sinhala' | 'English' | 'Tamil';
  textbookUrl: string;
  lessons: OfficialMathematicsLesson[];
  unavailableReason: string | null;
};

export type GeneratedMcq = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  sourceLessonTitle: string;
  sourcePages: string;
};

const CACHE = new Map<string, { lessons: OfficialMathematicsLesson[]; textbookUrl: string; fetchedAt: number }>();

@Injectable()
export class MathematicsTextbookService {
  private readonly logger = new Logger(MathematicsTextbookService.name);

  constructor(private readonly aiProvider: ConfiguredAiProviderService) {}

  async validatePdfResponse(response: { status: number; headers?: Record<string, string | undefined>; buffer?: Buffer }): Promise<void> {
    const status = Number(response?.status ?? 0);
    const contentType = String(response?.headers?.['content-type'] ?? response?.headers?.['Content-Type'] ?? '');
    const buffer = response?.buffer ?? Buffer.alloc(0);

    if (status !== 200) {
      throw new BadRequestException(`The official Mathematics textbook PDF request failed; expected status 200 but received ${status}.`);
    }

    if (!contentType.toLowerCase().includes('pdf') && !(buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF')) {
      throw new BadRequestException('The textbook URL did not resolve to a valid PDF document.');
    }
  }

  extractLessonTitles(rawText: string, grade: number, medium: string): string[] {
    const text = String(rawText ?? '').replace(/\r/g, ' ');
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const markers = [
      'Table of Contents', 'Contents', 'Chapter', 'Unit', 'Lesson', 'Topic', 'Section',
    ];

    const matches = new Set<string>();
    const pattern = /(Chapter\s*\d+[:.-]?\s*[^\n]{1,120}|Unit\s*\d+[:.-]?\s*[^\n]{1,120}|Lesson\s*\d+[:.-]?\s*[^\n]{1,120}|Topic\s*\d+[:.-]?\s*[^\n]{1,120}|Section\s*\d+[:.-]?\s*[^\n]{1,120})/gi;

    const directMatches = text.match(pattern) ?? [];
    for (const item of directMatches) {
      const clean = item.replace(/\s+/g, ' ').trim();
      if (clean.length > 6 && clean.length < 180) {
        matches.add(clean.replace(/^[A-Z]\s*[:.-]\s*/i, '').replace(/\s+/g, ' ').trim());
      }
    }

    const hasTableOfContents = markers.some((marker) => text.toLowerCase().includes(marker.toLowerCase()));
    if (!hasTableOfContents && matches.size === 0) {
      const fallback = text
        .split(/(?=(?:Chapter|Unit|Lesson|Topic|Section)\s*\d)/i)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 12)
        .slice(0, 12);
      for (const item of fallback) {
        matches.add(item.replace(/\s+/g, ' ').trim());
      }
    }

    if (matches.size === 0) {
      const words = normalized.split(/[.;\n]/).map((part) => part.trim()).filter(Boolean);
      for (const word of words) {
        if (word.length > 24 && word.length < 140 && /[A-Za-z]/.test(word)) {
          matches.add(word);
          if (matches.size >= 12) break;
        }
      }
    }

    const sorted = Array.from(matches)
      .map((item) => item.replace(/^(?:Chapter|Unit|Lesson|Topic|Section)\s*\d+\s*[:.-]?\s*/i, '').trim())
      .filter((item) => item.length > 3 && !/^\d+$/.test(item))
      .slice(0, 20);

    return sorted;
  }

  async getLessonsForGradeAndMedium(grade: number, medium: string): Promise<OfficialMathematicsLessonResponse> {
    const normalizedGrade = Number(grade);
    const normalizedMedium = normalizeMathematicsMedium(medium);
    const cacheKey = `${normalizedGrade}|${normalizedMedium}`;

    const cached = CACHE.get(cacheKey);
    if (cached) {
      return {
        grade: normalizedGrade,
        medium: normalizedMedium,
        textbookUrl: cached.textbookUrl,
        lessons: cached.lessons,
        unavailableReason: null,
      };
    }

    try {
      const textbookUrl = getOfficialMathematicsTextbookPdfUrl(normalizedGrade, normalizedMedium);
      const response = await fetch(textbookUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          Accept: 'application/pdf,application/octet-stream,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      const finalUrl = response.url || textbookUrl;
      const buffer = Buffer.from(await response.arrayBuffer());
      await this.validatePdfResponse({ status: response.status, headers: Object.fromEntries(response.headers.entries()), buffer });

      const parsedModule = (await import('pdf-parse')) as unknown as
        | ((buffer: Buffer) => Promise<{ text?: string }>)
        | { default?: (buffer: Buffer) => Promise<{ text?: string }> };
      const pdfParser = typeof parsedModule === 'function'
        ? parsedModule
        : parsedModule.default ?? (() => Promise.resolve({ text: '' }));
      const pdfText = await pdfParser(buffer);
      const text = String(pdfText?.text ?? '');
      const titles = this.extractLessonTitles(text, normalizedGrade, normalizedMedium);

      const lessons: OfficialMathematicsLesson[] = titles.map((title, index) => {
        const pageNumber = index + 1;
        return {
          id: `math-${normalizedGrade}-${normalizedMedium.toLowerCase()}-${index + 1}`,
          title,
          grade: normalizedGrade,
          medium: normalizedMedium,
          textbookUrl: finalUrl,
          startPage: pageNumber,
          endPage: pageNumber,
          extractedText: text.slice(0, 2000),
          sourceType: 'official-textbook-pdf',
        };
      });

      const result = {
        grade: normalizedGrade,
        medium: normalizedMedium,
        textbookUrl: finalUrl,
        lessons,
        unavailableReason: lessons.length ? null : 'Official Mathematics textbook content is unavailable for this Grade and Medium.',
      };

      if (lessons.length) {
        CACHE.set(cacheKey, { lessons, textbookUrl: finalUrl, fetchedAt: Date.now() });
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The official textbook PDF could not be read.';
      const fallbackUrl = (() => {
        try {
          return getOfficialMathematicsTextbookPdfUrl(normalizedGrade, normalizedMedium);
        } catch {
          return '';
        }
      })();

      this.logger.error(`Grade=${normalizedGrade} Medium=${normalizedMedium} URL=${fallbackUrl || 'unconfigured'} Error=${message}`);
      return {
        grade: normalizedGrade,
        medium: normalizedMedium,
        textbookUrl: fallbackUrl,
        lessons: [],
        unavailableReason: `Official Mathematics textbook content is unavailable for Grade ${normalizedGrade} ${normalizedMedium}. ${message}`,
      };
    }
  }

  validateGeneratedQuiz(questions: GeneratedMcq[]): void {
    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new BadRequestException('The quiz must contain exactly 10 questions.');
    }

    for (const question of questions) {
      if (!question || !question.question || !question.explanation || !question.sourceLessonTitle || !question.sourcePages) {
        throw new BadRequestException('Each quiz question must include a question, explanation, source title, and source pages.');
      }

      if (!Array.isArray(question.options) || question.options.length !== 4) {
        throw new BadRequestException('Each quiz question must contain exactly four options.');
      }

      if (!Number.isInteger(question.correctAnswerIndex) || question.correctAnswerIndex < 0 || question.correctAnswerIndex > 3) {
        throw new BadRequestException('Each question needs a valid correct answer index between 0 and 3.');
      }
    }
  }

  async generateQuizForLesson(grade: number, medium: string, lessonId: string): Promise<{ questions: GeneratedMcq[] }> {
    const result = await this.getLessonsForGradeAndMedium(grade, medium);
    if (!result.lessons.length) {
      throw new BadRequestException(result.unavailableReason ?? 'No official textbook lesson content is available for this Grade and Medium.');
    }

    const selectedLesson = result.lessons.find((lesson) => lesson.id === lessonId) ?? result.lessons[0];
    if (!selectedLesson) {
      throw new BadRequestException('The selected lesson does not exist in the official textbook content.');
    }

    if (!selectedLesson.extractedText || selectedLesson.extractedText.trim().length < 50) {
      throw new BadRequestException('The official textbook lesson text is empty, so a quiz cannot be generated.');
    }

    const prompt = `Generate exactly 10 mathematics MCQ questions grounded only in the supplied textbook content. Use the lesson title: ${selectedLesson.title}. Use the textbook content below. Return JSON with an array named "questions". Each question must have: question, options (exactly 4 strings), correctAnswerIndex (0-3), explanation, sourceLessonTitle, sourcePages.`;

    const aiJson = await this.aiProvider.generate(prompt, process.env.AI_MODEL || 'openai/gpt-oss-20b', [selectedLesson.extractedText]);
    const payload = (aiJson as any)?.questions ?? aiJson;
    const questions = Array.isArray(payload) ? payload : (Array.isArray((payload as any)?.questions) ? (payload as any).questions : []);

    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new BadRequestException('Groq did not return a valid 10-question Mathematics quiz.');
    }

    this.validateGeneratedQuiz(questions);

    return {
      questions: questions.map((question, index) => ({
        question: String(question.question ?? `Question ${index + 1}`),
        options: Array.isArray(question.options) ? question.options.map((option: unknown) => String(option)) : ['A', 'B', 'C', 'D'],
        correctAnswerIndex: Number(question.correctAnswerIndex ?? 0),
        explanation: String(question.explanation ?? 'No explanation provided.'),
        sourceLessonTitle: String(question.sourceLessonTitle ?? selectedLesson.title),
        sourcePages: String(question.sourcePages ?? `${selectedLesson.startPage}-${selectedLesson.endPage}`),
      })),
    };
  }
}
