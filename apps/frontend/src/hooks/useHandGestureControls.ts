"use client"
import { useEffect, useRef, useState } from 'react'
import type { PointerPosition, GestureCallbacks, GestureName } from '../types/gestures'

/*
  README: To enable MediaPipe Tasks Vision Hand Landmarker install:
    npm install @mediapipe/tasks-vision @mediapipe/tasks-vision-core
  This hook dynamically imports MediaPipe to avoid SSR breakage and
  falls back gracefully when the package or camera is not available.
*/

type UseHandGestureResult = {
  // state
  isEnabled: boolean
  isCameraActive: boolean
  isLocked: boolean
  detectedGesture: GestureName
  pointerPosition: PointerPosition | null
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  // controls
  enableGestureControls: () => Promise<void>
  disableGestureControls: () => void
}

export default function useHandGestureControls(callbacks: GestureCallbacks = {}): UseHandGestureResult {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const landmarkerRef = useRef<any>(null)
  const lastGestureRef = useRef<string>('none')
  const gestureCountRef = useRef(0)
  const posRef = useRef<{ x: number; y: number } | null>(null)

  const [isEnabled, setIsEnabled] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [detectedGesture, setDetectedGesture] = useState<GestureName>('none')
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null)

  useEffect(() => {
    return () => {
      disable()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enable() {
    if (isEnabled) return
    setIsEnabled(true)

    // request camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setIsCameraActive(true)
    } catch (ex) {
      setIsCameraActive(false)
      console.warn('Camera not available', ex)
      setIsEnabled(false)
      return
    }

    // dynamic import of MediaPipe Tasks Vision
    try {
      // Use eval'd import so Next.js/webpack does not resolve this at build-time
      // (we only want to load MediaPipe in the browser when the student enables it)
      const mp = await eval('import("@mediapipe/tasks-vision")')
      const { HandLandmarker, FilesetResolver } = mp
      // load wasm or bundle; FilesetResolver expects a path. For simplicity rely on default CDN.
      const fileset = await FilesetResolver.createFromOptions({
        wasmUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision.wasm',
      })
      const lm = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/hand_landmarker.task' },
        runningMode: 'VIDEO',
        numHands: 1,
      })
      landmarkerRef.current = lm
      startProcessing()
    } catch (e) {
      console.warn('MediaPipe not available or failed to init', e)
      // fall back to simple loop that only mirrors video
      startProcessing(false)
    }
  }

  function disable() {
    setIsEnabled(false)
    setIsCameraActive(false)
    stopProcessing()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    const video = videoRef.current
    if (video) {
      video.pause()
      video.srcObject = null
    }
    if (landmarkerRef.current && typeof landmarkerRef.current.close === 'function') {
      try { landmarkerRef.current.close() } catch { }
      landmarkerRef.current = null
    }
  }

  function stopProcessing() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  function startProcessing(useMediaPipe = true) {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let prevCentroid: { x: number; y: number } | null = null

    async function frame() {
      try {
        if (!video || !canvas || !ctx) return
        const width = video.videoWidth
        const height = video.videoHeight
        if (!width || !height) return

        canvas.width = width
        canvas.height = height
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        // mirror
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.restore()

        let landmarks = null
        if (useMediaPipe && landmarkerRef.current) {
          const res = await landmarkerRef.current.detectForVideo(video, performance.now())
          if (res && res.handedness && res.landmarks && res.landmarks.length) {
            landmarks = res.landmarks[0]
          }
        }

        if (landmarks) {
          // draw simple points
          ctx.fillStyle = 'rgba(0,0,0,0.6)'
          for (const p of landmarks) {
            const x = (1 - p.x) * canvas.width
            const y = p.y * canvas.height
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, Math.PI * 2)
            ctx.fill()
          }

          // compute centroid
          const cx = landmarks.reduce((s: number, p: any) => s + p.x, 0) / landmarks.length
          const cy = landmarks.reduce((s: number, p: any) => s + p.y, 0) / landmarks.length
          const centroid = { x: cx, y: cy }

          // simple gestures
          const indexTip = landmarks[8]
          const thumbTip = landmarks[4]
          const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y)
          const fingersExtended = [8, 12, 16, 20].map((i) => {
            const tip = landmarks[i]
            const pip = landmarks[i - 2]
            return tip.y < pip.y
          }).filter(Boolean).length

          let gesture: GestureName = 'none'
          if (distance < 0.04) gesture = 'pinch'
          else if (fingersExtended >= 4) gesture = 'open_palm'
          else if (fingersExtended === 0) gesture = 'fist'
          else if (fingersExtended === 1) gesture = 'index'

          // swipe detection
          if (prevCentroid) {
            const dx = centroid.x - prevCentroid.x
            const dy = centroid.y - prevCentroid.y
            if (Math.abs(dx) > 0.15 && Math.abs(dx) > Math.abs(dy)) {
              if (dx > 0.15) gesture = 'swipe_left' // mirrored coordinate
              else if (dx < -0.15) gesture = 'swipe_right'
            }
          }

          prevCentroid = centroid

          // smoothing / require stable detection for 3 frames
          if (gesture === lastGestureRef.current) {
            gestureCountRef.current += 1
          } else {
            lastGestureRef.current = gesture
            gestureCountRef.current = 1
          }

          if (gestureCountRef.current >= 3) {
            // lock handling
            if (gesture === 'fist') {
              setIsLocked((v) => { const nv = !v; return nv })
            }

            // map to callbacks with debounce
            handleConfirmedGesture(gesture, centroid, ctx)
          }

          // pointer pos
          const pointer = { x: (1 - indexTip.x), y: indexTip.y }
          posRef.current = pointer
          setPointerPosition(pointer)
          setDetectedGesture(gesture)
        } else {
          // no landmarks
          setDetectedGesture('none')
          posRef.current = null
          setPointerPosition(null)
        }
      } catch (e) {
        console.error('frame error', e)
      }
      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
  }

  // minimal debounce map to avoid repeated triggers
  const lastTriggerRef = useRef<{ name: string; t: number } | null>(null)

  function handleConfirmedGesture(name: GestureName, centroid: any, ctx?: CanvasRenderingContext2D) {
    const now = Date.now()
    if (lastTriggerRef.current && lastTriggerRef.current.name === name && now - lastTriggerRef.current.t < 600) return
    lastTriggerRef.current = { name, t: now }

    if (name === 'index') {
      if (!isLocked) callbacks.onSelect?.({ x: centroid.x, y: centroid.y })
    } else if (name === 'pinch') {
      if (!isLocked) callbacks.onDrag?.({ dx: 0, dy: 0 }, { x: centroid.x, y: centroid.y })
    } else if (name === 'open_palm') {
      callbacks.onReset?.()
    } else if (name === 'swipe_left') {
      callbacks.onPreviousStep?.()
    } else if (name === 'swipe_right') {
      callbacks.onNextStep?.()
    } else if (name === 'fist') {
      // toggle lock handled above in state; emit no callback
    }
  }

  async function enableGestureControls() {
    await enable()
  }

  function disableGestureControls() {
    disable()
  }

  return {
    isEnabled,
    isCameraActive,
    isLocked,
    detectedGesture: detectedGesture as GestureName,
    pointerPosition,
    videoRef,
    canvasRef,
    enableGestureControls,
    disableGestureControls,
  }
}
