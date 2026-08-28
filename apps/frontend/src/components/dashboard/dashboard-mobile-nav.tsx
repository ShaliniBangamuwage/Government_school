'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { DashboardRole } from './dashboard-shell';
import { useLocale } from '@/lib/i18n/locale';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS: Record<DashboardRole, { label: string; href: string }[]> = {
  admin: [
    { label: 'Overview', href: '/admin/dashboard' },
    { label: 'Mathematics', href: '/admin/mathematics' },
    { label: 'Quizzes', href: '/admin/quizzes' },
    { label: 'Simulators', href: '/admin/simulators' },
    { label: 'Analytics', href: '/admin/analytics' },
    { label: 'Teachers', href: '/admin/users?role=teacher' },
    { label: 'Students', href: '/admin/users?role=student' },
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
    { label: 'Maths Tutor', href: '/student/tutor' },
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
  const [search, setSearch] = useState('');
  const navItems = NAV_ITEMS[role];
  const { locale, setLocale, t } = useLocale();

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  return (
    <div className="maths-mobile-nav relative border-b border-slate-800 bg-slate-950/90 p-4 lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-sm font-bold text-cyan-300">
            <img src="/profile.jpg" alt="Maths ලංකා" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Maths ලංකා</p>
          </div>
          {role === 'student' ? <select value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)} aria-label={t('language')} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white">
            <option value="en">EN</option><option value="si">සි</option><option value="ta">த</option>
          </select> : null}
        </div>

        <button
          type="button"
          aria-label={open ? t('closeNavigation') : t('openNavigation')}
          onClick={() => setOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {open ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
        </button>
      </div>

      {open ? (
        <nav aria-label="Mobile navigation" className="mt-4 space-y-2">
          {navItems.map((item) => {
            const [itemPath, itemQuery] = item.href.split('?');
            const isPathActive = pathname === itemPath || (itemPath !== '/teacher/mathematics' && pathname.startsWith(`${itemPath}/`));
            const isActive = isPathActive && (!itemQuery || search === `?${itemQuery}`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setSearch(new URL(item.href, window.location.origin).search);
                  setOpen(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex rounded-xl px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-cyan-500/15 text-cyan-200' : 'bg-slate-900 text-slate-200',
                ].join(' ')}
              >
                {role === 'student' ? ({ Overview: t('overview'), Profile: t('profile'), Textbooks: t('textbooks'), Quizzes: t('quizzes'), Simulators: t('simulators'), 'Brain Game': t('brainGame'), Progress: t('progress'), 'Maths Tutor': t('mathsTutor') }[item.label] ?? item.label) : item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => void onLogout()}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200"
          >
            {role === 'student' ? t('logoutAction') : 'Logout'}
          </button>
        </nav>
      ) : null}
    </div>
  );
}
