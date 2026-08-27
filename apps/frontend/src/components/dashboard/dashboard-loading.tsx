'use client';

export function DashboardLoading({ label = 'Loading dashboard...' }: { label?: string }) {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <div className="h-12 w-48 animate-pulse rounded-xl bg-slate-800" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-800" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-slate-800" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
