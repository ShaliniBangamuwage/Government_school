import React from 'react'
import { useStore } from '../store'

export default function Controls() {
  const numerator = useStore((s) => s.numerator)
  const denominator = useStore((s) => s.denominator)
  const setNumerator = useStore((s) => s.setNumerator)
  const setDenominator = useStore((s) => s.setDenominator)

  return (
    <div className="controls">
      <h4>Controls</h4>
      <label>
        Numerator: {numerator}
        <input
          type="range"
          min="0"
          max={Math.max(1, denominator)}
          value={numerator}
          onChange={(e) => setNumerator(Number(e.target.value))}
        />
      </label>
      <label>
        Denominator: {denominator}
        <input
          type="range"
          min="1"
          max="12"
          value={denominator}
          onChange={(e) => setDenominator(Number(e.target.value))}
        />
      </label>
      <div className="buttons">
        <button onClick={() => { setDenominator(4); setNumerator(1); }}>Set quarters</button>
        <button onClick={() => { setDenominator(3); setNumerator(1); }}>Set thirds</button>
        <button onClick={() => { setDenominator(2); setNumerator(1); }}>Set halves</button>
      </div>
    </div>
  )
}
