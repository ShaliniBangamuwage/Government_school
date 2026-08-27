import React from 'react'
import Scene from './components/Scene'
import Controls from './components/Controls'
import EquationPanel from './components/EquationPanel'

export default function App() {
  return (
    <div className="app">
      <div className="left">
        <Scene />
      </div>
      <div className="right">
        <Controls />
        <EquationPanel />
      </div>
    </div>
  )
}
