'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useAuth } from '@/lib/auth/auth-context';
import { useLocale } from '@/lib/i18n/locale';

type ProgressSnapshot = {
  totalAttempts: number;
  averagePercentage: number;
  passRate: number;
  bestScore: number;
  recentAttempts: { id: string; quizTitle: string; percentage: number; passed: boolean }[];
};

export default function StudentDashboardPage() {
  const { profile, grade, medium } = useAuth();
  const { t } = useLocale();
  const currentGrade = profile?.grade ?? grade ?? 6;
  const currentMedium = profile?.medium ?? medium ?? 'English';
  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        setProgress(await fetchWithAuth<ProgressSnapshot>('/api/student/progress'));
      } catch {
        setProgress(null);
      } finally {
        setProgressLoading(false);
      }
    };

    void loadProgress();
  }, []);

  const averageScore = Math.round(progress?.averagePercentage ?? 0);
  const latestAttempt = progress?.recentAttempts[0];

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950 p-6 shadow-lg shadow-slate-950/20 sm:p-8">
          <div className="relative z-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">{t('overview')}</p>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{t('welcomeBack')}, {profile?.fullName ?? 'Student'}.</h1>
            <p className="mt-3 text-slate-300">{t('trackClassesProgress')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/student/mathematics" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">{t('openWorkspace')}</Link>
              <Link href="/student/tutor" className="rounded-xl border border-slate-600 bg-slate-950/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-300">{t('mathsTutor')}</Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-cyan-300/10" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/20">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t('grade')}</p>
            <p className="mt-3 text-3xl font-black text-white">{currentGrade}</p>
            <p className="mt-2 text-sm text-cyan-300">{t('myCurriculum')}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/20">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t('medium')}</p>
            <p className="mt-3 text-3xl font-black text-white">{currentMedium}</p>
            <p className="mt-2 text-sm text-cyan-300">{t('preferredMedium')}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/20">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t('averageScore')}</p>
            <p className="mt-3 text-3xl font-black text-white">{progressLoading ? '...' : `${averageScore}%`}</p>
            <p className="mt-2 text-sm text-cyan-300">{progress?.totalAttempts ?? 0} {t('submittedAttempts')}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/20">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t('bestScore')}</p>
            <p className="mt-3 text-3xl font-black text-white">{progressLoading ? '...' : `${Math.round(progress?.bestScore ?? 0)}%`}</p>
            <p className="mt-2 text-sm text-emerald-300">{t('onTrack')}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{t('progress')}</p>
                <h2 className="mt-2 text-2xl font-bold text-white">{latestAttempt ? latestAttempt.quizTitle : t('ready')}</h2>
                <p className="mt-2 text-sm text-slate-400">{latestAttempt ? `${t('recently')} · ${Math.round(latestAttempt.percentage)}%` : t('topicInsights')}</p>
              </div>
              <Link href="/student/mathematics/progress" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">{t('view')} {t('progress')}</Link>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${Math.max(2, Math.min(100, averageScore))}%` }} /></div>
            <div className="mt-3 flex justify-between text-xs text-slate-500"><span>{t('averageScore')}</span><span>{progressLoading ? '...' : `${averageScore}%`}</span></div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/20">
            <h2 className="text-xl font-bold text-white">{t('quickAccess')}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link href="/student/mathematics/quizzes" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 transition hover:border-cyan-400/60"><p className="text-sm text-slate-400">{t('quizzes')}</p><p className="mt-1 font-semibold text-white">{t('takeQuiz')} <span className="text-cyan-300">-&gt;</span></p></Link>
              <Link href="/student/mathematics/textbooks" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 transition hover:border-cyan-400/60"><p className="text-sm text-slate-400">{t('textbooks')}</p><p className="mt-1 font-semibold text-white">{t('browseResources')} <span className="text-cyan-300">-&gt;</span></p></Link>
              <Link href="/student/profile" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 transition hover:border-cyan-400/60"><p className="text-sm text-slate-400">{t('profile')}</p><p className="mt-1 font-semibold text-white">{t('viewAccount')} <span className="text-cyan-300">-&gt;</span></p></Link>
            </div>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
