import { EthaksalawaMathematicsParserService } from './ethaksalawa-mathematics-parser.service';

describe('EthaksalawaMathematicsParserService', () => {
  let service: EthaksalawaMathematicsParserService;

  beforeEach(() => {
    service = new EthaksalawaMathematicsParserService();
  });

  it('accepts only official Sri Lankan education hosts and rejects plugin or untrusted links', () => {
    expect(service.normalizeOfficialUrl('https://e-thaksalawa.moe.gov.lk/grade-6/mathematics')).toContain('e-thaksalawa.moe.gov.lk');
    expect(service.normalizeOfficialUrl('https://drive.google.com/file/d/123/view')).toBeNull();
    expect(service.normalizeOfficialUrl('javascript:alert(1)')).toBeNull();
  });

  it('normalizes legacy medium aliases used by older catalog exports', () => {
    expect(service.normalizeMedium('SM')).toBe('Sinhala');
    expect(service.normalizeMedium('TM')).toBe('Tamil');
    expect(service.normalizeMedium('EM')).toBe('English');
    expect(service.normalizeMedium('si')).toBe('Sinhala');
    expect(service.normalizeMedium('ta')).toBe('Tamil');
    expect(service.normalizeMedium('en')).toBe('English');
  });

  it('parses curriculum entries into safe textbook records with approved metadata', () => {
    const catalog = {
      source: 'official-sri-lanka-government',
      entries: [
        {
          id: 'math-g6-en',
          grade: 6,
          medium: 'English',
          title: 'Mathematics Grade 6',
          description: 'Official mathematics textbook',
          officialPageUrl: 'https://www.edupub.gov.lk/',
          officialPdfUrl: 'https://www.edupub.gov.lk/',
          sourceAuthority: 'Educational Publications Department, Sri Lanka',
        },
        {
          id: 'math-g7-si',
          grade: 7,
          medium: 'Sinhala',
          title: 'Mathematics Grade 7',
          description: 'Official mathematics textbook',
          officialPageUrl: 'https://e-thaksalawa.moe.gov.lk/',
          officialPdfUrl: 'https://drive.google.com/file/d/test/view',
          sourceAuthority: 'Educational Publications Department, Sri Lanka',
        },
      ],
    };

    const result = service.parseCatalog(catalog as any);

    expect(result).toHaveLength(2);
    expect(result[0].grade).toBe(6);
    expect(result[0].officialPageUrl).toBe('https://www.edupub.gov.lk/');
    expect(result[0].verificationStatus).toBe('verified');
    expect(result[1].verificationStatus).toBe('pending');
    expect(result[1].officialPdfUrl).toBeNull();
  });
});
