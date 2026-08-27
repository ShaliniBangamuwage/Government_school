'use client';

import Link from 'next/link';
import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSuccess('If an account exists for this email, a password reset link has been sent.');
      setEmail('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to send the reset email right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/30 md:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Reset access</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Forgot password</h1>
          <p className="mt-2 text-sm text-slate-300">Enter your email and we will send a password reset link.</p>
        </div>

        {error ? <div role="alert" className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
        {success ? <div role="status" className="mb-4 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{success}</div> : null}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-slate-200">Email address</label>
            <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30" placeholder="you@example.com" />
          </div>

          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60">
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>

          <div className="text-center text-sm text-slate-300">
            Back to <Link href="/login" className="font-medium text-cyan-300 underline decoration-cyan-400 underline-offset-2">login</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
