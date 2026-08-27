'use client';

import { redirect, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { UserRole } from '@edunexa/shared-types';
import { useAuth } from './auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function hasRequiredStudentAcademicProfile({
  profile,
  grade,
  medium,
}: {
  profile?: { grade?: number | null; medium?: string | null } | null;
  grade?: number | null;
  medium?: string | null;
}) {
  const resolvedGrade = profile?.grade ?? grade ?? null;
  const resolvedMedium = profile?.medium ?? medium ?? null;

  const validGrade = typeof resolvedGrade === 'number' && Number.isFinite(resolvedGrade);
  const validMedium = typeof resolvedMedium === 'string' && ['Sinhala', 'Tamil', 'English'].includes(resolvedMedium);

  return validGrade && validMedium;
}

export function getDashboardPathForRole(role: UserRole | null): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'teacher':
    case 'reviewer':
      return '/teacher/dashboard';
    case 'student':
    default:
      return '/student/dashboard';
  }
}

export function resolveProtectedRouteRedirect({
  user,
  role,
  pathname,
  allowedRoles,
}: {
  user: { uid: string } | null;
  role: UserRole | null;
  pathname: string;
  allowedRoles?: UserRole[];
}) {
  if (!user) {
    return `/login?redirect=${encodeURIComponent(pathname)}`;
  }

  if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return '/unauthorized';
  }

  return null;
}

export function resolvePublicRouteRedirect({
  user,
  role,
}: {
  user: { uid: string } | null;
  role: UserRole | null;
}) {
  if (!user) {
    return null;
  }

  return getDashboardPathForRole(role);
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { firebaseUser, role, loading, profile, grade, medium } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">Loading...</div>;
  }

  const redirectPath = resolveProtectedRouteRedirect({
    user: firebaseUser,
    role,
    pathname,
    allowedRoles,
  });

  if (redirectPath) {
    redirect(redirectPath);
    return null;
  }

  if (
    role === 'student' &&
    pathname !== '/student/complete-profile' &&
    pathname.startsWith('/student/') &&
    !hasRequiredStudentAcademicProfile({ profile, grade, medium })
  ) {
    redirect('/student/complete-profile');
    return null;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">Loading...</div>;
  }

  const redirectPath = resolvePublicRouteRedirect({ user: firebaseUser, role });

  if (redirectPath) {
    redirect(redirectPath);
    return null;
  }

  return <>{children}</>;
}
