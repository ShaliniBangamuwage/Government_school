'use client';

import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useAuth } from '@/lib/auth/auth-context';

export default function TeacherProfilePage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['teacher', 'reviewer']}>
      <main className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Account</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Teacher profile</h1>
          <p className="mt-2 text-slate-300">Your account metadata and educator role are kept in sync with the platform identity.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Full name</p>
            <p className="mt-3 text-xl font-semibold text-white">{profile?.fullName ?? 'Teacher'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Email</p>
            <p className="mt-3 text-xl font-semibold text-white break-all">{profile?.email ?? 'Not available'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Role</p>
            <p className="mt-3 text-xl font-semibold capitalize text-cyan-300">{profile?.role ?? 'teacher'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Status</p>
            <p className="mt-3 text-xl font-semibold capitalize text-cyan-300">{profile?.status ?? 'active'}</p>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
