"use client";

import React, { useMemo, useState } from 'react';
import { FractionsSimulator } from './fractions-simulator';
import { GraphIntersectionSimulator } from './graph-intersection-simulator';

function GenericDynamicSimulator({ config, title }: { config: Record<string, any>; title?: string }) {
  const theme = config.theme ?? {
    primaryColor: '#2563eb',
    secondaryColor: '#8b5cf6',
    backgroundColor: '#f8fbff',
  };

  const variables = Array.isArray(config.variables) && config.variables.length > 0 ? config.variables : [
    { name: 'valueA', label: 'Value A', min: 0, max: 10, step: 0.5, default: 3 },
    { name: 'valueB', label: 'Value B', min: 0, max: 10, step: 0.5, default: 6 },
  ];

  const initialValues = useMemo(() => Object.fromEntries(variables.map((entry) => [entry.name, Number(entry.default ?? 0)])), [variables]);
  const [sliderValues, setSliderValues] = useState(initialValues);
  const [hintVisible, setHintVisible] = useState(false);
  const [feedback, setFeedback] = useState('');

  const updateValue = (name: string, value: number) => {
    setSliderValues((prev: Record<string, number>) => ({ ...prev, [name]: value }));
    setFeedback('');
  };

  const handleReset = () => {
    setSliderValues(initialValues);
    setFeedback('');
    setHintVisible(false);
  };

  const handleCheck = () => {
    setFeedback(config.challenge?.answer ? `Answer check: ${config.challenge.answer}` : 'Use the controls to complete this learning task.');
  };

  return (
    <div style={{ border: '1px solid #dbeafe', borderRadius: 12, padding: 16, background: theme.backgroundColor }}>
      <h3 style={{ marginTop: 0, color: theme.primaryColor }}>{title ?? config.title ?? 'Custom simulator'}</h3>
      <p style={{ marginTop: 0 }}>{config.description ?? config.prompt ?? 'Interactive classroom simulator'}</p>

      <div style={{ display: 'grid', gap: 12 }}>
        {variables.map((entry) => (
          <div key={entry.name} style={{ background: '#fff', borderRadius: 8, padding: 10, border: `1px solid ${theme.primaryColor}22` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <label>{entry.label}</label>
              <strong>{Number(sliderValues[entry.name] ?? entry.default ?? 0).toFixed(entry.step && entry.step < 1 ? 1 : 0)}{entry.unit ?? ''}</strong>
            </div>
            <input
              type="range"
              min={entry.min ?? 0}
              max={entry.max ?? 10}
              step={entry.step ?? 0.5}
              value={Number(sliderValues[entry.name] ?? entry.default ?? 0)}
              onChange={(event) => updateValue(entry.name, Number(event.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: '#fff', border: `1px solid ${theme.secondaryColor}66` }}>
        <strong>Challenge:</strong> {config.challenge?.prompt ?? config.prompt ?? 'Use the controls to explore the scenario.'}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={handleCheck}>Check Answer</button>
        <button type="button" onClick={() => setHintVisible((value) => !value)}>Show Hint</button>
        <button type="button" onClick={handleReset}>Reset</button>
      </div>

      {hintVisible && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d' }}>
          {config.challenge?.hint ?? 'Explore the values and compare the result.'}
        </div>
      )}

      {feedback && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#ecfeff', border: '1px solid #67e8f9' }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

export function SimulatorRenderer({ config, title }: { config?: Record<string, any>; title?: string }) {
  if (!config || typeof config !== 'object') {
    return <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 }}>No simulator content available.</div>;
  }

  if (config.type === 'fractions') {
    return <FractionsSimulator config={config} />;
  }

  if (config.type === 'graph') {
    return <GraphIntersectionSimulator config={config} title={title} />;
  }

  if (config.type === 'geometry') {
    return (
      <div style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 10 }}>
        <h4 style={{ marginTop: 0 }}>{title ?? config.title ?? 'Geometry simulator'}</h4>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div><strong>Radius:</strong> {Number(config.radius ?? 3).toFixed(1)}</div>
          <div><strong>Height:</strong> {Number(config.height ?? 5).toFixed(1)}</div>
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, background: '#f8fafc', padding: 8 }}>{JSON.stringify(config, null, 2)}</pre>
      </div>
    );
  }

  return <GenericDynamicSimulator config={config} title={title} />;
}
