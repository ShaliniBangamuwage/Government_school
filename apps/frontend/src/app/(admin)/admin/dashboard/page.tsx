'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock3, GraduationCap, Shield, TriangleAlert, UserRound, Users } from 'lucide-react';
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

type QuizOverview = { summary: { total: number; published: number; totalAttempts: number; uniqueStudents: number } };
type SimulatorOverview = { summary: { total: number; published: number; drafts: number; studentViews: number | null }; usageTrackingAvailable: boolean };

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizOverview, setQuizOverview] = useState<QuizOverview | null>(null);
  const [simulatorOverview, setSimulatorOverview] = useState<SimulatorOverview | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const [response, quizzes, simulators] = await Promise.all([
          fetchWithAuth<DashboardSummary>('/api/admin/dashboard/summary'),
          fetchWithAuth<QuizOverview>('/api/admin/quizzes'),
          fetchWithAuth<SimulatorOverview>('/api/admin/simulators'),
        ]);
        setSummary(response);
        setQuizOverview(quizzes);
        setSimulatorOverview(simulators);
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
              <DashboardStatCard label="Total users" value={dashboardData.totalUsers} trend="Across all roles" icon={<Users aria-hidden="true" size={20} />} />
              <DashboardStatCard label="Active users" value={dashboardData.activeUsers} trend="Currently active" icon={<CheckCircle2 aria-hidden="true" size={20} />} />
              <DashboardStatCard label="Teachers" value={dashboardData.totalTeachers} trend="Assigned educators" icon={<GraduationCap aria-hidden="true" size={20} />} />
              <DashboardStatCard label="Subjects" value={dashboardData.totalSubjects} trend="Curriculum catalog" icon={<BookOpen aria-hidden="true" size={20} />} />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">Quiz overview</h2>
                  <a href="/admin/quizzes" className="text-sm text-cyan-300 hover:text-cyan-200">View quizzes</a>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <p className="rounded-xl bg-slate-950/60 p-3 text-slate-300">Total <strong className="block text-2xl text-white">{quizOverview?.summary.total ?? 0}</strong></p>
                  <p className="rounded-xl bg-slate-950/60 p-3 text-slate-300">Published <strong className="block text-2xl text-white">{quizOverview?.summary.published ?? 0}</strong></p>
                  <p className="rounded-xl bg-slate-950/60 p-3 text-slate-300">Student attempts <strong className="block text-2xl text-white">{quizOverview?.summary.totalAttempts ?? 0}</strong></p>
                  <p className="rounded-xl bg-slate-950/60 p-3 text-slate-300">Students reached <strong className="block text-2xl text-white">{quizOverview?.summary.uniqueStudents ?? 0}</strong></p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">Simulator overview</h2>
                  <a href="/admin/simulators" className="text-sm text-cyan-300 hover:text-cyan-200">View simulators</a>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <p className="rounded-xl bg-slate-950/60 p-3 text-slate-300">Total <strong className="block text-2xl text-white">{simulatorOverview?.summary.total ?? 0}</strong></p>
                  <p className="rounded-xl bg-slate-950/60 p-3 text-slate-300">Published <strong className="block text-2xl text-white">{simulatorOverview?.summary.published ?? 0}</strong></p>
                  <p className="rounded-xl bg-slate-950/60 p-3 text-slate-300">Drafts <strong className="block text-2xl text-white">{simulatorOverview?.summary.drafts ?? 0}</strong></p>
                  <p className="rounded-xl bg-slate-950/60 p-3 text-slate-300">Student views <strong className="block text-lg text-white">{simulatorOverview?.usageTrackingAvailable ? simulatorOverview.summary.studentViews : 'Not tracked'}</strong></p>
                </div>
              </div>
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
                <DashboardStatCard label="Students" value={dashboardData.totalStudents} trend="Enrolled learners" icon={<UserRound aria-hidden="true" size={20} />} />
                <DashboardStatCard label="Admins" value={dashboardData.totalAdmins} trend="Administrative users" icon={<Shield aria-hidden="true" size={20} />} />
                <DashboardStatCard label="Pending reviews" value={dashboardData.pendingContentReviews} trend="Needs approval" icon={<Clock3 aria-hidden="true" size={20} />} />
                <DashboardStatCard label="Suspended" value={dashboardData.suspendedUsers} trend="Blocked accounts" icon={<TriangleAlert aria-hidden="true" size={20} />} />
              </div>
            </section>
          </>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}
