'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/api/client';

type Textbook = {
  id: string;
  title: string;
  subjectSlug: string;
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  stream?: string | null;
  bookType: string;
  part?: string;
  officialPageUrl?: string;
  officialFileUrl?: string;
  sourceDomain?: string;
  verificationStatus: 'pending' | 'verified' | 'broken' | 'archived';
  isActive: boolean;
  lastVerifiedAt?: string;
  downloadCount?: number;
};

export default function PublicTextbookDetailPage({ params }: { params: { textbookId: string } }) {
  const [textbook, setTextbook] = useState<Textbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth<{ textbook?: Textbook }>(`/api/textbooks/${params.textbookId}`);
        setTextbook(response.textbook ?? null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load textbook.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.textbookId]);

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-8 text-slate-50">Loading textbook…</main>;
  }

  if (error || !textbook) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-600 bg-red-500/10 p-6 text-red-200">
          {error ?? 'Textbook not found.'}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/textbooks" className="text-cyan-300">← Back to textbooks</Link>
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">Official source</p>
              <h1 className="mt-2 text-3xl font-bold">{textbook.title}</h1>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${textbook.verificationStatus === 'verified' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'}`}>
              {textbook.verificationStatus}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Grade</p><p className="mt-2 text-lg font-semibold">{textbook.grade}</p></div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Medium</p><p className="mt-2 text-lg font-semibold">{textbook.medium}</p></div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Book type</p><p className="mt-2 text-lg font-semibold">{textbook.bookType}</p></div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Downloads</p><p className="mt-2 text-lg font-semibold">{textbook.downloadCount ?? 0}</p></div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <p><strong>Subject:</strong> {textbook.subjectSlug}</p>
            {textbook.stream ? <p><strong>Stream:</strong> {textbook.stream}</p> : null}
            {textbook.part ? <p><strong>Part:</strong> {textbook.part}</p> : null}
            {textbook.sourceDomain ? <p><strong>Source:</strong> {textbook.sourceDomain}</p> : null}
            {textbook.officialPageUrl ? <p><strong>Official page:</strong> <a href={textbook.officialPageUrl} target="_blank" rel="noreferrer" className="text-cyan-300">Open source</a></p> : null}
            {textbook.lastVerifiedAt ? <p><strong>Last verified:</strong> {new Date(String(textbook.lastVerifiedAt)).toLocaleDateString()}</p> : null}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {textbook.verificationStatus === 'verified' && textbook.isActive && textbook.officialFileUrl ? (
              <a href={`/api/textbooks/${textbook.id}/download`} target="_blank" rel="noreferrer" className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950">Download official file</a>
            ) : (
              <span className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400">Download unavailable</span>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
