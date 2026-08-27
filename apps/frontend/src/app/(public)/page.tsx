import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 text-sm uppercase tracking-[0.3em] text-cyan-400">EduNexa</p>
        <h1 className="text-4xl font-bold md:text-6xl">Your learning platform foundation</h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          Built for students, teachers, and administrators with a role-based monorepo architecture.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/login" className="rounded bg-cyan-500 px-5 py-3 font-semibold text-slate-950">Login</Link>
          <Link href="/register" className="rounded border border-slate-600 px-5 py-3 font-semibold text-slate-100">Register</Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Student</h2>
            <p className="mt-2 text-slate-300">Study planner, progress, resources, quizzes, and AI support.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Teacher</h2>
            <p className="mt-2 text-slate-300">Content authoring, review queues, question bank, and insights.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Admin</h2>
            <p className="mt-2 text-slate-300">Analytics, approvals, user management, and system health.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
