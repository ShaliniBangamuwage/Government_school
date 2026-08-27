import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useStore } from '../store'

export default function EquationPanel() {
  const numerator = useStore((s) => s.numerator)
  const denominator = useStore((s) => s.denominator)

  const fraction = `${numerator}/${denominator}`
  const decimal = (denominator === 0 ? 0 : (numerator / denominator).toFixed(3))

  const latex = `\\frac{${numerator}}{${denominator}} = ${decimal}`

  return (
    <div className="equation">
      <h4>Equation</h4>
      <div dangerouslySetInnerHTML={{ __html: katex.renderToString(latex, { throwOnError: false }) }} />
      <p>Equivalent fractions:</p>
      <ul>
        {equivalents(numerator, denominator).map((f, i) => (
          <li key={i}>{f[0]}/{f[1]}</li>
        ))}
      </ul>
    </div>
  )
}

function equivalents(n, d) {
  const list = []
  for (let k = 2; k <= 6; k++) {
    list.push([n * k, d * k])
  }
  return list
}
