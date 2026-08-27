import React from 'react'
import { useStore } from '../store'

function Pie({ numerator, denominator }) {
  const slices = []
  const pct = Math.max(1, denominator)
  for (let i = 0; i < pct; i++) {
    const filled = i < numerator
    slices.push(
      <path
        key={i}
        d={describeSlice(i, pct)}
        fill={filled ? '#4f46e5' : '#e6e6e6'}
        stroke="#ffffff"
      />
    )
  }
  return (
    <svg viewBox="-1 -1 2 2" className="pie" xmlns="http://www.w3.org/2000/svg">
      {slices}
    </svg>
  )
}

function describeSlice(i, total) {
  const a0 = (i / total) * Math.PI * 2
  const a1 = ((i + 1) / total) * Math.PI * 2
  const x0 = Math.cos(a0)
  const y0 = Math.sin(a0)
  const x1 = Math.cos(a1)
  const y1 = Math.sin(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M 0 0 L ${x0} ${y0} A 1 1 0 ${large} 1 ${x1} ${y1} Z`
}

export default function Scene() {
  const numerator = useStore((s) => s.numerator)
  const denominator = useStore((s) => s.denominator)

  return (
    <div className="scene">
      <h3>Fractions Visualization</h3>
      <div className="vis">
        <Pie numerator={numerator} denominator={denominator} />
        <div className="bar">
          <div className="bar-filled" style={{ width: `${(numerator / Math.max(1, denominator)) * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
