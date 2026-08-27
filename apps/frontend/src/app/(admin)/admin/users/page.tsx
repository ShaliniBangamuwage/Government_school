'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

type UserRecord = {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  role: 'student' | 'teacher' | 'reviewer' | 'admin';
  status: 'active' | 'disabled' | 'suspended';
  mustChangePassword?: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'reviewer' | 'admin'>('teacher');
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth<{ users?: UserRecord[] }>('/api/users');
      setUsers(response.users ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleCreateStaff = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await fetchWithAuth<{ user: UserRecord }>('/api/users/staff', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
        }),
      });

      setFullName('');
      setEmail('');
      setPassword('');
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">EduNexa</p>
              <h1 className="mt-2 text-3xl font-bold">Staff user management</h1>
            </div>
          </div>

          <form onSubmit={handleCreateStaff} className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="grid gap-4 md:grid-cols-4">
              <label className="text-sm text-slate-300">
                Full name
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" required />
              </label>
              <label className="text-sm text-slate-300">
                Email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" required />
              </label>
              <label className="text-sm text-slate-300">
                Initial password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" minLength={8} required />
              </label>
              <label className="text-sm text-slate-300">
                Role
                <select value={role} onChange={(event) => setRole(event.target.value as 'teacher' | 'reviewer' | 'admin')} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  <option value="teacher">Teacher</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>

            <button type="submit" disabled={submitting} className="mt-5 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Creating...' : 'Create staff account'}
            </button>
          </form>

          {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Users</h2>
            {loading ? <p className="mt-4 text-slate-300">Loading users...</p> : null}
            {!loading && users.length === 0 ? <p className="mt-4 text-slate-300">No users found.</p> : null}

            {!loading && users.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-700">
                <table className="min-w-full divide-y divide-slate-700 text-left text-sm">
                  <thead className="bg-slate-800 text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Must change password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900">
                    {users.map((user) => (
                      <tr key={user.uid}>
                        <td className="px-4 py-3">{user.fullName}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3 capitalize">{user.role}</td>
                        <td className="px-4 py-3 capitalize">{user.status}</td>
                        <td className="px-4 py-3">{user.mustChangePassword ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
