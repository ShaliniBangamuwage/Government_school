'use client';

import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardLoading } from '@/components/dashboard/dashboard-loading';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { useAuth } from '@/lib/auth/auth-context';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) {
    return (
      <DashboardShell role="teacher" title="Teacher workspace" subtitle="Loading your dashboard...">
        <DashboardLoading label="Checking teacher access..." />
      </DashboardShell>
    );
  }

  if (!firebaseUser || (role !== 'teacher' && role !== 'reviewer')) {
    redirect('/unauthorized');
    return null;
  }

  return <DashboardShell role="teacher" title="Teacher workspace" subtitle="Manage lessons, resources, and review tasks">{children}</DashboardShell>;
}
