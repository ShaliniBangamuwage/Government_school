'use client';

import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardLoading } from '@/components/dashboard/dashboard-loading';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { useAuth } from '@/lib/auth/auth-context';
import { useLocale } from '@/lib/i18n/locale';

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { firebaseUser, role, loading } = useAuth();
  const { t } = useLocale();

  if (loading) {
    return (
      <DashboardShell role="student" title={t('studentWorkspace')} subtitle={t('loadingLearningDashboard')}>
        <DashboardLoading label={t('checkingStudentAccess')} />
      </DashboardShell>
    );
  }

  if (!firebaseUser || role !== 'student') {
    redirect('/unauthorized');
    return null;
  }

  return <DashboardShell role="student" title={t('studentWorkspace')} subtitle={t('trackClassesProgress')}>{children}</DashboardShell>;
}
