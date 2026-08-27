'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

type ProgressData = {
  totalAttempts: number;
  averagePercentage: number;
  passedCount: number;
  passRate: number;
  bestScore: number;
  recentAttempts: { id: string; quizTitle: string; score: number; totalQuestions: number; percentage: number; passed: boolean; submittedAt: string | null }[];
  topicPerformance: { topic: string; attempts: number; averagePercentage: number }[];
  aiInsight: { headline: string; summary: string; actions: string[] };
};

const emptyProgress: ProgressData = {
  totalAttempts: 0, averagePercentage: 0, passedCount: 0, passRate: 0, bestScore: 0,
  recentAttempts: [], topicPerformance: [],
  aiInsight: { headline: 'Your study journey starts here', summary: 'Complete a published quiz to unlock personalized progress insights.', actions: ['Choose a published Mathematics quiz', 'Review each explanation after submitting', 'Return here after your next attempt'] },
};

export default function StudentProgressPage() {
  const [data, setData] = useState<ProgressData>(emptyProgress);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await fetchWithAuth<ProgressData>('/api/student/progress'));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load your progress.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadProgress(); }, []);

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Mathematics</p>
              <h1 className="mt-2 text-3xl font-bold">My Progress</h1>
              <p className="mt-2 text-slate-300">A complete view of your submitted quiz results and next steps.</p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href="/student/mathematics/quizzes" className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950">Take a quiz</Link>
              <button type="button" onClick={() => void loadProgress()} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-200">Refresh</button>
            </div>
          </header>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
          {loading ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Analyzing your results…</div> : null}

          {!loading ? <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Average score', `${data.averagePercentage}%`, 'Across submitted quizzes'],
                ['Completed', String(data.totalAttempts), 'Submitted attempts'],
                ['Pass rate', `${data.passRate}%`, `${data.passedCount} passed`],
                ['Best score', `${data.bestScore}%`, 'Personal best'],
              ].map(([label, value, detail]) => <article key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p><p className="mt-3 text-3xl font-bold text-white">{value}</p><p className="mt-2 text-sm text-slate-400">{detail}</p></article>)}
            </section>

            <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">AI study coach</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{data.aiInsight.headline}</h2>
              <p className="mt-2 max-w-3xl text-slate-200">{data.aiInsight.summary}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">{data.aiInsight.actions.map((action) => <div key={action} className="rounded-xl border border-cyan-400/20 bg-slate-950/40 p-4 text-sm text-slate-200">{action}</div>)}</div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold">Topic performance</h2>
                {data.topicPerformance.length === 0 ? <p className="mt-4 text-slate-400">Topic insights appear after your first submitted quiz.</p> : <div className="mt-5 space-y-5">{data.topicPerformance.map((topic) => <div key={topic.topic}><div className="mb-2 flex justify-between gap-4 text-sm"><span className="truncate text-slate-200">{topic.topic}</span><span className="font-semibold text-cyan-300">{topic.averagePercentage}%</span></div><div className="h-2 rounded-full bg-slate-700"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Math.max(2, Math.min(100, topic.averagePercentage))}%` }} /></div><p className="mt-1 text-xs text-slate-500">{topic.attempts} attempt{topic.attempts === 1 ? '' : 's'}</p></div>)}</div>}
              </section>
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold">Recent results</h2>
                {data.recentAttempts.length === 0 ? <p className="mt-4 text-slate-400">No submitted quiz results yet.</p> : <div className="mt-4 divide-y divide-slate-800">{data.recentAttempts.map((attempt) => <div key={attempt.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="truncate font-medium text-white">{attempt.quizTitle}</p><p className="mt-1 text-xs text-slate-500">{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'Recently'} · {attempt.score}/{attempt.totalQuestions}</p></div><span className={attempt.passed ? 'font-semibold text-emerald-400' : 'font-semibold text-amber-300'}>{Math.round(attempt.percentage)}%</span></div>)}</div>}
              </section>
            </div>
          </> : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
