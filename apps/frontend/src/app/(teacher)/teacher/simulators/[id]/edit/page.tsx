"use client"
import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api/client'
import { SimulatorRenderer } from '@/components/simulators/simulator-renderer'
import { buildSimulatorConfig } from '@/lib/simulator-config'

export default function EditSimulatorPage() {
  const params = useParams() as { id?: string }
  const id = params?.id
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [configJson, setConfigJson] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    ;(async () => {
      try {
        const payload = await fetchWithAuth(`/teacher/simulators/${id}`)
        const sim = (payload as any).simulator
        if (!sim) throw new Error('Simulator not found')
        setTitle(sim.title ?? '')
        setPrompt(sim.prompt ?? '')
        setConfigJson(JSON.stringify(sim.config ?? {}, null, 2))
      } catch (ex: any) {
        setError(ex?.message ?? String(ex))
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (!id) return <div>Missing simulator id</div>
  if (loading) return <div>Loading…</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>Edit Simulator</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Title</label>
          <input style={{ width: '100%', padding: 8 }} value={title} onChange={(e) => setTitle(e.target.value)} />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 6 }}>Prompt</label>
          <textarea style={{ width: '100%', minHeight: 100, padding: 8 }} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

          <label style={{ display: 'block', marginTop: 12, marginBottom: 6 }}>Config (JSON)</label>
          <textarea style={{ width: '100%', minHeight: 200, padding: 8, fontFamily: 'monospace' }} value={configJson} onChange={(e) => setConfigJson(e.target.value)} />

          <div style={{ marginTop: 12 }}>
            <button onClick={async () => {
              setError(null)
              try {
                let parsed: any = {}
                try { parsed = JSON.parse(configJson) } catch (e) { throw new Error('Config JSON is invalid') }
                const body = { title, prompt, config: parsed }
                await fetchWithAuth(`/teacher/simulators/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
                router.push('/teacher/simulators')
              } catch (ex: any) { setError(ex?.message ?? String(ex)) }
            }}>Save</button>
            <button style={{ marginLeft: 8 }} onClick={() => router.back()}>Cancel</button>
          </div>
        </div>
        <div style={{ width: 420 }}>
          <h3>Preview</h3>
          <div style={{ background: '#fbfbfb', padding: 12 }}>
            <SimulatorRenderer config={buildSimulatorConfig({ prompt, title, config: (() => { try { return JSON.parse(configJson) } catch { return {} } })() })} title={title} />
          </div>
        </div>
      </div>
    </div>
  )
}
