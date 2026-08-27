'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function PublicTextbooksPage() {
  const [items, setItems] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('all');
  const [medium, setMedium] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth<{ items?: Textbook[]; textbooks?: Textbook[] }>('/api/textbooks');
        setItems(response.items ?? response.textbooks ?? []);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load textbooks.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.subjectSlug.toLowerCase().includes(search.toLowerCase());
      const matchesGrade = grade === 'all' || String(item.grade) === grade;
      const matchesMedium = medium === 'all' || item.medium === medium;
      return matchesSearch && matchesGrade && matchesMedium;
    });
  }, [grade, items, medium, search]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Official catalogue</p>
            <h1 className="mt-2 text-3xl font-bold">Textbooks</h1>
          </div>
          <Link href="/login" className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-medium text-cyan-200">Student login</Link>
        </header>

        <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or subject" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
            <option value="all">All grades</option>
            {[6, 7, 8, 9, 10, 11, 12, 13].map((value) => (
              <option key={value} value={String(value)}>{value}</option>
            ))}
          </select>
          <select value={medium} onChange={(e) => setMedium(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
            <option value="all">All media</option>
            <option value="English">English</option>
            <option value="Sinhala">Sinhala</option>
            <option value="Tamil">Tamil</option>
          </select>
        </div>

        {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

        {loading ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Loading textbooks…</div> : null}

        {!loading && filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            No matching official textbooks are currently available.
          </div>
        ) : null}

        {!loading && filtered.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((textbook) => (
              <article key={textbook.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Grade {textbook.grade} · {textbook.medium}</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{textbook.title}</h2>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${textbook.verificationStatus === 'verified' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'}`}>
                    {textbook.verificationStatus}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-300">{textbook.subjectSlug} · {textbook.bookType}</p>
                {textbook.part ? <p className="mt-1 text-sm text-slate-400">Part {textbook.part}</p> : null}
                {textbook.officialPageUrl ? <p className="mt-2 text-xs text-slate-400">Source: {textbook.sourceDomain ?? 'Official government source'}</p> : null}
                {textbook.lastVerifiedAt ? <p className="mt-1 text-xs text-slate-400">Last verified: {new Date(String(textbook.lastVerifiedAt)).toLocaleDateString()}</p> : null}

                <div className="mt-5 flex gap-3">
                  <Link href={`/textbook/${textbook.id}`} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white">View</Link>
                  {textbook.verificationStatus === 'verified' && textbook.isActive && textbook.officialFileUrl ? (
                    <a href={`/api/textbooks/${textbook.id}/download`} target="_blank" rel="noreferrer" className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Download</a>
                  ) : (
                    <span className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-400">Unavailable</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
