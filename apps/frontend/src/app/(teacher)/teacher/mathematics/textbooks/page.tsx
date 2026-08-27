'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { fetchWithAuth } from '@/lib/api/client';

type MathematicsTextbook = {
  id: string;
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  title: string;
  chapterTitle?: string;
  verificationStatus?: 'verified' | 'pending' | 'broken';
  officialResourceUrl?: string | null;
  resolvedPdfUrl?: string | null;
};

export default function TeacherMathematicsTextbooksPage() {
  const [items, setItems] = useState<MathematicsTextbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth<{ items?: MathematicsTextbook[] }>('/api/mathematics/textbooks');
        setItems(response.items ?? []);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load Mathematics textbooks.');
        setItems([]);
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
            <h1 className="mt-2 text-3xl font-bold">Mathematics textbooks</h1>
          </header>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
          {loading ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading textbook catalog…</div> : null}

          {!loading && !error && items.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">No verified Mathematics textbooks are available yet.</div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Grade {item.grade} · {item.medium}</p>
                  <h2 className="mt-3 text-xl font-semibold text-white">{item.title}</h2>
                  {item.chapterTitle ? <p className="mt-2 text-sm text-slate-300">{item.chapterTitle}</p> : null}
                  <div className="mt-5 text-xs uppercase tracking-[0.2em] text-emerald-300">{item.verificationStatus ?? 'pending'}</div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
