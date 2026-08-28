'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

type AdminSimulator = {
  id: string;
  title?: string;
  description?: string;
  prompt?: string;
  teacherId?: string;
  status?: string;
  createdAt?: unknown;
  publishedAt?: unknown;
};

type SimulatorResponse = {
  simulators: AdminSimulator[];
  summary: { total: number; published: number; drafts: number; studentViews: number | null };
  usageTrackingAvailable: boolean;
};

const emptyResponse: SimulatorResponse = {
  simulators: [],
  summary: { total: 0, published: 0, drafts: 0, studentViews: null },
  usageTrackingAvailable: false,
};

export default function AdminSimulatorsPage() {
  const [data, setData] = useState<SimulatorResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchWithAuth<SimulatorResponse>('/api/admin/simulators')
      .then(setData)
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Unable to load simulators.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Interactive content</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Simulator management</h1>
          <p className="mt-2 text-slate-300">Review generated simulators, publication status, and available usage data.</p>
        </header>

        {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total simulators', data.summary.total],
            ['Published', data.summary.published],
            ['Drafts', data.summary.drafts],
            ['Student views', data.usageTrackingAvailable ? data.summary.studentViews ?? 0 : 'Not tracked'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-bold text-white">{loading ? '...' : value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold text-white">All simulators</h2>
          {loading ? <p className="mt-4 text-slate-300">Loading simulators...</p> : data.simulators.length === 0 ? <p className="mt-4 text-slate-300">No simulators found.</p> : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {data.simulators.map((simulator) => (
                <article key={simulator.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-white">{simulator.title || 'Untitled simulator'}</h3>
                    <span className="text-xs uppercase tracking-[0.16em] text-cyan-300">{simulator.status || 'unknown'}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{simulator.description || simulator.prompt || 'No description available.'}</p>
                  <p className="mt-3 text-xs text-slate-500">Teacher: {simulator.teacherId || 'Unknown'} · Student views: Not tracked</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
