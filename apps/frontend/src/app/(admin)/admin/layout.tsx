'use client';

import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardLoading } from '@/components/dashboard/dashboard-loading';
import { useAuth } from '@/lib/auth/auth-context';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) {
    return (
      <DashboardShell role="admin" title="Admin dashboard" subtitle="Loading your workspace...">
        <DashboardLoading label="Resolving your admin access..." />
      </DashboardShell>
    );
  }

  if (!firebaseUser || role !== 'admin') {
    redirect('/unauthorized');
    return null;
  }

  return <DashboardShell role="admin" title="Admin dashboard" subtitle="Manage users, subjects, and academic content">{children}</DashboardShell>;
}
