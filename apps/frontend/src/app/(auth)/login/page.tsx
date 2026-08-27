'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { loginSchema } from '@edunexa/shared-validation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: signIn, error: authError, loading, firebaseUser, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        nextErrors[issue.path[0] as string] = issue.message;
      });
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const nextProfile = await signIn(email, password);

      const redirectTo = searchParams.get('redirect') ?? null;
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }

      if (nextProfile?.mustChangePassword) {
        router.push('/change-password');
        return;
      }

      if (profile?.mustChangePassword) {
        router.push('/change-password');
        return;
      }

      if (firebaseUser?.emailVerified === false) {
        router.push('/verify-email');
        return;
      }

      const dashboardPath =
        nextProfile?.role === 'admin'
          ? '/admin/dashboard'
          : nextProfile?.role === 'teacher' || nextProfile?.role === 'reviewer'
            ? '/teacher/dashboard'
            : '/student/dashboard';

      router.push(dashboardPath);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorMessage = submitError || authError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/30 md:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">EduNexa</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-300">Sign in to continue to your learning dashboard.</p>
        </div>

        {errorMessage ? (
          <div role="alert" className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-200">Email</label>
            <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'login-email-error' : undefined} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30" placeholder="you@example.com" />
            {fieldErrors.email ? <p id="login-email-error" className="mt-1 text-sm text-red-300">{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-200">Password</label>
            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/30">
              <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'login-password-error' : undefined} className="w-full bg-transparent px-3 py-3 text-base text-white outline-none" placeholder="Enter your password" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="px-3 py-2 text-sm font-medium text-cyan-300 hover:text-cyan-200" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.password ? <p id="login-password-error" className="mt-1 text-sm text-red-300">{fieldErrors.password}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-4 text-sm">
            <label className="flex items-center gap-2 text-slate-300">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
              Remember me
            </label>
            <Link href="/forgot-password" className="font-medium text-cyan-300 underline decoration-cyan-400 underline-offset-2">Forgot password?</Link>
          </div>

          <button type="submit" disabled={isSubmitting || loading} className="flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60">
            {isSubmitting || loading ? 'Signing in...' : 'Login'}
          </button>

          <p className="text-center text-sm text-slate-300">
            New here?{' '}
            <Link href="/register" className="font-medium text-cyan-300 underline decoration-cyan-400 underline-offset-2">Create an account</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
