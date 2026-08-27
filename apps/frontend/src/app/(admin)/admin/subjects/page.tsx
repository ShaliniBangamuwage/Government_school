'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { fetchWithAuth } from '@/lib/api/client';

type CurriculumOffering = {
  id: string;
  subjectId: string;
  officialName: string;
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  stream?: string | null;
  accessEnabled: boolean;
  source?: string;
  sourceUrl?: string;
};

export default function AdminSubjectsPage() {
  const [offerings, setOfferings] = useState<CurriculumOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth<{ items?: CurriculumOffering[]; total?: number }>('/api/admin/curriculum-access');
      setOfferings(response.items ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load curriculum access settings.');
      setOfferings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOfferings();
  }, []);

  const handleToggleAccess = async (offering: CurriculumOffering) => {
    try {
      setError(null);
      await fetchWithAuth<{ id?: string }>(`/api/admin/curriculum-access/${offering.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ accessEnabled: !offering.accessEnabled }),
      });
      await loadOfferings();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update access for this offering.');
    }
  };

  const handleSyncCatalog = async () => {
    try {
      setSyncing(true);
      setError(null);
      await fetchWithAuth<{ success?: boolean }>('/api/admin/curriculum-access/sync', {
        method: 'POST',
      });
      await loadOfferings();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sync the official curriculum catalog.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Academics</p>
              <h1 className="mt-2 text-3xl font-bold">Curriculum access</h1>
            </div>
            <button
              type="button"
              onClick={() => void handleSyncCatalog()}
              disabled={syncing}
              className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? 'Syncing…' : 'Sync official catalog'}
            </button>
          </header>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Official curriculum offerings</h2>
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                {offerings.length} items
              </span>
            </div>

            {loading ? <p className="text-slate-300">Loading curriculum access...</p> : null}

            {!loading && offerings.length === 0 ? <p className="text-slate-300">No curriculum offerings have been imported yet.</p> : null}

            {!loading && offerings.length > 0 ? (
              <div className="space-y-3">
                {offerings.map((offering) => (
                  <article key={offering.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{offering.officialName}</h3>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${offering.accessEnabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                            {offering.accessEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-300">Grade {offering.grade} · {offering.medium} · {offering.stream ?? 'General'} </p>
                        {offering.source ? <p className="mt-1 text-xs text-slate-400">Source: {offering.source}</p> : null}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleToggleAccess(offering)}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100"
                        >
                          {offering.accessEnabled ? 'Disable access' : 'Enable access'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
