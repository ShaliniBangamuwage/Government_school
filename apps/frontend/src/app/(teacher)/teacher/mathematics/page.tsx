'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { fetchWithAuth } from '@/lib/api/client';

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

export default function TeacherMathematicsPage() {
  const [rows, setRows] = useState<MathematicsOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth<{ items?: MathematicsOffering[] }>('/api/mathematics/offerings');
        setRows(response.items ?? []);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load Mathematics offerings.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['teacher']}>
      <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-6xl space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Teaching</p>
            <h1 className="mt-2 text-3xl font-bold">Mathematics chapters</h1>
          </header>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
          {loading ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading Mathematics catalog…</div> : null}

          {!loading && !error && rows.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">No Mathematics offerings are available yet.</div>
          ) : null}

          {!loading && !error && rows.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Grade {item.grade} · {item.medium}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">Mathematics</h2>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <div>Student access: {item.studentAccessEnabled ? 'Enabled' : 'Disabled'}</div>
                    <div>Teacher access: {item.teacherAccessEnabled ? 'Enabled' : 'Disabled'}</div>
                    <div>Textbooks: {item.textbookAccessEnabled ? 'Enabled' : 'Disabled'}</div>
                    <div>Quizzes: {item.quizAccessEnabled ? 'Enabled' : 'Disabled'}</div>
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
