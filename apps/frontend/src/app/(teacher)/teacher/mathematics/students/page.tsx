'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { fetchWithAuth } from '@/lib/api/client';

type TeacherAttemptRecord = {
  id: string;
  quizId: string;
  studentUid: string;
  studentName?: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  submittedAt?: unknown;
};

export default function TeacherMathematicsStudentsPage() {
  const [attempts, setAttempts] = useState<TeacherAttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAttempts = async () => {
      try {
        setLoading(true);
        setError(null);

        const quizResponse = await fetchWithAuth<{ quizzes?: { id: string; title: string }[] }>('/api/teacher/quizzes');
        const quizzes = quizResponse.quizzes ?? [];

        const allAttempts: TeacherAttemptRecord[] = [];

        for (const quiz of quizzes) {
          const response = await fetchWithAuth<{ attempts?: TeacherAttemptRecord[] }>(`/api/teacher/quizzes/${quiz.id}/attempts`);
          const attemptsForQuiz = response.attempts ?? [];
          allAttempts.push(...attemptsForQuiz.map((attempt) => ({
            ...attempt,
            studentName: attempt.studentName ?? 'Unknown Student',
          })));
        }

        allAttempts.sort((left, right) => {
          const leftTime = left.submittedAt && typeof left.submittedAt === 'object' && 'toMillis' in left.submittedAt
            ? (left.submittedAt as { toMillis: () => number }).toMillis()
            : new Date(String(left.submittedAt ?? 0)).getTime();
          const rightTime = right.submittedAt && typeof right.submittedAt === 'object' && 'toMillis' in right.submittedAt
            ? (right.submittedAt as { toMillis: () => number }).toMillis()
            : new Date(String(right.submittedAt ?? 0)).getTime();
          return rightTime - leftTime;
        });

        setAttempts(allAttempts);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load student marks.');
      } finally {
        setLoading(false);
      }
    };

    void loadAttempts();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['teacher', 'reviewer']}>
      <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Teaching</p>
          <h1 className="mt-2 text-3xl font-bold">Student marks</h1>
          <p className="mt-3 text-slate-300">Live quiz results for your Mathematics students.</p>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div>
          ) : null}

          {loading ? (
            <p className="mt-6 text-slate-300">Loading student marks...</p>
          ) : attempts.length === 0 ? (
            <p className="mt-6 text-slate-300">No student submissions have been recorded yet.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Quiz</th>
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="px-3 py-2 font-medium">Percentage</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="border-b border-slate-800">
                      <td className="px-3 py-3 text-white">{attempt.studentName ?? 'Unknown Student'}</td>
                      <td className="px-3 py-3">{(attempt as any).quizTitle ?? 'Untitled quiz'}</td>
                      <td className="px-3 py-3">{attempt.score} / {attempt.totalQuestions}</td>
                      <td className="px-3 py-3">{attempt.percentage.toFixed(0)}%</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${attempt.passed ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
                          {attempt.passed ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {attempt.submittedAt && typeof attempt.submittedAt === 'object' && 'toMillis' in attempt.submittedAt
                          ? new Date((attempt.submittedAt as { toMillis: () => number }).toMillis()).toLocaleString()
                          : attempt.submittedAt
                            ? new Date(String(attempt.submittedAt)).toLocaleString()
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
