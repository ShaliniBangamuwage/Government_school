'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { DashboardRole } from './dashboard-shell';

const NAV_ITEMS: Record<DashboardRole, { label: string; href: string }[]> = {
  admin: [
    { label: 'Overview', href: '/admin/dashboard' },
    { label: 'Profile', href: '/admin/profile' },
    { label: 'Mathematics', href: '/admin/mathematics' },
    { label: 'Textbooks', href: '/admin/textbooks' },
    { label: 'Quizzes', href: '/admin/quizzes' },
    { label: 'Teachers', href: '/admin/users' },
    { label: 'Students', href: '/admin/users' },
    { label: 'Access Control', href: '/admin/mathematics' },
  ],
  teacher: [
    { label: 'Overview', href: '/teacher/dashboard' },
    { label: 'Profile', href: '/teacher/profile' },
    { label: 'Mathematics Chapters', href: '/teacher/mathematics' },
    { label: 'Textbooks', href: '/teacher/mathematics/textbooks' },
      { label: 'Simulators', href: '/teacher/simulators' },
    { label: 'Quiz Builder', href: '/teacher/mathematics/quizzes' },
    { label: 'Question Review', href: '/teacher/mathematics/questions' },
    { label: 'Student Marks', href: '/teacher/mathematics/students' },
    { label: 'Analytics', href: '/teacher/mathematics/analytics' },
  ],
  student: [
    { label: 'Overview', href: '/student/dashboard' },
    { label: 'Profile', href: '/student/profile' },
    { label: 'Textbooks', href: '/student/mathematics/textbooks' },
    { label: 'Quizzes', href: '/student/mathematics/quizzes' },
    { label: 'Simulators', href: '/student/simulators' },
    { label: 'Brain Game', href: '/student/mathematics/brain-game' },
    { label: 'Progress', href: '/student/mathematics/progress' },
  ],
};

export function DashboardSidebar({
  role,
  pathname,
  userName,
  userEmail,
  onLogout,
}: {
  role: DashboardRole;
  pathname: string;
  userName: string;
  userEmail: string;
  onLogout: () => Promise<void> | void;
}) {
  const navItems = useMemo(() => NAV_ITEMS[role], [role]);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-800 bg-slate-900/90 backdrop-blur">
      <div className="flex h-full flex-col px-4 py-6">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-lg font-bold text-cyan-300">
            E
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">EduNexa</p>
            <p className="text-sm text-slate-400">Learning workspace</p>
          </div>
        </div>

        <nav aria-label="Sidebar navigation" className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                ].join(' ')}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Account</p>
          <p className="mt-2 text-sm font-semibold text-white">{userName}</p>
          <p className="text-xs text-slate-400">{userEmail}</p>
          <p className="mt-2 inline-flex rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            {role}
          </p>

          <button
            type="button"
            onClick={() => void onLogout()}
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500/60 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
