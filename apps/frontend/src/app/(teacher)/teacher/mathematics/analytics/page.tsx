'use client';

import { useEffect, useState } from 'react';
import { QuizAnalytics, type AnalyticsAttempt, type AnalyticsQuiz } from '@/components/dashboard/quiz-analytics';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

export default function TeacherMathematicsAnalyticsPage() {
  const [quizzes, setQuizzes] = useState<AnalyticsQuiz[]>([]);
  const [attempts, setAttempts] = useState<AnalyticsAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetchWithAuth<{ quizzes?: AnalyticsQuiz[] }>('/api/teacher/quizzes');
        const nextQuizzes = response.quizzes ?? [];
        const results = await Promise.all(nextQuizzes.map((quiz) => fetchWithAuth<{ attempts?: AnalyticsAttempt[] }>(`/api/teacher/quizzes/${quiz.id}/attempts`)));
        setQuizzes(nextQuizzes);
        setAttempts(results.flatMap((result) => result.attempts ?? []));
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load Mathematics analytics.');
      } finally {
        setLoading(false);
      }
    };
    void loadAnalytics();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['teacher', 'reviewer']}>
      <main className="space-y-6">
        <header><p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-500">Teaching intelligence</p><h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Mathematics analytics</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Understand performance by grade, quiz, score band, and recent activity.</p></header>
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div> : null}
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Loading detailed analytics...</div> : <QuizAnalytics quizzes={quizzes} attempts={attempts} scope="teacher" />}
      </main>
    </ProtectedRoute>
  );
}
