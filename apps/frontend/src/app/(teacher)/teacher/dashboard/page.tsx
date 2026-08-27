'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useAuth } from '@/lib/auth/auth-context';

export default function TeacherDashboardPage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['teacher', 'reviewer']}>
      <main className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Overview</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Teacher dashboard</h1>
          <p className="mt-2 text-slate-300">Welcome back, {profile?.fullName ?? 'Teacher'}.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Role</p>
            <p className="mt-3 text-3xl font-bold capitalize text-white">{profile?.role ?? 'teacher'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Catalog</p>
            <p className="mt-3 text-3xl font-bold text-white">Ready</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Reviews</p>
            <p className="mt-3 text-3xl font-bold text-white">0</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Status</p>
            <p className="mt-3 text-3xl font-bold text-white">Active</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Student marks</h2>
              <p className="mt-2 text-slate-300">Track quiz submissions and performance from the dedicated results page.</p>
            </div>
            <Link
              href="/teacher/mathematics/students"
              className="inline-flex rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              View student marks
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">Teaching tools</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <a href="/teacher/mathematics" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left transition hover:border-cyan-500/50">
              <p className="text-sm text-slate-400">Mathematics</p>
              <p className="mt-2 text-lg font-semibold text-white">Manage chapters</p>
            </a>
            <a href="/teacher/mathematics/textbooks" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left transition hover:border-cyan-500/50">
              <p className="text-sm text-slate-400">Textbooks</p>
              <p className="mt-2 text-lg font-semibold text-white">Review materials</p>
            </a>
            <a href="/teacher/profile" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left transition hover:border-cyan-500/50">
              <p className="text-sm text-slate-400">Profile</p>
              <p className="mt-2 text-lg font-semibold text-white">Account details</p>
            </a>
            <a href="/teacher/simulators" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left transition hover:border-cyan-500/50">
              <p className="text-sm text-slate-400">Simulators</p>
              <p className="mt-2 text-lg font-semibold text-white">Create & manage interactive simulators</p>
            </a>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
