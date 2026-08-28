'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type AnalyticsQuiz = { id: string; title?: string; grade?: number; medium?: string; status?: string; attemptCount?: number; averagePercentage?: number; passRate?: number };
export type AnalyticsAttempt = { quizId?: string; quizTitle?: string; percentage?: number; passed?: boolean; submittedAt?: unknown };

function dateValue(value: unknown) {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') return new Date((value as { toMillis: () => number }).toMillis());
  return new Date(String(value ?? 0));
}

export function QuizAnalytics({ quizzes, attempts, scope }: { quizzes: AnalyticsQuiz[]; attempts: AnalyticsAttempt[]; scope: 'teacher' | 'admin' }) {
  const gradeData = useMemo(() => {
    const groups = new Map<number, { grade: number; attempts: number; total: number; passed: number }>();
    attempts.forEach((attempt) => {
      const quiz = quizzes.find((item) => item.id === attempt.quizId);
      const grade = Number(quiz?.grade ?? 0);
      if (!grade) return;
      const group = groups.get(grade) ?? { grade, attempts: 0, total: 0, passed: 0 };
      group.attempts += 1;
      group.total += Number(attempt.percentage ?? 0);
      group.passed += attempt.passed ? 1 : 0;
      groups.set(grade, group);
    });
    return [...groups.values()].sort((left, right) => left.grade - right.grade).map((group) => ({ ...group, average: Math.round(group.total / group.attempts), passRate: Math.round((group.passed / group.attempts) * 100), label: `Grade ${group.grade}` }));
  }, [attempts, quizzes]);

  const quizData = useMemo(() => {
    const groups = new Map<string, { name: string; total: number; attempts: number }>();
    attempts.forEach((attempt) => {
      const quiz = quizzes.find((item) => item.id === attempt.quizId);
      const quizId = String(attempt.quizId ?? quiz?.id ?? '');
      if (!quizId) return;
      const group = groups.get(quizId) ?? { name: (attempt.quizTitle ?? quiz?.title ?? 'Untitled quiz').slice(0, 22), total: 0, attempts: 0 };
      group.total += Number(attempt.percentage ?? 0);
      group.attempts += 1;
      groups.set(quizId, group);
    });
    return [...groups.values()].map((group) => ({ ...group, average: Math.round(group.total / group.attempts) })).sort((left, right) => right.average - left.average).slice(0, 8);
  }, [attempts, quizzes]);
  const distribution = useMemo(() => [
    { name: 'Strong 75-100%', value: attempts.filter((attempt) => Number(attempt.percentage) >= 75).length, color: '#db2777' },
    { name: 'Developing 50-74%', value: attempts.filter((attempt) => Number(attempt.percentage) >= 50 && Number(attempt.percentage) < 75).length, color: '#f59e0b' },
    { name: 'Needs support 0-49%', value: attempts.filter((attempt) => Number(attempt.percentage) < 50).length, color: '#64748b' },
  ], [attempts]);
  const average = attempts.length ? Math.round(attempts.reduce((total, attempt) => total + Number(attempt.percentage ?? 0), 0) / attempts.length) : 0;
  const passRate = attempts.length ? Math.round((attempts.filter((attempt) => attempt.passed).length / attempts.length) * 100) : 0;
  const strongestGrade = [...gradeData].sort((left, right) => right.average - left.average)[0];
  const focusGrade = [...gradeData].sort((left, right) => left.average - right.average)[0];
  const insight = attempts.length ? `${strongestGrade ? `${strongestGrade.label} leads at ${strongestGrade.average}%.` : `The average score is ${average}%.`} ${focusGrade && focusGrade.grade !== strongestGrade?.grade ? `${focusGrade.label} is the best next focus at ${focusGrade.average}%.` : 'Keep building consistency with regular practice.'}` : 'Complete a quiz to unlock grade-wise performance insights.';
  const recent = [...attempts].sort((left, right) => dateValue(right.submittedAt).getTime() - dateValue(left.submittedAt).getTime()).slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['Quizzes', quizzes.length], ['Submissions', attempts.length], ['Average score', `${average}%`], ['Pass rate', `${passRate}%`]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p></div>)}
      </section>
      <section className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-white p-5 dark:border-pink-900/50 dark:from-pink-950/30 dark:to-slate-900"><p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-600 dark:text-pink-300">AI learning signal</p><p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{scope === 'admin' ? 'Platform performance signal' : 'Your teaching focus'}</p><p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">{insight}</p></section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Performance by grade</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Average score and pass rate</p><div className="mt-5 h-72">{gradeData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={gradeData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="average" name="Average %" fill="#db2777" radius={[5, 5, 0, 0]} /><Bar dataKey="passRate" name="Pass rate %" fill="#0d9488" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="pt-24 text-center text-sm text-slate-500">No grade data yet.</p>}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Score distribution</h2><div className="mt-3 h-64">{attempts.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="pt-24 text-center text-sm text-slate-500">No submissions yet.</p>}</div><div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">{distribution.map((entry) => <div key={entry.name} className="flex justify-between"><span>{entry.name}</span><strong>{entry.value}</strong></div>)}</div></div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Quiz performance</h2><div className="mt-5 h-72">{quizData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={quizData} layout="vertical" margin={{ left: 20, right: 16 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" domain={[0, 100]} /><YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="average" name="Average %" fill="#7c3aed" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer> : <p className="pt-24 text-center text-sm text-slate-500">Quiz results will appear here.</p>}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent submissions</h2><div className="mt-4 space-y-3">{recent.length ? recent.map((attempt, index) => <div key={`${attempt.quizId}-${index}`} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm dark:border-slate-800"><div className="min-w-0"><p className="truncate font-semibold text-slate-800 dark:text-slate-200">{attempt.quizTitle ?? 'Mathematics quiz'}</p><p className="text-xs text-slate-500">{dateValue(attempt.submittedAt).toLocaleDateString()}</p></div><span className={`font-bold ${attempt.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{Math.round(Number(attempt.percentage ?? 0))}%</span></div>) : <p className="text-sm text-slate-500">No submissions yet.</p>}</div></div>
      </section>
    </div>
  );
}
