'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { ProtectedRoute } from '@/lib/auth/route-guard';

export default function AdminProfilePage() {
  const { profile, updateCurrentProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.fullName) setFullName(profile.fullName);
    if (profile?.email) setEmail(profile.email);
  }, [profile]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateCurrentProfile({
        fullName: fullName.trim(),
        email: email.trim(),
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update your profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Account</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Admin profile</h1>
          <p className="mt-2 text-slate-300">Keep your administrator contact details current.</p>
        </section>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="admin-fullName" className="mb-1 block text-sm font-medium text-slate-200">Full name</label>
              <input id="admin-fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30" />
            </div>

            <div>
              <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-slate-200">Email</label>
              <input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Role</p>
                <p className="mt-2 text-lg font-semibold capitalize text-cyan-300">{profile?.role ?? 'admin'}</p>
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

            <button type="submit" disabled={isSubmitting} className="flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60">
              {isSubmitting ? 'Saving changes...' : 'Save changes'}
            </button>
          </form>
        </section>
      </main>
    </ProtectedRoute>
  );
}
