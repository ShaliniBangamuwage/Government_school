'use client';

import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useAuth } from '@/lib/auth/auth-context';

export default function StudentProfilePage() {
  const { profile, grade, medium } = useAuth();

  const currentGrade = profile?.grade ?? grade ?? 6;
  const currentMedium = profile?.medium ?? medium ?? 'English';

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Account</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Student profile</h1>
          <p className="mt-2 text-slate-300">Your academic profile is synced from your registration and security profile.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Full name</p>
            <p className="mt-3 text-xl font-semibold text-white">{profile?.fullName ?? 'Student'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Email</p>
            <p className="mt-3 text-xl font-semibold text-white break-all">{profile?.email ?? 'Not available'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Grade</p>
            <p className="mt-3 text-xl font-semibold text-white">{currentGrade}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Medium</p>
            <p className="mt-3 text-xl font-semibold text-white">{currentMedium}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">Access summary</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">Role</p>
              <p className="mt-2 text-lg font-semibold capitalize text-cyan-300">{profile?.role ?? 'student'}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">Status</p>
              <p className="mt-2 text-lg font-semibold capitalize text-cyan-300">{profile?.status ?? 'active'}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">Onboarding</p>
              <p className="mt-2 text-lg font-semibold text-cyan-300">{profile?.onboardingCompleted ? 'Complete' : 'Pending'}</p>
            </div>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
