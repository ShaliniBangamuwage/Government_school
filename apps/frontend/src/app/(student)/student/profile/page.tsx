'use client';

import { ProfileEditor } from '@/components/profile/profile-editor';
import { useAuth } from '@/lib/auth/auth-context';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useLocale } from '@/lib/i18n/locale';

export default function StudentProfilePage() {
  const { profile, updateCurrentProfile } = useAuth();
  const { t } = useLocale();

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">{t('accountSettings')}</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{t('studentProfile')}</h1>
          <p className="mt-2 text-slate-300">{t('profileDescription')}</p>
        </header>
        <ProfileEditor profile={profile} role="student" onSave={async (updates) => { await updateCurrentProfile(updates); }} />
      </main>
    </ProtectedRoute>
  );
}
