'use client';

import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { fetchWithAuth } from '@/lib/api/client';
import { auth } from '@/lib/firebase/config';
import { ProtectedRoute } from '@/lib/auth/route-guard';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      setError('You are not signed in.');
      return;
    }

    try {
      setSaving(true);
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await fetchWithAuth('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({ mustChangePassword: false }),
      });
      setMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-50">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Maths ලංකා</p>
          <h1 className="mt-3 text-3xl font-bold">Change password</h1>
          <p className="mt-2 text-sm text-slate-300">Choose a new password to continue.</p>

          {message ? <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div> : null}
          {error ? <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm text-slate-300">
              Current password
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" required />
            </label>

            <label className="block text-sm text-slate-300">
              New password
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" minLength={8} required />
            </label>

            <label className="block text-sm text-slate-300">
              Confirm new password
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" minLength={8} required />
            </label>

            <button type="submit" disabled={saving} className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}
