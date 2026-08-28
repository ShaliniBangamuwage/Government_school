'use client';

import { ProfileEditor } from '@/components/profile/profile-editor';
import { useAuth } from '@/lib/auth/auth-context';
import { ProtectedRoute } from '@/lib/auth/route-guard';

export default function TeacherProfilePage() {
  const { profile, updateCurrentProfile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['teacher', 'reviewer']}>
      <main className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Account</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Teacher profile</h1>
          <p className="mt-2 text-slate-300">Manage your educator identity and profile appearance.</p>
        </header>
        <ProfileEditor profile={profile} role={profile?.role ?? 'teacher'} onSave={async (updates) => { await updateCurrentProfile(updates); }} />
      </main>
    </ProtectedRoute>
  );
}
