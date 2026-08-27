"use client"
import React, { useRef, useState } from 'react'
import { fetchWithAuth } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const GeneratedSimulatorPreview = dynamic(
  () => import('@/components/simulators/sandpack-simulator-preview').then((module) => module.GeneratedSimulatorPreview),
  { ssr: false },
)

const IDEAS = [
  'Fractions (circle/bar shading)',
  'Geometry: move triangle vertices',
  'Coordinate graph: slope/intercept',
  '3D solids: cylinder/cube/cone',
  'Probability: spin wheel / dice',
  'Statistics: mean/median/mode chart',
  'Algebra balance scale',
  'Functions: parametric curves',
  'Transformations: translate/rotate/scale',
  'Trigonometry: unit circle explorer',
  'Vectors: addition and components',
  'Calculus: area under curve (Riemann)',
  'Measurement: perimeter/area explorer',
  'Ratios & Proportions visualiser',
  'Decimals & Place value blocks',
  'Number lines and integer operations',
  'Symmetry and reflections demo',
  'Coordinate geometry: circle-line intersections',
  'Graph theory: simple network explorer',
  'Probability distributions visualiser',
]

export default function TeacherSimulatorCreate() {
  const [ideaIndex, setIdeaIndex] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const generationInFlight = useRef(false)
  const router = useRouter()

  async function handleGenerate() {
    if (generationInFlight.current) return
    generationInFlight.current = true
    setError(null)
    setLoading(true)
    setResult(null)
    setShowCode(false)
    try {
      const body = { ideaId: String(ideaIndex), prompt, title }
      const payload = await fetchWithAuth('/simulator-generation/generate-from-prompt', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const simulator = (payload as any)?.simulator ?? payload
      setResult({
        ...simulator,
        generatedFiles: simulator?.generatedFiles ?? null,
        dependencies: simulator?.dependencies ?? { react: 'latest', 'react-dom': 'latest' },
      })
    } catch (ex: any) {
      setError(ex?.message ?? String(ex))
    } finally {
      generationInFlight.current = false
      setLoading(false)
    }
  }

  async function handleSaveDraft() {
    if (!(result as any)?.id) {
      setError('Generate a simulator before saving it as a draft.')
      return
    }

    try {
      await fetchWithAuth(`/teacher/simulators/${(result as any).id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: (result as any).title ?? title,
          prompt,
          generatedFiles: (result as any).generatedFiles,
          dependencies: (result as any).dependencies,
        }),
      })
      alert('Draft saved')
    } catch (ex: any) {
      setError(ex?.message ?? String(ex))
    }
  }

  async function handlePublish() {
    try {
      if (!(result as any)?.id) throw new Error('No simulator id')
      await fetchWithAuth(`/teacher/simulators/${(result as any).id}/publish`, { method: 'POST' })
      alert('Published')
      router.push('/teacher/simulators')
    } catch (ex: any) { alert('Publish failed: ' + (ex?.message ?? String(ex))) }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Create Simulator from Prompt</h2>
      <div style={{ marginTop: 12 }}>
        <label>Pick idea:</label>
        <select value={ideaIndex} onChange={(e) => setIdeaIndex(Number(e.target.value))}>
          {IDEAS.map((t, i) => (
            <option key={i} value={i}>{i+1}. {t}</option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>Title (optional):</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} />
      </div>
      <div style={{ marginTop: 8 }}>
        <label>Describe what you want the simulator to do (teacher prompt):</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} style={{ width: '100%' }} />
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={handleGenerate} disabled={loading || prompt.trim().length === 0}>Generate</button>
        {result && (
          <>
            <button onClick={() => setShowCode((value) => !value)}>{showCode ? 'Hide code' : 'View Generated Code'}</button>
            <button onClick={handleSaveDraft}>Save Draft</button>
            <button onClick={handlePublish}>Publish</button>
            <button onClick={() => router.push('/teacher/simulators')}>Back to list</button>
          </>
        )}
      </div>

      {loading && <div style={{ marginTop: 12 }}>Generating…</div>}
      {error && <div role="alert" style={{ marginTop: 12, color: '#9f1239', background: '#fff1f2', border: '1px solid #fda4af', padding: 12 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 12, border: '1px solid #e5e7eb', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>Simulator preview</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleGenerate} disabled={loading}>Regenerate</button>
              <button onClick={handleSaveDraft}>Save Draft</button>
              <button onClick={handlePublish}>Publish</button>
            </div>
          </div>

          <GeneratedSimulatorPreview
            title={(result as any).title ?? (title || 'AI-generated simulator')}
            files={(result as any).generatedFiles ?? null}
            dependencies={(result as any).dependencies ?? null}
            error={error}
            showCode={showCode}
            onRegenerate={handleGenerate}
          />
        </div>
      )}
    </div>
  )
}

