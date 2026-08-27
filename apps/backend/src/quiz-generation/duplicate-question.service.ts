import { BadRequestException, Injectable } from '@nestjs/common';
import type * as admin from 'firebase-admin';

@Injectable()
export class DuplicateQuestionService {
  private normalizeQuestionText(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async rejectIfDuplicate(question: Record<string, unknown>, firestore?: ReturnType<typeof admin.firestore> | null) {
    if (!firestore || typeof firestore.collection !== 'function') {
      return;
    }

    const questionText = this.normalizeQuestionText(question.questionText ?? question.prompt);
    if (!questionText) {
      return;
    }

    const snapshot = await firestore.collection('questionBank').limit(200).get();

    for (const doc of snapshot.docs) {
      const existingText = this.normalizeQuestionText(doc.data()?.questionText ?? doc.data()?.prompt);
      if (existingText && existingText === questionText) {
        throw new BadRequestException('Duplicate or near-duplicate question rejected.');
      }

      if (existingText && questionText.length > 20) {
        const similarity = existingText.split(' ').filter((word) => questionText.includes(word)).length / Math.max(existingText.split(' ').length, 1);
        if (similarity >= 0.8) {
          throw new BadRequestException('Duplicate or near-duplicate question rejected.');
        }
      }
    }
  }
}
