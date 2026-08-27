'use client';

import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardLoading } from '@/components/dashboard/dashboard-loading';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { useAuth } from '@/lib/auth/auth-context';

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) {
    return (
      <DashboardShell role="student" title="Student workspace" subtitle="Loading your learning dashboard...">
        <DashboardLoading label="Checking student access..." />
      </DashboardShell>
    );
  }

  if (!firebaseUser || role !== 'student') {
    redirect('/unauthorized');
    return null;
  }

  return <DashboardShell role="student" title="Student workspace" subtitle="Track your classes and progress">{children}</DashboardShell>;
}
