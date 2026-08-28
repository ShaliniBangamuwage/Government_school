'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

type AdminQuiz = {
  id: string;
  title: string;
  teacherId: string;
  grade: number;
  medium: string;
  status: string;
  questionCount: number;
  attemptCount: number;
  studentCount: number;
  averagePercentage: number;
  passRate: number;
};

type QuizResponse = {
  quizzes: AdminQuiz[];
  summary: { total: number; published: number; totalAttempts: number; uniqueStudents: number };
};

const emptyResponse: QuizResponse = {
  quizzes: [],
  summary: { total: 0, published: 0, totalAttempts: 0, uniqueStudents: 0 },
};

export default function AdminQuizzesPage() {
  const [data, setData] = useState<QuizResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchWithAuth<QuizResponse>('/api/admin/quizzes')
      .then(setData)
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Unable to load quizzes.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Content analytics</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Quiz management</h1>
          <p className="mt-2 text-slate-300">Review every quiz, its publication status, and student performance.</p>
        </header>

        {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total quizzes', data.summary.total],
            ['Published', data.summary.published],
            ['Student attempts', data.summary.totalAttempts],
            ['Students reached', data.summary.uniqueStudents],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-bold text-white">{loading ? '...' : value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-semibold text-white">All quizzes</h2></div>
          {loading ? <p className="p-5 text-slate-300">Loading quizzes...</p> : data.quizzes.length === 0 ? <p className="p-5 text-slate-300">No quizzes found.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-300"><tr>{['Quiz', 'Grade / medium', 'Status', 'Questions', 'Students', 'Attempts', 'Average', 'Pass rate'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {data.quizzes.map((quiz) => (
                    <tr key={quiz.id} className="text-slate-200">
                      <td className="px-4 py-3 font-medium text-white">{quiz.title}<span className="block text-xs text-slate-500">Teacher: {quiz.teacherId || 'Unknown'}</span></td>
                      <td className="px-4 py-3">Grade {quiz.grade} / {quiz.medium}</td>
                      <td className="px-4 py-3 capitalize">{quiz.status}</td>
                      <td className="px-4 py-3">{quiz.questionCount}</td>
                      <td className="px-4 py-3">{quiz.studentCount}</td>
                      <td className="px-4 py-3">{quiz.attemptCount}</td>
                      <td className="px-4 py-3">{quiz.averagePercentage}%</td>
                      <td className="px-4 py-3">{quiz.passRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
