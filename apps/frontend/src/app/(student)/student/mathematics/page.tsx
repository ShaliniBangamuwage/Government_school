'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useAuth } from '@/lib/auth/auth-context';

type MathematicsOffering = {
  id: string;
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  studentAccessEnabled: boolean;
  teacherAccessEnabled: boolean;
  textbookAccessEnabled: boolean;
  quizAccessEnabled: boolean;
  simulatorAccessEnabled: boolean;
};

export default function StudentMathematicsPage() {
  const { profile } = useAuth();
  const [offerings, setOfferings] = useState<MathematicsOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const grade = Number(profile?.grade ?? 6);
        const medium = (profile?.medium ?? 'English').toString();
        const response = await fetchWithAuth<{ items?: MathematicsOffering[] }>(`/api/mathematics/offerings?grade=${grade}&medium=${encodeURIComponent(medium)}`);
        const filtered = (response.items ?? []).filter(
          (item) => item.grade === grade && item.medium === medium && item.studentAccessEnabled,
        );
        setOfferings(filtered);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load your Mathematics access.');
        setOfferings([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [profile?.grade, profile?.medium]);

  const studentSummary = useMemo(() => {
    if (!profile) return 'Mathematics';
    return `Grade ${profile.grade ?? 6} · ${profile.medium ?? 'English'}`;
  }, [profile]);

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-5xl space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Mathematics</p>
            <h1 className="mt-2 text-3xl font-bold">My Mathematics workspace</h1>
            <p className="mt-2 text-slate-300">{studentSummary}</p>
          </header>

          {error ? (
            <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">
              {error}
              <button type="button" onClick={() => window.location.reload()} className="ml-3 underline">Retry</button>
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading your Mathematics access…</div>
          ) : null}

          {!loading && !error && offerings.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">No Mathematics access is available for your grade and medium yet.</div>
          ) : null}

          {!loading && !error && offerings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {offerings.map((offering) => (
                <Link key={offering.id} href="/student/mathematics/textbooks" className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500/40">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Grade {offering.grade} · {offering.medium}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">Mathematics</h2>
                  <div className="mt-5 grid gap-2 text-sm text-slate-300">
                    <span>Textbooks: {offering.textbookAccessEnabled ? 'Available' : 'Hidden'}</span>
                    <span>Quizzes: {offering.quizAccessEnabled ? 'Available' : 'Hidden'}</span>
                    <span>Simulators: {offering.simulatorAccessEnabled ? 'Available' : 'Hidden'}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
