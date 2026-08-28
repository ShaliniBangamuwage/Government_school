'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { fetchWithAuth } from '@/lib/api/client';

type Medium = 'Sinhala' | 'Tamil' | 'English';
type GradeRow = {
  id: string;
  grade: number;
  medium: Medium;
  textbookCount: number;
  verifiedTextbookCount: number;
  studentAccessEnabled: boolean;
  teacherAccessEnabled: boolean;
  textbookAccessEnabled: boolean;
  quizAccessEnabled: boolean;
  simulatorAccessEnabled: boolean;
  verified: boolean;
};

type MathematicsOffering = {
  id: string;
  subjectId: 'mathematics';
  subjectName: 'Mathematics';
  grade: number;
  medium: Medium;
  studentAccessEnabled: boolean;
  teacherAccessEnabled: boolean;
  textbookAccessEnabled: boolean;
  quizAccessEnabled: boolean;
  simulatorAccessEnabled: boolean;
  verified: boolean;
};

type MathematicsTextbook = {
  id: string;
  subjectId: 'mathematics';
  grade: number;
  medium: Medium;
  title: string;
  chapterNumber?: number;
  chapterTitle?: string;
  verificationStatus?: 'verified' | 'pending' | 'broken';
  accessEnabled?: boolean;
  officialCourseUrl?: string;
  officialResourceUrl?: string | null;
  resolvedPdfUrl?: string | null;
};

const GRADES = [6, 7, 8, 9, 10, 11] as const;
const MEDIA: Medium[] = ['Sinhala', 'Tamil', 'English'];

export default function AdminMathematicsPage() {
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [seedStatus, setSeedStatus] = useState<{ offeringsCreated?: number; textbooksCreated?: number } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [offeringsResponse, textbooksResponse] = await Promise.all([
        fetchWithAuth<{ items?: MathematicsOffering[] }>('/api/mathematics/offerings'),
        fetchWithAuth<{ items?: MathematicsTextbook[] }>('/api/mathematics/textbooks'),
      ]);

      const offerings = offeringsResponse.items ?? [];
      const textbooks = textbooksResponse.items ?? [];

      const nextRows: GradeRow[] = GRADES.flatMap((grade) =>
        MEDIA.map((medium) => {
          const matchingOffering = offerings.find((item) => item.grade === grade && item.medium === medium);
          const matchingTextbooks = textbooks.filter((item) => item.grade === grade && item.medium === medium);

          return {
            id: matchingOffering?.id ?? `${grade}-${medium}`,
            grade,
            medium,
            textbookCount: matchingTextbooks.length,
            verifiedTextbookCount: matchingTextbooks.filter((item) => item.verificationStatus === 'verified').length,
            studentAccessEnabled: matchingOffering?.studentAccessEnabled ?? true,
            teacherAccessEnabled: matchingOffering?.teacherAccessEnabled ?? true,
            textbookAccessEnabled: matchingOffering?.textbookAccessEnabled ?? true,
            quizAccessEnabled: matchingOffering?.quizAccessEnabled ?? true,
            simulatorAccessEnabled: matchingOffering?.simulatorAccessEnabled ?? true,
            verified: matchingOffering?.verified ?? true,
          };
        }),
      );

      setRows(nextRows);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load Mathematics access settings.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totals = useMemo(() => {
    const totalTextbooks = rows.reduce((sum, row) => sum + row.textbookCount, 0);
    const verifiedTextbooks = rows.reduce((sum, row) => sum + row.verifiedTextbookCount, 0);
    return { totalTextbooks, verifiedTextbooks };
  }, [rows]);

  const handleToggle = async (row: GradeRow, field: 'studentAccessEnabled' | 'teacherAccessEnabled' | 'textbookAccessEnabled') => {
    const nextValue = !row[field];
    setRows((currentRows) => currentRows.map((currentRow) => (
      currentRow.id === row.id ? { ...currentRow, [field]: nextValue } : currentRow
    )));

    try {
      setError(null);
      await fetchWithAuth<{ success?: boolean }>(`/api/mathematics/offerings/${row.id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({
          [field]: nextValue,
        }),
      });
      await loadData();
    } catch (caughtError) {
      setRows((currentRows) => currentRows.map((currentRow) => (
        currentRow.id === row.id ? { ...currentRow, [field]: row[field] } : currentRow
      )));
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update access for this Mathematics offering.');
    }
  };

  const handleSeed = async () => {
    try {
      setSyncing(true);
      setError(null);
      const result = await fetchWithAuth<{ offeringsCreated?: number; textbooksCreated?: number }>('/api/mathematics/seed', { method: 'POST' });
      setSeedStatus(result);
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to synchronize the Mathematics catalog.');
    } finally {
      setSyncing(false);
    }
  };

  const hasRows = rows.length > 0;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Academics</p>
              <h1 className="mt-2 text-3xl font-bold">Mathematics management</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSeed()}
                disabled={syncing}
                className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing ? 'Synchronizing…' : 'Synchronize Mathematics Catalog'}
              </button>
            </div>
          </header>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Seed status</p>
                <p className="mt-2 text-sm text-slate-200">
                  {seedStatus ? `Offerings: ${seedStatus.offeringsCreated ?? 0} · Textbooks: ${seedStatus.textbooksCreated ?? 0}` : 'No seed run yet'}
                </p>
              </div>
              <div className="text-right text-sm text-slate-300">
                <div>Total textbooks: <span className="font-semibold text-white">{totals.totalTextbooks}</span></div>
                <div>Verified: <span className="font-semibold text-emerald-300">{totals.verifiedTextbooks}</span></div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">
              <div>{error}</div>
              <button type="button" onClick={() => void loadData()} className="mt-3 underline underline-offset-4">Retry</button>
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading Mathematics access matrix…</div>
          ) : null}

          {!loading && !error && !hasRows ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">No Mathematics catalog rows are available yet.</div>
          ) : null}

          {!loading && !error && hasRows ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/70 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Grade</th>
                    {MEDIA.map((medium) => (
                      <th key={medium} className="px-4 py-3 text-center">{medium}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GRADES.map((grade) => (
                    <tr key={grade} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-semibold text-white">Grade {grade}</td>
                      {MEDIA.map((medium) => {
                        const row = rows.find((item) => item.grade === grade && item.medium === medium) ?? {
                          id: `${grade}-${medium}`,
                          grade,
                          medium,
                          textbookCount: 0,
                          verifiedTextbookCount: 0,
                          studentAccessEnabled: true,
                          teacherAccessEnabled: true,
                          textbookAccessEnabled: true,
                          quizAccessEnabled: true,
                          simulatorAccessEnabled: true,
                          verified: true,
                        };

                        return (
                          <td key={`${grade}-${medium}`} className="px-4 py-3 align-top">
                            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                              <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                                <span>Textbooks</span>
                                <span className="text-cyan-300">{row.textbookCount}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                                <span>Verified</span>
                                <span className="text-emerald-300">{row.verifiedTextbookCount}</span>
                              </div>

                              <div className="space-y-2 text-xs text-slate-200">
                                <label className="flex items-center justify-between gap-2">
                                  <span>Textbook access</span>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggle(row, 'textbookAccessEnabled')}
                                    className={`rounded-full px-2 py-1 font-semibold ${row.textbookAccessEnabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}
                                  >
                                    {row.textbookAccessEnabled ? 'On' : 'Off'}
                                  </button>
                                </label>

                                <label className="flex items-center justify-between gap-2">
                                  <span>Student access</span>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggle(row, 'studentAccessEnabled')}
                                    className={`rounded-full px-2 py-1 font-semibold ${row.studentAccessEnabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}
                                  >
                                    {row.studentAccessEnabled ? 'On' : 'Off'}
                                  </button>
                                </label>

                                <label className="flex items-center justify-between gap-2">
                                  <span>Teacher access</span>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggle(row, 'teacherAccessEnabled')}
                                    className={`rounded-full px-2 py-1 font-semibold ${row.teacherAccessEnabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}
                                  >
                                    {row.teacherAccessEnabled ? 'On' : 'Off'}
                                  </button>
                                </label>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
