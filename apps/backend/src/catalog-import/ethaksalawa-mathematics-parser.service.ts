import { Injectable } from '@nestjs/common';
import { normalizeMathematicsMedium } from '../mathematics-catalog/official-course-map';

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

export interface ParsedMathematicsCatalogEntry {
  id: string;
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  title: string;
  officialPageUrl: string | null;
  officialPdfUrl: string | null;
  description?: string;
  sourceDomain?: string;
  sourceAuthority: 'Educational Publications Department, Sri Lanka';
  verificationStatus: 'verified' | 'pending';
  isActive: boolean;
}

@Injectable()
export class EthaksalawaMathematicsParserService {
  normalizeMedium(value?: string): 'Sinhala' | 'Tamil' | 'English' {
    return normalizeMathematicsMedium(value);
  }

  normalizeOfficialUrl(rawUrl?: string | null): string | null {
    if (!rawUrl) {
      return null;
    }

    const value = rawUrl.trim();
    if (!value || value.toLowerCase().startsWith('javascript:') || value.toLowerCase().startsWith('data:')) {
      return null;
    }

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return null;
    }

    if (parsed.protocol !== 'https:') {
      return null;
    }

    if (parsed.username || parsed.password || parsed.port) {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!OFFICIAL_HOSTS.has(hostname)) {
      return null;
    }

    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return null;
    }

    return parsed.toString();
  }

  parseCatalog(rawCatalog: unknown): ParsedMathematicsCatalogEntry[] {
    const entries = Array.isArray(rawCatalog) ? rawCatalog : rawCatalog && typeof rawCatalog === 'object' && Array.isArray((rawCatalog as { entries?: unknown[] }).entries) ? (rawCatalog as { entries: unknown[] }).entries : [];

    const parsedEntries: Array<ParsedMathematicsCatalogEntry | null> = entries.map((entry, index) => {
      const candidate = (entry ?? {}) as Record<string, unknown>;
      const grade = Number(candidate.grade ?? 0);
      const medium = this.normalizeMedium(typeof candidate.medium === 'string' ? candidate.medium : 'English');
      const pageUrl = this.normalizeOfficialUrl(typeof candidate.officialPageUrl === 'string' ? candidate.officialPageUrl : typeof candidate.sourceUrl === 'string' ? candidate.sourceUrl : undefined);
      const pdfUrl = this.normalizeOfficialUrl(typeof candidate.officialPdfUrl === 'string' ? candidate.officialPdfUrl : typeof candidate.pdfUrl === 'string' ? candidate.pdfUrl : typeof candidate.downloadUrl === 'string' ? candidate.downloadUrl : undefined);
      const title = String(candidate.title ?? candidate.name ?? `Mathematics Grade ${grade || index + 1}`).trim();

      if (!Number.isFinite(grade) || grade < 6 || grade > 13) {
        return null;
      }

      const sourceAuthorityValue = String(candidate.sourceAuthority ?? 'Educational Publications Department, Sri Lanka').trim();
      const sourceAuthority: 'Educational Publications Department, Sri Lanka' = sourceAuthorityValue === 'National Institute of Education, Sri Lanka'
        ? 'Educational Publications Department, Sri Lanka'
        : 'Educational Publications Department, Sri Lanka';
      const verified = Boolean(pageUrl && pdfUrl);

      return {
        id: String(candidate.id ?? `math-g${grade}-${medium.toLowerCase()}-${index + 1}`),
        grade,
        medium,
        title,
        officialPageUrl: pageUrl,
        officialPdfUrl: pdfUrl,
        description: typeof candidate.description === 'string' ? candidate.description : undefined,
        sourceDomain: pageUrl ? new URL(pageUrl).hostname : undefined,
        sourceAuthority,
        verificationStatus: verified ? 'verified' : 'pending',
        isActive: verified,
      } satisfies ParsedMathematicsCatalogEntry;
    });

    return parsedEntries.filter((entry): entry is ParsedMathematicsCatalogEntry => entry !== null);
  }
}
