'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { ProtectedRoute, hasRequiredStudentAcademicProfile } from '@/lib/auth/route-guard';

const gradeOptions = [6, 7, 8, 9, 10, 11];
const mediumOptions = ['Sinhala', 'Tamil', 'English'] as const;

export default function StudentCompleteProfilePage() {
  const router = useRouter();
  const { profile, grade, medium, updateCurrentProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [selectedGrade, setSelectedGrade] = useState<number | ''>(profile?.grade ?? grade ?? '');
  const [selectedMedium, setSelectedMedium] = useState<(typeof mediumOptions)[number]>(
    (profile?.medium ?? medium ?? 'English') as (typeof mediumOptions)[number],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.fullName) setFullName(profile.fullName);
    if (profile?.grade !== undefined && profile.grade !== null) setSelectedGrade(profile.grade);
    else if (grade !== undefined && grade !== null) setSelectedGrade(grade);
    if (profile?.medium) setSelectedMedium(profile.medium as (typeof mediumOptions)[number]);
    else if (medium) setSelectedMedium(medium as (typeof mediumOptions)[number]);
  }, [profile, grade, medium]);

  const hasAcademicProfile = hasRequiredStudentAcademicProfile({ profile, grade, medium });

  if (hasAcademicProfile && profile?.onboardingCompleted) {
    router.replace('/student/dashboard');
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!selectedGrade || !selectedMedium) {
      setError('Please choose your grade and medium.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateCurrentProfile({
        fullName: fullName.trim(),
        grade: Number(selectedGrade),
        medium: selectedMedium,
        onboardingCompleted: true,
      });
      router.push('/student/dashboard');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save your profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-50">
        <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/30 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Profile setup</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Complete your student profile</h1>
          <p className="mt-2 text-sm text-slate-300">Choose the academic details tied to your learning profile before you continue.</p>

          {error ? (
            <div role="alert" className="mt-5 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-200">Full name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="grade" className="mb-1 block text-sm font-medium text-slate-200">Grade</label>
                <select
                  id="grade"
                  value={selectedGrade}
                  onChange={(event) => setSelectedGrade(event.target.value === '' ? '' : Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
                >
                  <option value="">Select grade</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="medium" className="mb-1 block text-sm font-medium text-slate-200">Preferred medium</label>
                <select
                  id="medium"
                  value={selectedMedium}
                  onChange={(event) => setSelectedMedium(event.target.value as (typeof mediumOptions)[number])}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
                >
                  {mediumOptions.map((mediumOption) => (
                    <option key={mediumOption} value={mediumOption}>{mediumOption}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60"
            >
              {isSubmitting ? 'Saving profile...' : 'Save and continue'}
            </button>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}
