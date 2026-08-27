'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
};

type StudentQuizDetail = {
  id: string;
  title: string;
  grade: number;
  medium: 'Sinhala' | 'English' | 'Tamil';
  questions: QuizQuestion[];
};

export default function StudentQuizAttemptPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quiz, setQuiz] = useState<StudentQuizDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; totalQuestions: number; percentage: number; passed: boolean } | null>(null);

  const attemptId = useMemo(() => searchParams.get('attemptId') ?? '', [searchParams]);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth<{ quiz?: StudentQuizDetail }>(`/api/student/quizzes/${params.quizId}`);
        const loadedQuiz = response.quiz ?? null;
        if (!loadedQuiz) {
          throw new Error('This quiz is not available for your profile.');
        }
        setQuiz(loadedQuiz);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load the quiz.');
      } finally {
        setLoading(false);
      }
    };

    void loadQuiz();
  }, [params.quizId]);

  const totalAnswered = Object.keys(answers).filter((key) => key !== 'attemptId').length;

  const handleSelectAnswer = (questionId: string, optionIndex: string) => {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz || !attemptId) {
      setError('The quiz attempt is missing. Please start the quiz again.');
      return;
    }

    const payloadAnswers = { attemptId, ...answers };
    try {
      setSubmitting(true);
      setError(null);
      const response = await fetchWithAuth<{ result?: { score: number; totalQuestions: number; percentage: number; passed: boolean } }>(`/api/student/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: payloadAnswers }),
      });

      const submittedResult = response.result ?? null;
      if (!submittedResult) {
        throw new Error('The quiz could not be submitted.');
      }

      setResult(submittedResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit the quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-8">Loading quiz…</div>
        </main>
      </ProtectedRoute>
    );
  }

  if (!quiz) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
          <div className="mx-auto max-w-4xl rounded-2xl border border-red-700 bg-red-500/10 p-8 text-red-200">
            {error ?? 'This quiz is not available.'}
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-400">Student quiz</p>
              <h1 className="mt-2 text-3xl font-bold text-white">{quiz.title}</h1>
              <p className="mt-1 text-sm text-slate-300">Grade {quiz.grade} · {quiz.medium}</p>
            </div>
            <Link href="/student/mathematics/quizzes" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200">
              Back to quizzes
            </Link>
          </header>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          {result ? (
            <section className="rounded-2xl border border-emerald-600 bg-emerald-500/10 p-6 text-emerald-100">
              <h2 className="text-2xl font-bold">Quiz submitted</h2>
              <p className="mt-3 text-lg">Score: {result.score} / {result.totalQuestions}</p>
              <p className="mt-2 text-lg">Percentage: {result.percentage.toFixed(0)}%</p>
              <p className="mt-2 text-lg">Status: {result.passed ? 'Passed' : 'Needs more practice'}</p>
              <button
                type="button"
                onClick={() => router.push('/student/mathematics/quizzes')}
                className="mt-5 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950"
              >
                Return to quizzes
              </button>
            </section>
          ) : (
            <section className="space-y-5">
              {quiz.questions.map((question, index) => (
                <article key={question.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Question {index + 1}</p>
                  <h2 className="mt-3 text-xl font-semibold text-white">{question.question}</h2>

                  <div className="mt-4 space-y-3">
                    {question.options.map((option, optionIndex) => {
                      const optionKey = `${question.id}-${optionIndex}`;
                      const selected = answers[question.id] === String(optionIndex);

                      return (
                        <label key={optionKey} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-200">
                          <input
                            type="radio"
                            name={question.id}
                            value={String(optionIndex)}
                            checked={selected}
                            onChange={() => handleSelectAnswer(question.id, String(optionIndex))}
                            className="mt-1 h-4 w-4 accent-cyan-500"
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </article>
              ))}

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-300">Answered: {totalAnswered} / {quiz.questions.length}</p>
                  <button
                    type="button"
                    disabled={submitting || totalAnswered !== quiz.questions.length}
                    onClick={() => void handleSubmit()}
                    className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Submitting…' : 'Submit Quiz'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
