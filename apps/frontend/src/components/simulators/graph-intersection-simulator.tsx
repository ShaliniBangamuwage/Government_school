"use client";

import React, { useMemo, useState } from 'react';

export function GraphIntersectionSimulator({ config, title }: { config?: Record<string, any>; title?: string }) {
  const [m1, setM1] = useState(Number(config?.m1 ?? 2));
  const [c1, setC1] = useState(Number(config?.c1 ?? 1));
  const [m2, setM2] = useState(Number(config?.m2 ?? -1));
  const [c2, setC2] = useState(Number(config?.c2 ?? 4));
  const [hintVisible, setHintVisible] = useState(false);
  const [feedback, setFeedback] = useState('');

  const intersection = useMemo(() => {
    if (Math.abs(m1 - m2) < 0.0001) {
      return null;
    }
    const x = (c2 - c1) / (m1 - m2);
    const y = m1 * x + c1;
    return { x, y };
  }, [m1, c1, m2, c2]);

  const equation1 = `y = ${m1}x + ${c1}`;
  const equation2 = `y = ${m2}x + ${c2}`;

  const reset = () => {
    setM1(Number(config?.m1 ?? 2));
    setC1(Number(config?.c1 ?? 1));
    setM2(Number(config?.m2 ?? -1));
    setC2(Number(config?.c2 ?? 4));
    setFeedback('');
    setHintVisible(false);
  };

  const checkAnswer = () => {
    if (!intersection) {
      setFeedback('No intersection — the lines are parallel.');
      return;
    }

    const targetX = 2;
    const targetY = 3;
    const closeEnough = Math.abs(intersection.x - targetX) < 0.5 && Math.abs(intersection.y - targetY) < 0.5;
    if (closeEnough) {
      setFeedback('Correct! The lines intersect at (2, 3).');
    } else {
      setFeedback(`The current intersection is (${intersection.x.toFixed(2)}, ${intersection.y.toFixed(2)}). Try again.`);
    }
  };

  return (
    <div style={{ border: '1px solid #dbeafe', borderRadius: 12, padding: 16, background: '#f8fbff' }}>
      <h3 style={{ marginTop: 0 }}>{title ?? 'Graph & Intersection Simulator'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
        <div style={{ border: '1px solid #cfe1ff', borderRadius: 12, padding: 12, background: '#fff' }}>
          <svg viewBox="0 0 360 360" width="100%" height="320">
            <rect x="0" y="0" width="360" height="360" fill="#f8fbff" />
            <g stroke="#cbd5e1" strokeWidth="1">
              {Array.from({ length: 15 }).map((_, i) => (
                <React.Fragment key={`v${i}`}>
                  <line x1={20 + i * 22} y1="20" x2={20 + i * 22} y2="340" />
                  <line x1="20" y1={20 + i * 22} x2="340" y2={20 + i * 22} />
                </React.Fragment>
              ))}
            </g>
            <line x1="20" y1="180" x2="340" y2="180" stroke="#475569" strokeWidth="2" />
            <line x1="180" y1="20" x2="180" y2="340" stroke="#475569" strokeWidth="2" />

            {(() => {
              const yForX = (m: number, c: number, x: number) => m * x + c;
              const points1 = Array.from({ length: 200 }, (_, i) => {
                const x = -8 + (i / 200) * 16;
                return `${(x + 8) * 20 + 20},${(yForX(m1, c1, x) * -20) + 180}`;
              }).join(' ');
              const points2 = Array.from({ length: 200 }, (_, i) => {
                const x = -8 + (i / 200) * 16;
                return `${(x + 8) * 20 + 20},${(yForX(m2, c2, x) * -20) + 180}`;
              }).join(' ');
              return (
                <>
                  <polyline points={points1} fill="none" stroke="#2563eb" strokeWidth="3" />
                  <polyline points={points2} fill="none" stroke="#ec4899" strokeWidth="3" />
                  {intersection ? (
                    <>
                      <circle cx={intersection.x * 20 + 180} cy={180 - intersection.y * 20} r="6" fill="#10b981" />
                    </>
                  ) : null}
                </>
              );
            })()}
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label>Line 1: y = m1x + c1</label>
            <div>m1: {m1.toFixed(1)}</div>
            <input type="range" min={-10} max={10} step={0.1} value={m1} onChange={(e) => setM1(Number(e.target.value))} />
            <div>c1: {c1.toFixed(1)}</div>
            <input type="range" min={-10} max={10} step={0.1} value={c1} onChange={(e) => setC1(Number(e.target.value))} />
          </div>

          <div>
            <label>Line 2: y = m2x + c2</label>
            <div>m2: {m2.toFixed(1)}</div>
            <input type="range" min={-10} max={10} step={0.1} value={m2} onChange={(e) => setM2(Number(e.target.value))} />
            <div>c2: {c2.toFixed(1)}</div>
            <input type="range" min={-10} max={10} step={0.1} value={c2} onChange={(e) => setC2(Number(e.target.value))} />
          </div>

          <div style={{ background: '#eff6ff', borderRadius: 8, padding: 10 }}>
            <div><strong>Equation 1:</strong> {equation1}</div>
            <div><strong>Equation 2:</strong> {equation2}</div>
            <div><strong>Intersection:</strong> {intersection ? `(${intersection.x.toFixed(2)}, ${intersection.y.toFixed(2)})` : 'No intersection — the lines are parallel.'}</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" onClick={checkAnswer}>Check Answer</button>
            <button type="button" onClick={() => setHintVisible((v) => !v)}>Show Hint</button>
            <button type="button" onClick={reset}>Reset Graph</button>
            <button type="button" onClick={() => setFeedback('Challenge: Create two parallel lines.')}>New Challenge</button>
          </div>

          {hintVisible ? (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 10 }}>
              Hint: The intersection point is where both equations have the same x and y values.
            </div>
          ) : null}

          {feedback ? (
            <div style={{ background: feedback.includes('Correct') ? '#dcfce7' : '#e0f2fe', borderRadius: 8, padding: 10 }}>
              {feedback}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
