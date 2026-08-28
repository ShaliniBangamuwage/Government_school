'use client';

import { useEffect, useState } from 'react';
import { QuizAnalytics, type AnalyticsQuiz } from '@/components/dashboard/quiz-analytics';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

type AdminQuizResponse = { quizzes?: AnalyticsQuiz[] };

export default function AdminAnalyticsPage() {
  const [quizzes, setQuizzes] = useState<AnalyticsQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetchWithAuth<AdminQuizResponse>('/api/admin/quizzes');
        setQuizzes(response.quizzes ?? []);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load platform analytics.');
      } finally {
        setLoading(false);
      }
    };
    void loadAnalytics();
  }, []);

  const attempts = quizzes.flatMap((quiz) => Array.from({ length: quiz.attemptCount ?? 0 }, () => ({ quizId: quiz.id, quizTitle: quiz.title, percentage: quiz.averagePercentage ?? 0, passed: (quiz.averagePercentage ?? 0) >= 50 })));

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="space-y-6">
        <header><p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-500">Platform intelligence</p><h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1><p className="mt-2 text-slate-600 dark:text-slate-300">A platform-wide view of Mathematics quiz engagement and performance.</p></header>
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div> : null}
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Loading platform analytics...</div> : <QuizAnalytics quizzes={quizzes} attempts={attempts} scope="admin" />}
      </main>
    </ProtectedRoute>
  );
}
