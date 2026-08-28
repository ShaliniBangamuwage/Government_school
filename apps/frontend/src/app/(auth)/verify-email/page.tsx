'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { firebaseUser, role, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!firebaseUser) {
      router.push('/login');
      return;
    }

    const dashboardPath =
      role === 'admin'
        ? '/admin/dashboard'
        : role === 'teacher' || role === 'reviewer'
          ? '/teacher/dashboard'
          : '/student/dashboard';

    router.push(dashboardPath);
  }, [firebaseUser, role, loading, router]);

  if (loading || firebaseUser) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">Loading...</div>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-50">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/30 md:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Maths ලංකා</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Continue to dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">Email verification is not required during the current development phase.</p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/login" className="flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400">
            Go to Login
          </Link>

          <p className="text-center text-sm text-slate-400">
            Already signed in?{' '}
            <Link href="/student/dashboard" className="font-medium text-cyan-300 underline decoration-cyan-400 underline-offset-2">
              Go to Dashboard
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
