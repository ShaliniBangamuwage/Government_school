"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/api/client'

export default function TeacherSimulatorsList() {
  const [items, setItems] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        try {
          const payload = await fetchWithAuth('/teacher/simulators')
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

  return (
    <div style={{ padding: 20 }}>
      <h2>Your Simulators</h2>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
        <Link href="/teacher/simulators/create">Create new simulator</Link>
        <button onClick={async () => {
          setError(null)
          setItems(null)
          try {
            const body = { ideaId: '0', prompt: 'Demo simulator: interactive cylinder (radius & height sliders). Show volume and surface area.', title: 'Demo: Cylinder' }
            const res = await fetchWithAuth('/simulator-generation/generate-from-prompt', { method: 'POST', body: JSON.stringify(body) })
            const sim = (res as any)?.simulator ?? res
            if (!sim || !sim.id) throw new Error('Failed to create demo simulator')
            await fetchWithAuth(`/teacher/simulators/${sim.id}/publish`, { method: 'POST' })
            const payload = await fetchWithAuth('/teacher/simulators')
            setItems((payload as any).simulators ?? [])
            alert('Demo simulator created and published')
          } catch (ex: any) {
            setError(ex?.message ?? String(ex))
          }
        }}>Create demo simulator</button>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {items === null ? (
        <div>Loading…</div>
      ) : items.length === 0 ? (
        <div>No simulators yet.</div>
      ) : (
        <ul>
          {items.map((it) => (
            <li key={it.id} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{it.title ?? 'Untitled'}</div>
              <div style={{ fontSize: 13, color: '#444' }}>{(it.config && it.config.description) || it.prompt}</div>
              <div style={{ marginTop: 6 }}>
                <button style={{ marginRight: 8 }} onClick={() => { window.location.href = `/teacher/simulators/${it.id}/edit` }}>Edit</button>
                <button onClick={async () => {
                  try {
                    await fetchWithAuth(`/teacher/simulators/${it.id}/publish`, { method: 'POST' })
                    // refresh list
                    const payload = await fetchWithAuth('/teacher/simulators')
                    setItems((payload as any).simulators ?? [])
                    window.alert('Published')
                  } catch (ex: any) { window.alert('Failed to publish: ' + (ex?.message ?? String(ex))) }
                }}>Publish</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
