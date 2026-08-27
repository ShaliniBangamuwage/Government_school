import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class QuestionValidatorService {
  private isMeaningfulText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length >= 10;
  }

  private normalizeOptionText(option: unknown): string {
    return typeof option === 'string' ? option.trim() : String(option ?? '').trim();
  }

  validateQuestion(question: Record<string, unknown>) {
    const questionText = this.isMeaningfulText(question.questionText) ? question.questionText : this.isMeaningfulText(question.prompt) ? question.prompt : '';
    if (!questionText) {
      throw new BadRequestException('Question text is missing or too short.');
    }

    const optionList = Array.isArray(question.options) ? question.options : [];
    if (optionList.length !== 4) {
      throw new BadRequestException('Every MCQ must contain exactly four answer options.');
    }

    const normalizedOptions = optionList.map((option) => this.normalizeOptionText(option));
    const uniqueOptions = new Set(normalizedOptions.filter(Boolean));
    if (uniqueOptions.size !== 4) {
      throw new BadRequestException('Duplicate or invalid options found in the question.');
    }

    const badPatterns = ['all of the above', 'none of the above'];
    if (normalizedOptions.some((option) => badPatterns.includes(option.toLowerCase()))) {
      throw new BadRequestException('Distractors cannot use all-of-the-above or none-of-the-above patterns.');
    }

    const correctOptionId = String(question.correctOptionId ?? question.correctAnswer ?? '');
    if (!['A', 'B', 'C', 'D'].includes(correctOptionId.toUpperCase())) {
      throw new BadRequestException('The correct option must be A, B, C or D.');
    }

    if (!this.isMeaningfulText(question.explanation)) {
      throw new BadRequestException('Each question must include an explanation.');
    }

    if (!this.isMeaningfulText(question.sourceLessonTitle) || !question.sourceLessonId || !question.sourceContentHash) {
      throw new BadRequestException('Each question must include source grounding metadata.');
    }

    const sourceExcerpt = this.isMeaningfulText(question.sourceExcerpt) ? question.sourceExcerpt : '';
    if (sourceExcerpt.length < 20) {
      throw new BadRequestException('Source excerpt is required for teacher review.');
    }
  }

  validateQuestionBatch(questions: Record<string, unknown>[]) {
    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new BadRequestException('A quiz must contain exactly 10 valid questions.');
    }

    const answerCounts = { A: 0, B: 0, C: 0, D: 0 };
    for (const question of questions) {
      this.validateQuestion(question);
      const option = String(question.correctOptionId ?? question.correctAnswer ?? '').toUpperCase();
      if (option in answerCounts) {
        answerCounts[option as keyof typeof answerCounts] += 1;
      }
    }

    const totalAnswers = Object.values(answerCounts).reduce((sum, value) => sum + value, 0);
    if (totalAnswers !== 10) {
      throw new BadRequestException('Question validation failed because the correct-answer distribution could not be confirmed.');
    }

    const maxAnswerCount = Math.max(...Object.values(answerCounts));
    if (maxAnswerCount > 3) {
      throw new BadRequestException('Correct answers must be distributed across A, B, C and D and not concentrated in one option.');
    }
  }
}
