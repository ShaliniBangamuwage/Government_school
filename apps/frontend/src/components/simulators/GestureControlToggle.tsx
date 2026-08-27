"use client"
import React from 'react'
import type { GestureCallbacks } from '../../types/gestures'

type Props = {
  isEnabled: boolean
  isCameraActive: boolean
  isLocked: boolean
  detectedGesture: string
  enableGestureControls: () => Promise<void>
  disableGestureControls: () => void
}

export default function GestureControlToggle({ isEnabled, isCameraActive, isLocked, detectedGesture, enableGestureControls, disableGestureControls }: Props) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
      <label style={{ display:'flex', gap:8, alignItems:'center' }}>
        <input type="checkbox" checked={isEnabled} onChange={(e) => { if (e.target.checked) enableGestureControls(); else disableGestureControls() }} />
        Enable Gesture Controls
      </label>
      <div style={{ fontSize:12, color:'#666' }}>{isCameraActive ? 'Camera active' : 'Camera off'}</div>
      <div style={{ fontSize:12, color:isLocked ? '#b45309' : '#065f46' }}>{isLocked ? 'Locked' : 'Unlocked'}</div>
      <div style={{ fontSize:12, color:'#374151' }}>{detectedGesture}</div>
    </div>
  )
}
