'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

type Question = {
  id: string;
  prompt: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  sourceReferences?: Array<{ title: string; pageUrl: string }>;
  questionType?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
};

export default function TeacherQuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth<{ questions?: Question[] }>('/api/staff/question-bank');
      setQuestions(response.questions ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load question bank.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuestions();
  }, []);

  const visibleQuestions = questions.filter((question) => statusFilter === 'all' || (question.reviewStatus ?? 'pending') === statusFilter);

  return (
    <ProtectedRoute allowedRoles={['teacher', 'reviewer', 'admin']}>
      <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Question bank</p>
              <h1 className="mt-2 text-3xl font-bold">AI review queue</h1>
            </div>
          </header>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <label className="block text-sm text-slate-300">
              Status filter
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white md:max-w-xs">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          {loading ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Loading questions…</div> : null}

          {!loading && visibleQuestions.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">No questions match the current filter.</div>
          ) : null}

          {!loading && visibleQuestions.length > 0 ? (
            <div className="space-y-4">
              {visibleQuestions.map((question) => (
                <article key={question.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{question.questionType ?? 'MCQ'}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${question.reviewStatus === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : question.reviewStatus === 'rejected' ? 'bg-red-500/15 text-red-200' : 'bg-amber-500/15 text-amber-200'}`}>
                      {question.reviewStatus ?? 'pending'}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-white">{question.prompt}</h2>
                  {question.options && question.options.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-slate-300">
                      {question.options.map((option) => (
                        <li key={option}>• {option}</li>
                      ))}
                    </ul>
                  ) : null}
                  {question.correctAnswer ? <p className="mt-3 text-sm text-emerald-300">Correct answer: {question.correctAnswer}</p> : null}
                  {question.explanation ? <p className="mt-3 text-sm text-slate-400">Explanation: {question.explanation}</p> : null}
                  {question.sourceReferences && question.sourceReferences.length > 0 ? (
                    <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
                      <p className="font-semibold text-slate-200">Source reference</p>
                      {question.sourceReferences.map((source) => (
                        <a key={`${question.id}-${source.pageUrl}`} href={source.pageUrl} target="_blank" rel="noreferrer" className="mt-2 block text-cyan-300">{source.title}</a>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
