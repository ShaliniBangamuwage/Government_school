'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { fetchWithAuth } from '@/lib/api/client';
import {
  createTextbook,
  fetchTextbooks,
  updateTextbook,
  updateTextbookVerification,
  type TextbookMedium,
  type TextbookPayload,
  type TextbookRecord,
  type TextbookStream,
  type TextbookType,
  type TextbookVerificationStatus,
} from '@/lib/textbooks';

type SubjectOption = {
  id: string;
  name: string;
  description?: string;
  status?: 'active' | 'archived';
};

const emptyPayload: TextbookPayload = {
  title: '',
  subjectId: '',
  subjectSlug: 'mathematics',
  grade: 6,
  medium: 'English',
  stream: null,
  bookType: 'textbook',
  part: '',
  syllabusYear: 2024,
  editionYear: 2024,
  officialPageUrl: '',
  officialFileUrl: '',
  sourceDomain: 'edupub.gov.lk',
  hostingMode: 'official-link',
  hostingPermission: 'link-only',
  verificationStatus: 'pending',
  isActive: true,
  coverImageUrl: '',
  fileSizeBytes: 0,
};

export default function AdminTextbooksPage() {
  const [items, setItems] = useState<TextbookRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TextbookPayload>(emptyPayload);

  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all');
  const [mediumFilter, setMediumFilter] = useState<TextbookMedium | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TextbookVerificationStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const loadSubjects = async () => {
    try {
      const response = await fetchWithAuth<{ subjects?: SubjectOption[] }>('/api/subjects');
      const mathOnlySubjects = (response.subjects ?? []).filter((subject) => subject.status !== 'archived' && /math|mathematics/i.test(subject.name));
      setSubjects(mathOnlySubjects);
      if (mathOnlySubjects.length > 0 && !form.subjectId) {
        setForm((current) => ({ ...current, subjectId: mathOnlySubjects[0].id, subjectSlug: mathOnlySubjects[0].name }));
      }
    } catch (_error) {
      setSubjects([]);
    }
  };

  const loadTextbooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const textbooks = await fetchTextbooks({
        grade: gradeFilter,
        medium: mediumFilter,
        verificationStatus: statusFilter,
      });
      setItems(textbooks);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load textbooks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubjects();
    void loadTextbooks();
  }, [gradeFilter, mediumFilter, statusFilter]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((textbook) => {
      if (!query) return true;
      return [textbook.title, textbook.subjectSlug, textbook.sourceDomain ?? '', textbook.bookType]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [items, search]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyPayload);
  };

  const handleFieldChange = <K extends keyof TextbookPayload>(key: K, value: TextbookPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const normalized = {
        ...form,
        title: form.title.trim(),
        subjectId: form.subjectId?.trim() || undefined,
        subjectSlug: (form.subjectSlug ?? '').trim() || (subjects.find((subject) => subject.id === form.subjectId)?.name ?? 'general'),
        part: form.part?.trim() || undefined,
        officialPageUrl: form.officialPageUrl?.trim() || undefined,
        officialFileUrl: form.officialFileUrl?.trim() || undefined,
        sourceDomain: form.sourceDomain?.trim() || undefined,
        coverImageUrl: form.coverImageUrl?.trim() || undefined,
      };

      if (editingId) {
        await updateTextbook(editingId, normalized);
      } else {
        await createTextbook(normalized);
      }

      resetForm();
      await loadTextbooks();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save textbook.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (textbook: TextbookRecord) => {
    setEditingId(textbook.id);
    setForm({
      title: textbook.title,
      subjectId: textbook.subjectId ?? '',
      subjectSlug: textbook.subjectSlug,
      grade: textbook.grade,
      medium: textbook.medium,
      stream: textbook.stream ?? null,
      bookType: textbook.bookType,
      part: textbook.part ?? '',
      syllabusYear: textbook.syllabusYear,
      editionYear: textbook.editionYear,
      officialPageUrl: textbook.officialPageUrl ?? '',
      officialFileUrl: textbook.officialFileUrl ?? '',
      sourceDomain: textbook.sourceDomain ?? '',
      hostingMode: textbook.hostingMode,
      hostingPermission: textbook.hostingPermission,
      verificationStatus: textbook.verificationStatus,
      isActive: textbook.isActive,
      coverImageUrl: textbook.coverImageUrl ?? '',
      fileSizeBytes: textbook.fileSizeBytes ?? 0,
    });
  };

  const handleVerify = async (textbook: TextbookRecord, status: TextbookVerificationStatus) => {
    try {
      setSaving(true);
      await updateTextbookVerification(textbook.id, status);
      await loadTextbooks();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update verification status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Academic content</p>
              <h1 className="mt-2 text-3xl font-bold">Textbook management</h1>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm text-slate-300">
                Title
                <input value={form.title} onChange={(event) => handleFieldChange('title', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" required />
              </label>

              <label className="text-sm text-slate-300">
                Subject
                <select value={form.subjectId ?? ''} onChange={(event) => {
                  const selected = event.target.value;
                  const selectedSubject = subjects.find((subject) => subject.id === selected);
                  handleFieldChange('subjectId', selected || undefined);
                  if (selectedSubject) {
                    handleFieldChange('subjectSlug', selectedSubject.name);
                  }
                }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" required>
                  {subjects.length > 0 ? subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  )) : (
                    <option value="mathematics">Mathematics</option>
                  )}
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Grade
                <select value={String(form.grade)} onChange={(event) => handleFieldChange('grade', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  {[6, 7, 8, 9, 10, 11, 12, 13].map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Medium
                <select value={form.medium} onChange={(event) => handleFieldChange('medium', event.target.value as TextbookMedium)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  <option value="English">English</option>
                  <option value="Sinhala">Sinhala</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Stream
                <select value={form.stream ?? 'common'} onChange={(event) => handleFieldChange('stream', event.target.value === 'common' ? null : (event.target.value as TextbookStream))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  <option value="common">Common</option>
                  <option value="biological-science">Biological Science</option>
                  <option value="physical-science">Physical Science</option>
                  <option value="commerce">Commerce</option>
                  <option value="arts">Arts</option>
                  <option value="technology">Technology</option>
                  <option value="vocational">Vocational</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Book type
                <select value={form.bookType} onChange={(event) => handleFieldChange('bookType', event.target.value as TextbookType)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  <option value="textbook">Textbook</option>
                  <option value="resource-book">Resource book</option>
                  <option value="teacher-guide">Teacher guide</option>
                  <option value="workbook">Workbook</option>
                  <option value="practical-handbook">Practical handbook</option>
                  <option value="supplementary-reader">Supplementary reader</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Part / Unit
                <input value={form.part ?? ''} onChange={(event) => handleFieldChange('part', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-slate-300">
                Syllabus year
                <input type="number" value={form.syllabusYear ?? ''} onChange={(event) => handleFieldChange('syllabusYear', Number(event.target.value) || undefined)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-slate-300">
                Edition year
                <input type="number" value={form.editionYear ?? ''} onChange={(event) => handleFieldChange('editionYear', Number(event.target.value) || undefined)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-slate-300">
                Source domain
                <input value={form.sourceDomain ?? ''} onChange={(event) => handleFieldChange('sourceDomain', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-slate-300">
                Official page URL
                <input value={form.officialPageUrl ?? ''} onChange={(event) => handleFieldChange('officialPageUrl', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-slate-300 md:col-span-2">
                Official file URL
                <input value={form.officialFileUrl ?? ''} onChange={(event) => handleFieldChange('officialFileUrl', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" required />
              </label>

              <label className="text-sm text-slate-300">
                Hosting mode
                <select value={form.hostingMode ?? 'official-link'} onChange={(event) => handleFieldChange('hostingMode', event.target.value as 'official-link' | 'firebase-storage')} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  <option value="official-link">Official link</option>
                  <option value="firebase-storage">Firebase storage</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Hosting permission
                <select value={form.hostingPermission ?? 'link-only'} onChange={(event) => handleFieldChange('hostingPermission', event.target.value as 'link-only' | 'pending' | 'confirmed')} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  <option value="link-only">Link only</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Verification status
                <select value={form.verificationStatus ?? 'pending'} onChange={(event) => handleFieldChange('verificationStatus', event.target.value as TextbookVerificationStatus)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                File size bytes
                <input type="number" value={form.fileSizeBytes ?? 0} onChange={(event) => handleFieldChange('fileSizeBytes', Number(event.target.value) || 0)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={saving} className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">
                {saving ? 'Saving...' : editingId ? 'Update textbook' : 'Create textbook'}
              </button>
              {editingId ? (
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 font-medium text-white">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="grid gap-4 md:grid-cols-5">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or subject" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white md:col-span-2" />
              <select value={String(gradeFilter)} onChange={(event) => setGradeFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                <option value="all">All grades</option>
                {[6,7,8,9,10,11,12,13].map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              <select value={mediumFilter} onChange={(event) => setMediumFilter(event.target.value as TextbookMedium | 'all')} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                <option value="all">All media</option>
                <option value="English">English</option>
                <option value="Sinhala">Sinhala</option>
                <option value="Tamil">Tamil</option>
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TextbookVerificationStatus | 'all')} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="broken">Broken</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </section>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          {loading ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Loading textbooks…</div> : null}

          {!loading && filteredItems.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">No textbooks match the current filters.</div>
          ) : null}

          {!loading && filteredItems.length > 0 ? (
            <div className="space-y-3">
              {filteredItems.map((textbook) => (
                <article key={textbook.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Grade {textbook.grade} · {textbook.medium}</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">{textbook.title}</h2>
                      <p className="mt-1 text-sm text-slate-300">{textbook.subjectSlug} · {textbook.bookType}</p>
                      <p className="mt-1 text-xs text-slate-400">{textbook.sourceDomain ?? 'Official source'} · {textbook.verificationStatus}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEdit(textbook)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white">Edit</button>
                      <button type="button" onClick={() => void handleVerify(textbook, 'verified')} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950">Verify</button>
                      <button type="button" onClick={() => void handleVerify(textbook, 'archived')} className="rounded-xl border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">Archive</button>
                    </div>
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
