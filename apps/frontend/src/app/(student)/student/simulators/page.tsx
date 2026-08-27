"use client"
import React, { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/api/client'
import Link from 'next/link'

type Simulator = {
  id: string
  title?: string
  description?: string
  authorId?: string
  publishedAt?: string
  createdAt?: string
}

export default function StudentSimulatorsPage() {
  const [items, setItems] = useState<Simulator[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const payload = await fetchWithAuth('/student/simulators')
        setItems((payload as any).simulators ?? [])
      } catch (err) {
        console.error('Failed to load simulators', err)
        setError('We could not load the simulators right now. Please try again.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const visibleItems = items.filter((item) => {
    const query = search.trim().toLowerCase()
    return !query || `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase().includes(query)
  })

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950 p-6 shadow-xl shadow-cyan-950/20 sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Interactive learning</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Explore simulators</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">Learn by experimenting with interactive activities built for your lessons.</p>
          </div>
          <Link href="/student/dashboard" className="inline-flex w-fit items-center rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-white">
            ← Back to dashboard
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Your learning tools</h2>
          <p className="mt-1 text-sm text-slate-400">{items.length} {items.length === 1 ? 'simulator' : 'simulators'} available</p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search simulators</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search simulators" className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-9 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" />
        </label>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />)}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-500/50 bg-red-500/10 p-5 text-red-200">{error}</div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-2xl text-cyan-300">◇</div>
          <h2 className="mt-4 text-lg font-bold text-white">{search ? 'No matching simulators' : 'No simulators yet'}</h2>
          <p className="mt-2 text-sm text-slate-400">{search ? 'Try a different search term.' : 'Published activities will appear here when they are ready.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item, index) => (
            <article key={item.id} className="group flex min-h-56 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/20 transition hover:-translate-y-1 hover:border-cyan-400/50 hover:bg-slate-800/90">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-lg font-black text-cyan-300">{String(index + 1).padStart(2, '0')}</div>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Ready to use</span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">{item.title ?? 'Untitled simulator'}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-400">{item.description ?? 'An interactive activity to help you practise and understand the lesson.'}</p>
              <button type="button" onClick={() => window.open(`/simulators/${item.id}`, '_blank', 'noopener,noreferrer')} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900">
                Open simulator <span className="ml-2 text-base">↗</span>
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
