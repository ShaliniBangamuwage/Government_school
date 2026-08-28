'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useLocale } from '@/lib/i18n/locale';

type SubjectOption = {
  id: string;
  name: string;
  description?: string;
  status?: 'active' | 'archived';
};

type Textbook = {
  id: string;
  subjectId?: string;
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

export default function StudentTextbooksPage() {
  const { t } = useLocale();
  const [items, setItems] = useState<Textbook[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('all');
  const [medium, setMedium] = useState('all');
  const [subjectId, setSubjectId] = useState('all');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const subjectQuery = searchParams.get('subjectId');
    if (subjectQuery) {
      setSubjectId(subjectQuery);
    }
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await fetchWithAuth<{ subjects?: SubjectOption[] }>('/api/subjects');
        const mathOnlySubjects = (response.subjects ?? []).filter((item) => item.status !== 'archived' && /math|mathematics/i.test(item.name));
        setSubjects(mathOnlySubjects);
        if (mathOnlySubjects.length > 0) {
          setSubjectId((current) => current === 'all' ? mathOnlySubjects[0].id : current);
        }
      } catch (_error) {
        setSubjects([]);
      }
    };

    void loadSubjects();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (grade !== 'all') params.set('grade', grade);
        if (medium !== 'all') params.set('medium', medium);
        if (subjectId !== 'all') params.set('subjectId', subjectId);

        const query = params.toString();
        const response = await fetchWithAuth<{ items?: Textbook[]; textbooks?: Textbook[] }>(`/api/textbooks${query ? `?${query}` : ''}`);
        setItems(response.items ?? response.textbooks ?? []);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load textbooks.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [grade, medium, subjectId]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.subjectSlug.toLowerCase().includes(search.toLowerCase());
      const matchesGrade = grade === 'all' || String(item.grade) === grade;
      const matchesMedium = medium === 'all' || item.medium === medium;
      const matchesSubject = subjectId === 'all' || item.subjectId === subjectId;
      return matchesSearch && matchesGrade && matchesMedium && matchesSubject;
    });
  }, [grade, items, medium, search, subjectId]);

  const clearFilters = () => {
    setGrade('all');
    setMedium('all');
    setSubjectId('all');
    setSearch('');
    if (window.history.replaceState) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('subjectId');
      window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
    }
  };

  const activeSubjectLabel = subjectId === 'all' ? t('mathematics') : subjects.find((subject) => subject.id === subjectId)?.name ?? t('mathematics');

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">{t('myResources')}</p>
              <h1 className="mt-2 text-3xl font-bold">{t('textbooks')}</h1>
            </div>
          </header>

          <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchTextbook')} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white md:col-span-2" />
            {subjects.length > 1 ? (
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">Mathematics</div>
            )}
            <button type="button" onClick={clearFilters} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white">{t('clearFilters')}</button>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
              <option value="all">{t('allGrades')}</option>
              {[6,7,8,9,10,11,12,13].map((value) => (
                <option key={value} value={String(value)}>{value}</option>
              ))}
            </select>
            <select value={medium} onChange={(e) => setMedium(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
              <option value="all">{t('allMedia')}</option>
              <option value="English">English</option>
              <option value="Sinhala">Sinhala</option>
              <option value="Tamil">Tamil</option>
            </select>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {t('showing')}: <span className="font-semibold text-white">{activeSubjectLabel}</span>
          </div>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error} <button type="button" onClick={() => window.location.reload()} className="ml-2 underline">Retry</button></div> : null}

          {!error && loading ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">{t('loadingTextbooksFull')}</div> : null}

          {!error && !loading && filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">{t('noMatchingTextbooks')}</div>
          ) : null}

          {!error && !loading && filtered.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((textbook) => (
                <article key={textbook.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{t('grade')} {textbook.grade} · {textbook.medium}</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">{textbook.title}</h2>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">{t('verified')}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{textbook.subjectSlug} · {textbook.bookType}</p>
                  {textbook.part ? <p className="mt-1 text-sm text-slate-400">{t('part')} {textbook.part}</p> : null}
                  {textbook.lastVerifiedAt ? <p className="mt-2 text-xs text-slate-400">{t('lastVerified')}: {new Date(String(textbook.lastVerifiedAt)).toLocaleDateString()}</p> : null}
                  <div className="mt-5 flex gap-3">
                    <Link href={`/textbook/${textbook.id}`} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white">{t('view')}</Link>
                    {textbook.officialFileUrl ? (
                      <a href={`/api/textbooks/${textbook.id}/download`} rel="noreferrer" className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">{t('downloadThroughEdunexa')}</a>
                    ) : (
                      <span className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-400">{t('unavailable')}</span>
                    )}
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
