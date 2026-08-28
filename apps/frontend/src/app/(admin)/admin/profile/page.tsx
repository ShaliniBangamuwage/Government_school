
'use client';

import { ProfileEditor } from '@/components/profile/profile-editor';
import { useAuth } from '@/lib/auth/auth-context';
import { ProtectedRoute } from '@/lib/auth/route-guard';

export default function AdminProfilePage() {
  const { profile, updateCurrentProfile } = useAuth();
  return <ProtectedRoute allowedRoles={['admin']}><main className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Account</p><h1 className="mt-2 text-3xl font-bold text-white">Admin profile</h1><p className="mt-2 text-slate-300">Manage your name, profile appearance, and personal details.</p></header><ProfileEditor profile={profile} role="admin" onSave={async (updates) => { await updateCurrentProfile(updates); }} /></main></ProtectedRoute>;
}
