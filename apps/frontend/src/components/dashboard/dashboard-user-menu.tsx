'use client';

export function DashboardUserMenu({
  userName,
  userEmail,
  role,
  onLogout,
}: {
  userName: string;
  userEmail: string;
  role: string;
  onLogout: () => Promise<void> | void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-200">
        👤
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-medium text-white">{userName}</p>
        <p className="truncate text-xs text-slate-400">{userEmail}</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">{role}</p>
      </div>
      <button
        type="button"
        aria-label="Log out"
        onClick={() => void onLogout()}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-cyan-500/60 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        ⎋ Logout
      </button>
    </div>
  );
}
