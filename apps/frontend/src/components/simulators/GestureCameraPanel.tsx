"use client"
import React from 'react'
import type { GestureState } from '../../types/gestures'

type Props = {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  state: Pick<GestureState, 'isCameraActive' | 'isLocked' | 'detectedGesture'>
  onStop?: () => void
}

export default function GestureCameraPanel({ videoRef, canvasRef, state, onStop }: Props) {
  return (
    <div style={{ width: 240, border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Gesture Camera</strong>
        <div style={{ fontSize: 12, color: '#666' }}>{state.isCameraActive ? 'Camera active' : 'Camera off'}</div>
      </div>
      <div style={{ position: 'relative', width: '100%', paddingTop: '56%', marginTop: 8 }}>
        <video ref={videoRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 13 }}>Status:</div>
        <div style={{ padding: '4px 8px', background: '#f3f4f6', borderRadius: 6 }}>{state.detectedGesture}</div>
        <div style={{ padding: '4px 8px', background: state.isLocked ? '#fde68a' : '#e6ffed', borderRadius: 6 }}>{state.isLocked ? 'Locked' : 'Unlocked'}</div>
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onStop} style={{ padding: '6px 10px' }}>Stop Camera</button>
      </div>
    </div>
  )
}
