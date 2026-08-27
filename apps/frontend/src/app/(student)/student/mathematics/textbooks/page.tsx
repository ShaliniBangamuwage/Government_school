'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useAuth } from '@/lib/auth/auth-context';

type MathematicsTextbook = {
  id: string;
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  title: string;
  chapterNumber?: number;
  chapterTitle?: string;
  verificationStatus?: 'verified' | 'pending' | 'broken';
  accessEnabled?: boolean;
  sourceUrl?: string | null;
  officialCourseUrl?: string | null;
  officialResourceUrl?: string | null;
  resolvedPdfUrl?: string | null;
};

const OFFICIAL_COURSE_BY_GRADE_AND_MEDIUM: Record<string, string> = {
  '6|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=313',
  '6|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=57',
  '6|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=288',
  '7|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=341',
  '7|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=90',
  '7|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=451',
  '8|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=342',
  '8|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=103',
  '8|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=531',
  '9|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=339',
  '9|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=150',
  '9|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=817',
  '10|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=380',
  '10|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=247',
  '10|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=842',
  '11|Sinhala': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=435',
  '11|Tamil': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=200',
  '11|English': 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=799',
};

function validateOfficialCourseUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    const isHttps = url.protocol === 'https:';
    const isAllowedHost = url.hostname === 'e-thaksalawa.moe.gov.lk';
    const isAllowedPath = url.pathname === '/lcms/course/view.php';
    const id = url.searchParams.get('id');
    const isNumericId = id !== null && /^\d+$/.test(id);

    if (!isHttps || !isAllowedHost || !isAllowedPath || !isNumericId) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getTextbookSourceUrl(textbook: MathematicsTextbook): string {
  const directSourceUrl = validateOfficialCourseUrl(textbook.sourceUrl ?? textbook.officialCourseUrl ?? textbook.officialResourceUrl ?? textbook.resolvedPdfUrl);
  if (directSourceUrl) {
    return directSourceUrl;
  }

  const gradeMediumKey = `${textbook.grade}|${textbook.medium}` as const;
  return OFFICIAL_COURSE_BY_GRADE_AND_MEDIUM[gradeMediumKey] ?? 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=313';
}

export default function StudentMathematicsTextbooksPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<MathematicsTextbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth<{ items?: MathematicsTextbook[] }>('/api/mathematics/textbooks');
        const filtered = (response.items ?? []).filter(
          (item) => item.accessEnabled !== false && item.verificationStatus === 'verified',
        );
        setItems(filtered);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load Mathematics textbooks.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-6xl space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Mathematics</p>
            <h1 className="mt-2 text-3xl font-bold">Textbooks</h1>
          </header>

          {error ? (
            <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading Mathematics textbooks…</div>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">No verified Mathematics textbooks are available for your grade and language.</div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((textbook) => {
                const textbookSourceUrl = getTextbookSourceUrl(textbook);

                return (
                  <article key={textbook.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Grade {textbook.grade} · {textbook.medium}</p>
                    <h2 className="mt-3 text-xl font-semibold text-white">{textbook.title}</h2>
                    {textbook.chapterTitle ? <p className="mt-2 text-sm text-slate-300">{textbook.chapterTitle}</p> : null}
                    <div className="mt-5 flex flex-wrap gap-3">
                      <a
                        href={textbookSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (process.env.NODE_ENV !== 'production') {
                            console.log('Opening official course:', textbook.sourceUrl ?? textbookSourceUrl);
                          }
                        }}
                        className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950"
                      >
                        Open collection
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
