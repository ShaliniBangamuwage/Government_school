'use client';

import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useAuth } from '@/lib/auth/auth-context';

export default function StudentDashboardPage() {
  const { profile, grade, medium } = useAuth();
  const currentGrade = profile?.grade ?? grade ?? 6;
  const currentMedium = profile?.medium ?? medium ?? 'English';

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Overview</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Student dashboard</h1>
          <p className="mt-2 text-slate-300">Welcome back, {profile?.fullName ?? 'Student'}.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Grade</p>
            <p className="mt-3 text-3xl font-bold text-white">{currentGrade}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Medium</p>
            <p className="mt-3 text-3xl font-bold text-white">{currentMedium}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Mathematics</p>
            <p className="mt-3 text-3xl font-bold text-white">Ready</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Progress</p>
            <p className="mt-3 text-3xl font-bold text-white">On track</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">Quick access</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <a href="/student/mathematics" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left transition hover:border-cyan-500/50">
              <p className="text-sm text-slate-400">Mathematics</p>
              <p className="mt-2 text-lg font-semibold text-white">Open workspace</p>
            </a>
            <a href="/student/mathematics/textbooks" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left transition hover:border-cyan-500/50">
              <p className="text-sm text-slate-400">Textbooks</p>
              <p className="mt-2 text-lg font-semibold text-white">Browse resources</p>
            </a>
            <a href="/student/profile" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left transition hover:border-cyan-500/50">
              <p className="text-sm text-slate-400">Profile</p>
              <p className="mt-2 text-lg font-semibold text-white">View account</p>
            </a>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
