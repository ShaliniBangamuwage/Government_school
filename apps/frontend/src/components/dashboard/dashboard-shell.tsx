'use client';

import { useMemo, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardHeader } from './dashboard-header';
import { DashboardMobileNav } from './dashboard-mobile-nav';

export type DashboardRole = 'admin' | 'teacher' | 'student';

export interface DashboardShellProps {
  role: DashboardRole;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function DashboardShell({ role, title, subtitle, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseUser, profile, logout } = useAuth();

  const userLabel = useMemo(() => {
    if (profile?.fullName) return profile.fullName;
    if (firebaseUser?.displayName) return firebaseUser.displayName;
    return 'EduNexa User';
  }, [firebaseUser, profile]);

  const userEmail = profile?.email || firebaseUser?.email || 'user@edunexa.app';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="hidden lg:flex">
        <DashboardSidebar role={role} pathname={pathname} userName={userLabel} userEmail={userEmail} onLogout={handleLogout} />
      </div>

      <div className="lg:pl-72">
        <DashboardHeader role={role} title={title} subtitle={subtitle} userName={userLabel} userEmail={userEmail} onLogout={handleLogout} />
        <DashboardMobileNav role={role} pathname={pathname} onLogout={handleLogout} />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
