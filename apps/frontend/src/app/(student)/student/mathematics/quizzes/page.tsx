'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { fetchWithAuth } from '@/lib/api/client';

type StudentQuiz = {
  id: string;
  title: string;
  grade: number;
  medium: 'Sinhala' | 'English' | 'Tamil';
  questionCount: number;
  publishedAt?: string;
};

export default function StudentMathematicsQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<StudentQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth<{ quizzes?: StudentQuiz[] }>('/api/student/quizzes');
        setQuizzes(response.quizzes ?? []);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load published quizzes.');
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleStartQuiz = async (quizId: string) => {
    try {
      setStartingQuizId(quizId);
      setError(null);
      const response = await fetchWithAuth<{ attempt?: { id: string } }>(`/api/student/quizzes/${quizId}/attempts`, {
        method: 'POST',
      });

      const attemptId = response.attempt?.id;
      if (!attemptId) {
        throw new Error('The quiz attempt could not be started.');
      }

      router.push(`/student/mathematics/quizzes/${quizId}?attemptId=${encodeURIComponent(attemptId)}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to start the quiz.');
    } finally {
      setStartingQuizId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-5xl space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Student</p>
            <h1 className="mt-2 text-3xl font-bold">Published Mathematics Quizzes</h1>
          </header>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
          {loading ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading published quizzes…</div> : null}

          {!loading && !error && quizzes.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">No published quizzes are available for your grade and medium yet.</div>
          ) : null}

          {!loading && !error && quizzes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {quizzes.map((quiz) => (
                <article key={quiz.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Grade {quiz.grade} · {quiz.medium}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{quiz.title}</h2>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <div>Question count: {quiz.questionCount}</div>
                    <div>Medium: {quiz.medium}</div>
                    <div>Published: {quiz.publishedAt ? new Date(quiz.publishedAt).toLocaleDateString() : 'Recently'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleStartQuiz(quiz.id)}
                    disabled={startingQuizId === quiz.id}
                    className="mt-5 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {startingQuizId === quiz.id ? 'Starting…' : 'Start Quiz'}
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
