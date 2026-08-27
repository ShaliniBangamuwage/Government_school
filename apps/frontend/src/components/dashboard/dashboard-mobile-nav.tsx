'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { DashboardRole } from './dashboard-shell';

const NAV_ITEMS: Record<DashboardRole, { label: string; href: string }[]> = {
  admin: [
    { label: 'Overview', href: '/admin/dashboard' },
    { label: 'Mathematics', href: '/admin/mathematics' },
    { label: 'Textbooks', href: '/admin/textbooks' },
    { label: 'Quizzes', href: '/admin/quizzes' },
    { label: 'Teachers', href: '/admin/users' },
    { label: 'Students', href: '/admin/users' },
    { label: 'Access Control', href: '/admin/mathematics' },
  ],
  teacher: [
    { label: 'Overview', href: '/teacher/dashboard' },
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
    { label: 'Textbooks', href: '/student/mathematics/textbooks' },
    { label: 'Quizzes', href: '/student/mathematics/quizzes' },
    { label: 'Simulators', href: '/student/simulators' },
    { label: 'Brain Game', href: '/student/mathematics/brain-game' },
    { label: 'Progress', href: '/student/mathematics/progress' },
  ],
};

export function DashboardMobileNav({
  role,
  pathname,
  onLogout,
}: {
  role: DashboardRole;
  pathname: string;
  onLogout: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const navItems = NAV_ITEMS[role];

  return (
    <div className="border-b border-slate-800 bg-slate-950/90 p-4 lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-sm font-bold text-cyan-300">
            E
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">EduNexa</p>
          </div>
        </div>

        <button
          type="button"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {open ? (
        <nav aria-label="Mobile navigation" className="mt-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex rounded-xl px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-cyan-500/15 text-cyan-200' : 'bg-slate-900 text-slate-200',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => void onLogout()}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200"
          >
            Logout
          </button>
        </nav>
      ) : null}
    </div>
  );
}
