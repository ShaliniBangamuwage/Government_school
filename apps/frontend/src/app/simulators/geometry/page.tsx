"use client"
import React, { useState } from 'react'

export default function GeometrySimulatorPage() {
  const [radius, setRadius] = useState(1)
  const [height, setHeight] = useState(2)

  const volume = Math.PI * radius * radius * height
  const surface = 2 * Math.PI * radius * radius + 2 * Math.PI * radius * height

  return (
    <div style={{ display: 'flex', gap: 24, padding: 24 }}>
      <div style={{ flex: 1 }}>
        <h2>Geometry Simulator — Cylinder (Mouse / Touch Controls)</h2>
        <div style={{ width: 480, height: 320, border: '1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width={300} height={240} viewBox="0 0 300 240">
            <ellipse cx={150} cy={40} rx={radius*30} ry={12} fill="#60a5fa" opacity={0.6} />
            <rect x={150-radius*30} y={40} width={radius*60} height={height*20} fill="#60a5fa" opacity={0.35} />
            <ellipse cx={150} cy={40+height*20} rx={radius*30} ry={12} fill="#60a5fa" opacity={0.9} />
          </svg>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Radius: {radius.toFixed(2)}</label>
          <input type="range" min="0.1" max="5" step="0.05" value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Height: {height.toFixed(2)}</label>
          <input type="range" min="0.1" max="10" step="0.1" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
        </div>
        <div style={{ marginTop: 12 }}>
          <div>Volume = π r² h = {volume.toFixed(3)}</div>
          <div>Surface Area = 2πr² + 2πrh = {surface.toFixed(3)}</div>
        </div>
      </div>
      <div style={{ width: 320 }}>
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div><strong>Controls:</strong></div>
          <ul>
            <li>Use the sliders to change radius and height (mouse or touch).</li>
            <li>Values update formulas live.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
