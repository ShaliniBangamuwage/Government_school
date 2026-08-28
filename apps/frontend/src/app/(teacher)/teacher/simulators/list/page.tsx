"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/api/client'

export default function TeacherSimulatorsList() {
  const [items, setItems] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [creatingDemo, setCreatingDemo] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        try {
          const payload = await fetchWithAuth('/api/teacher/simulators')
          if (mounted) setItems((payload as any).simulators ?? [])
        } catch (e: any) {
          throw e
        }
      } catch (ex: any) {
        if (mounted) setError(ex?.message ?? String(ex))
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  async function handleDelete(simulator: any) {
    if (!window.confirm(`Delete "${simulator.title ?? 'Untitled simulator'}"?`)) return

    setDeletingId(simulator.id)
    setError(null)
    try {
      await fetchWithAuth(`/api/teacher/simulators/${simulator.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'deleted' }),
      })
      setItems((current) => current?.filter((item) => item.id !== simulator.id) ?? [])
    } catch (ex: any) {
      setError(ex?.message ?? String(ex))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-500">Simulator studio</p><h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Your simulators</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Build, review, and publish interactive Mathematics activities.</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/teacher/simulators/create" className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pink-700">Create simulator</Link>
          <button type="button" disabled={creatingDemo} onClick={async () => {
          setCreatingDemo(true)
          setError(null)
          setNotice(null)
          setItems(null)
          try {
            const body = { ideaId: '0', prompt: 'Demo simulator: interactive cylinder (radius & height sliders). Show volume and surface area.', title: 'Demo: Cylinder' }
            const res = await fetchWithAuth('/api/simulator-generation/generate-from-prompt', { method: 'POST', body: JSON.stringify(body) })
            const sim = (res as any)?.simulator ?? res
            if (!sim || !sim.id) throw new Error('Failed to create demo simulator')
            await fetchWithAuth(`/api/teacher/simulators/${sim.id}/publish`, { method: 'POST' })
            const payload = await fetchWithAuth('/api/teacher/simulators')
            setItems((payload as any).simulators ?? [])
            setNotice('Demo simulator created and published.')
          } catch (ex: any) {
            setError(ex?.message ?? String(ex))
          } finally { setCreatingDemo(false) }
        }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-pink-400 hover:text-pink-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{creatingDemo ? 'Creating demo...' : 'Create demo'}</button>
        </div>
      </header>
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
      {items === null ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Loading your simulators...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"><p className="text-lg font-semibold text-slate-900 dark:text-white">No simulators yet</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create your first interactive Mathematics activity to get started.</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((it) => (
            <article key={it.id} className="flex min-h-48 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold text-slate-900 dark:text-white">{it.title ?? 'Untitled simulator'}</h2><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${it.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}`}>{it.status ?? 'draft'}</span></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{(it.config && it.config.description) || it.prompt || 'No description provided.'}</p></div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-pink-400 hover:text-pink-600 dark:border-slate-700 dark:text-slate-200" onClick={() => { window.location.href = `/teacher/simulators/${it.id}/edit` }}>Edit</button>
                {it.status === 'published' ? (
                  <button type="button" disabled={deletingId === it.id} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40" onClick={() => void handleDelete(it)}>{deletingId === it.id ? 'Deleting...' : 'Delete'}</button>
                ) : (
                <button type="button" disabled={publishingId === it.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50" onClick={async () => {
                  setPublishingId(it.id)
                  try {
                    await fetchWithAuth(`/api/teacher/simulators/${it.id}/publish`, { method: 'POST' })
                    // refresh list
                    const payload = await fetchWithAuth('/api/teacher/simulators')
                    setItems((payload as any).simulators ?? [])
                    setNotice('Simulator published successfully.')
                  } catch (ex: any) { window.alert('Failed to publish: ' + (ex?.message ?? String(ex))) } finally { setPublishingId(null) }
                }}>{publishingId === it.id ? 'Publishing...' : 'Publish'}</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
