import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { TextbookVerificationStatus } from '@edunexa/shared-types';

@Injectable()
export class TextbookVerificationService {
  private firestore() {
    return admin.firestore();
  }

  async markVerificationStatus(textbookId: string, status: TextbookVerificationStatus) {
    await this.firestore().collection('textbooks').doc(textbookId).set(
      {
        verificationStatus: status,
        lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: status === 'verified',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { textbookId, verificationStatus: status };
  }
}
