"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'
import { SimulatorRenderer } from '@/components/simulators/simulator-renderer'
import dynamic from 'next/dynamic'

const GeneratedSimulatorPreview = dynamic(
  () => import('@/components/simulators/sandpack-simulator-preview').then((module) => module.GeneratedSimulatorPreview),
  { ssr: false },
)

type Simulator = {
  id: string
  title?: string
  description?: string
  config?: any
  generatedFiles?: Record<string, string>
  dependencies?: Record<string, string>
}

export default function SimulatorViewerPage() {
  const params = useParams() as { id?: string }
  const id = params?.id
  const { firebaseUser, loading: authLoading } = useAuth()
  const [sim, setSim] = useState<Simulator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || authLoading) return

    if (!firebaseUser) {
      setError('Please sign in to open this simulator.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const payload = await fetchWithAuth(`/api/simulators/${id}`)
        const found = (payload as any).simulator ?? null
        setSim(found)
      } catch (err) {
        console.error('Failed to load simulator', err)
        setSim(null)
        setError(err instanceof Error ? err.message : 'Unable to load this simulator.')
      } finally {
        setLoading(false)
      }
    })()
  }, [authLoading, firebaseUser, id])

  if (!id) return <div>Missing simulator id</div>
  if (loading || authLoading) return <div>Loading...</div>
  if (!sim) return <div>{error ?? 'Simulator not found or not published.'}</div>

  return (
    <div style={{ padding: 20 }}>
      <h1>{sim.title ?? 'Simulator'}</h1>
      {sim.description && <p>{sim.description}</p>}
      <div style={{ marginTop: 20 }}>
        {sim.generatedFiles?.['/App.tsx'] && sim.generatedFiles?.['/styles.css'] ? (
          <GeneratedSimulatorPreview
            title={sim.title}
            description={sim.description}
            files={sim.generatedFiles}
            dependencies={sim.dependencies}
          />
        ) : (
          <SimulatorRenderer config={sim.config} title={sim.title} />
        )}
      </div>
    </div>
  )
}
