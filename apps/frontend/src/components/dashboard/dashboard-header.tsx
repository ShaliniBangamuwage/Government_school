'use client';

import type { DashboardRole } from './dashboard-shell';

export function DashboardHeader({
  role,
  title,
  subtitle,
  userName,
  userEmail,
  onLogout,
}: {
  role: DashboardRole;
  title: string;
  subtitle?: string;
  userName: string;
  userEmail: string;
  onLogout: () => Promise<void> | void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{role}</p>
          <h1 className="mt-1 text-2xl font-bold text-white">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <label className="relative block">
            <span className="sr-only">Search</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              type="search"
              placeholder="Search"
              aria-label="Search dashboard"
              className="w-56 rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </label>
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            🔔
          </button>

          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-300">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-xs text-slate-400">{userEmail}</p>
            </div>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-cyan-500/60 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
