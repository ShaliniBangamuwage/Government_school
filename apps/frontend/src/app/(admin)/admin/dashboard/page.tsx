'use client';

import { useEffect, useState } from 'react';
import type { DashboardSummary } from '@edunexa/shared-types';
import { DashboardLoading } from '@/components/dashboard/dashboard-loading';
import { DashboardStatCard } from '@/components/dashboard/dashboard-stat-card';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

const emptySummary: DashboardSummary = {
  totalUsers: 0,
  totalStudents: 0,
  totalTeachers: 0,
  totalAdmins: 0,
  activeUsers: 0,
  suspendedUsers: 0,
  totalSubjects: 0,
  activeSubjects: 0,
  archivedSubjects: 0,
  totalTextbooks: 0,
  pendingContentReviews: 0,
  recentUsers: [],
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth<DashboardSummary>('/api/admin/dashboard/summary');
        setSummary(response);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load the dashboard summary.');
      } finally {
        setLoading(false);
      }
    };

    void loadSummary();
  }, []);

  const dashboardData = summary ?? emptySummary;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Overview</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Admin dashboard</h1>
          </div>
        </div>

        {loading ? (
          <DashboardLoading label="Loading admin summary..." />
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        {!loading && !error ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DashboardStatCard label="Total users" value={dashboardData.totalUsers} trend="Across all roles" icon={<span>👥</span>} />
              <DashboardStatCard label="Active users" value={dashboardData.activeUsers} trend="Currently active" icon={<span>✅</span>} />
              <DashboardStatCard label="Teachers" value={dashboardData.totalTeachers} trend="Assigned educators" icon={<span>🎓</span>} />
              <DashboardStatCard label="Subjects" value={dashboardData.totalSubjects} trend="Curriculum catalog" icon={<span>📚</span>} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Recent users</h2>
                  <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Live</span>
                </div>

                <div className="mt-6 space-y-3">
                  {dashboardData.recentUsers.length === 0 ? (
                    <p className="text-sm text-slate-400">No recent users yet.</p>
                  ) : (
                    dashboardData.recentUsers.map((user) => (
                      <div key={user.uid || user.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                        <div>
                          <p className="font-medium text-white">{user.fullName}</p>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{user.role}</p>
                          <p className="text-sm text-slate-300 capitalize">{user.status}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <DashboardStatCard label="Students" value={dashboardData.totalStudents} trend="Enrolled learners" icon={<span>🧑‍🎓</span>} />
                <DashboardStatCard label="Admins" value={dashboardData.totalAdmins} trend="Administrative users" icon={<span>🛡️</span>} />
                <DashboardStatCard label="Pending reviews" value={dashboardData.pendingContentReviews} trend="Needs approval" icon={<span>⏳</span>} />
                <DashboardStatCard label="Suspended" value={dashboardData.suspendedUsers} trend="Blocked accounts" icon={<span>⚠️</span>} />
              </div>
            </section>
          </>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}
