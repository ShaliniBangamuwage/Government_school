export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-slate-50">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="mt-2 text-slate-300">You do not have access to this page.</p>
      </div>
    </main>
  );
}
