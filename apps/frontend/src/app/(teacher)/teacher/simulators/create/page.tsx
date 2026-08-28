"use client"
import React, { useRef, useState } from 'react'
import { fetchWithAuth } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'
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
  const { firebaseUser, loading: authLoading } = useAuth()
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
    if (authLoading || !firebaseUser) {
      setError('Your teacher session is still loading. Please wait a moment and try again.')
      return
    }
    generationInFlight.current = true
    setError(null)
    setLoading(true)
    setResult(null)
    setShowCode(false)
    try {
      const body = { ideaId: String(ideaIndex), prompt, title }
      const payload = await fetchWithAuth('/api/simulator-generation/generate-from-prompt', {
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
      await fetchWithAuth(`/api/teacher/simulators/${(result as any).id}`, {
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
      await fetchWithAuth(`/api/teacher/simulators/${(result as any).id}/publish`, { method: 'POST' })
      router.push('/teacher/simulators')
    } catch (ex: any) { alert('Publish failed: ' + (ex?.message ?? String(ex))) }
  }

  function handleClear() {
    setIdeaIndex(0)
    setPrompt('')
    setTitle('')
    setResult(null)
    setError(null)
    setShowCode(false)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-500">Simulator studio</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Create a Mathematics simulator</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Describe an interactive learning experience and generate a classroom-ready preview.</p>
        </div>
        <button type="button" onClick={handleClear} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-pink-400 hover:text-pink-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Clear form</button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Start from an idea
            <select value={ideaIndex} onChange={(e) => setIdeaIndex(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              {IDEAS.map((t, i) => <option key={i} value={i}>{i + 1}. {t}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Title <span className="font-normal text-slate-400">(optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Exploring equivalent fractions" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Teacher instructions
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Describe the topic, visuals, controls, calculations, and how students should interact with it..." className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleGenerate} disabled={loading || authLoading || !firebaseUser || prompt.trim().length === 0} className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Generating...' : 'Generate simulator'}</button>
          <span className="text-xs text-slate-500 dark:text-slate-400">{prompt.trim().length > 0 ? `${prompt.trim().length} characters` : 'Add instructions to begin'}</span>
        </div>
      </section>

      {result && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Generated preview</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Review your simulator</h2></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowCode((value) => !value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-pink-400 hover:text-pink-600 dark:border-slate-700 dark:text-slate-200">{showCode ? 'Hide code' : 'View code'}</button>
              <button type="button" onClick={handleGenerate} disabled={loading || authLoading || !firebaseUser} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-pink-400 hover:text-pink-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Regenerate</button>
              <button type="button" onClick={handleSaveDraft} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-pink-400 hover:text-pink-600 dark:border-slate-700 dark:text-slate-200">Save draft</button>
              <button type="button" onClick={handlePublish} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Publish</button>
            </div>
          </div>
          <div className="mt-5"><GeneratedSimulatorPreview title={(result as any).title ?? (title || 'AI-generated simulator')} files={(result as any).generatedFiles ?? null} dependencies={(result as any).dependencies ?? null} error={error} showCode={showCode} onRegenerate={handleGenerate} /></div>
        </section>
      )}

      {loading && <div className="rounded-xl border border-pink-200 bg-pink-50 p-4 text-sm text-pink-800 dark:border-pink-900/50 dark:bg-pink-950/30 dark:text-pink-200">Generating your interactive simulator. This may take a moment...</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
    </div>
  )
}

