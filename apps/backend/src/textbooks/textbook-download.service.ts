import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as net from 'node:net';
import type { Response } from 'express';
import type { Textbook } from '@edunexa/shared-types';

const OFFICIAL_HOSTS = new Set([
  'edupub.gov.lk',
  'www.edupub.gov.lk',
  'e-thaksalawa.moe.gov.lk',
  'www.e-thaksalawa.moe.gov.lk',
  'nie.lk',
  'www.nie.lk',
  'moe.gov.lk',
  'www.moe.gov.lk',
]);

@Injectable()
export class TextbookDownloadService {
  private firestore() {
    return admin.firestore();
  }

  private isPrivateHostname(hostname: string): boolean {
    const normalized = hostname.trim().toLowerCase();
    if (!normalized || normalized === 'localhost' || normalized.endsWith('.localhost')) {
      return true;
    }

    if (normalized === '127.0.0.1' || normalized === '::1') {
      return true;
    }

    if (net.isIP(normalized) === 4) {
      const [a, b] = normalized.split('.').map(Number);
      if (a === 10 || a === 127 || a === 0 || a === 169 && b === 254 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31) {
        return true;
      }
    }

    if (net.isIP(normalized) === 6) {
      return normalized.startsWith('::1') || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80') || normalized.startsWith('2001:db8');
    }

    return false;
  }

  async validateOfficialUrl(rawUrl?: string): Promise<string | null> {
    if (!rawUrl) {
      return null;
    }

    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return null;
    }

    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:') {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    if (url.port && url.port !== '443') {
      return null;
    }

    if (!OFFICIAL_HOSTS.has(hostname) || this.isPrivateHostname(hostname)) {
      return null;
    }

    if (rawUrl.trim().toLowerCase().startsWith('javascript:') || rawUrl.trim().toLowerCase().startsWith('data:')) {
      return null;
    }

    return url.toString();
  }

  async assertDownloadAllowed(textbook: Textbook): Promise<void> {
    if (!textbook.isActive || textbook.verificationStatus !== 'verified') {
      throw new UnauthorizedException('The textbook is not available for download.');
    }

    if (textbook.hostingMode === 'official-link') {
      const validatedUrl = await this.validateOfficialUrl(textbook.officialFileUrl);
      if (!validatedUrl) {
        throw new UnauthorizedException('The textbook does not have an allowed official download URL.');
      }
      return;
    }

    if (textbook.hostingPermission !== 'confirmed' || !textbook.officialFileUrl) {
      throw new UnauthorizedException('This textbook is not approved for direct storage download.');
    }
  }

  async redirectToTextbook(response: Response, textbook: Textbook): Promise<void> {
    await this.assertDownloadAllowed(textbook);

    if (textbook.hostingMode === 'official-link') {
      const validatedUrl = await this.validateOfficialUrl(textbook.officialFileUrl);
      if (!validatedUrl) {
        throw new NotFoundException('Official download URL is unavailable or rejected.');
      }

      response.redirect(302, validatedUrl);
      return;
    }

    if (textbook.hostingPermission !== 'confirmed' || !textbook.officialFileUrl) {
      throw new UnauthorizedException('Storage-backed textbook downloads are not approved.');
    }

    response.redirect(302, textbook.officialFileUrl);
  }

  async recordDownload(textbookId: string) {
    const textbookRef = this.firestore().collection('textbooks').doc(textbookId);
    const textbookSnapshot = await textbookRef.get();
    if (!textbookSnapshot.exists) {
      throw new NotFoundException('Textbook not found.');
    }

    const docRef = this.firestore().collection('textbookDownloads').doc();
    await docRef.set({
      textbookId,
      downloadedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'api-download',
    }, { merge: true });

    await textbookRef.update({
      downloadCount: admin.firestore.FieldValue.increment(1),
      lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
