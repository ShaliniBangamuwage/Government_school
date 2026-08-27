'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

type MathematicsOffering = {
  id: string;
  subjectId: 'mathematics';
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  studentAccessEnabled?: boolean;
  teacherAccessEnabled?: boolean;
  accessEnabled?: boolean;
};

export default function StudentSubjectsPage() {
  const [offerings, setOfferings] = useState<MathematicsOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth<{ items?: MathematicsOffering[] }>('/api/mathematics/offerings');
        setOfferings((response.items ?? []).filter((item) => item.studentAccessEnabled !== false && item.accessEnabled !== false));
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load your Mathematics access.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
        <div className="mx-auto max-w-5xl space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">My curriculum</p>
            <h1 className="mt-2 text-3xl font-bold">Mathematics</h1>
          </header>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
          {loading ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Loading your Mathematics access…</div> : null}

          {!loading && !error && offerings.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">No Mathematics access is available right now.</div>
          ) : null}

          {!loading && offerings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offerings.map((offering) => (
                <article key={offering.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Grade {offering.grade} · {offering.medium}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Mathematics</h2>
                  <div className="mt-5">
                    <Link href="/student/mathematics/textbooks" className="inline-flex rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">View textbooks</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
