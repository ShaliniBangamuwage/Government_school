"use client";

import React, { useMemo, useState } from 'react';

const FALLBACK_CHALLENGES = [
  { prompt: 'Which fraction is larger: 1/2 or 3/4?', answer: '3/4', options: ['1/2', '2/4', '3/4', '1/3'], hint: '3/4 is greater than 1/2 because 0.75 > 0.5.', numerator: 3, denominator: 4 },
  { prompt: 'Which fraction is equivalent to 1/2?', answer: '2/4', options: ['1/4', '2/4', '3/4', '1/3'], hint: 'Double both the numerator and denominator to find an equivalent fraction.', numerator: 2, denominator: 4 },
  { prompt: 'Which fraction is smaller: 2/3 or 1/3?', answer: '1/3', options: ['2/3', '1/3', '3/3', '2/4'], hint: 'The denominators are the same, so compare the numerators.', numerator: 1, denominator: 3 },
  { prompt: 'Which fraction is equal to 3/6?', answer: '1/2', options: ['1/3', '2/4', '1/2', '3/4'], hint: 'Simplify 3/6 by dividing both parts by 3.', numerator: 1, denominator: 2 },
];

export function FractionsSimulator({ config }: { config?: Record<string, any> }) {
  const challengeFromConfig = config?.challenge ?? FALLBACK_CHALLENGES[0];
  const [activeChallenge, setActiveChallenge] = useState<Record<string, any>>(challengeFromConfig);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isHintVisible, setHintVisible] = useState(false);

  const visualBlocks = useMemo(() => {
    const denominator = Number(activeChallenge?.denominator ?? 4);
    const numerator = Number(activeChallenge?.numerator ?? Math.min(3, denominator));
    return Array.from({ length: denominator }, (_, index) => index < numerator);
  }, [activeChallenge]);

  const reset = () => {
    setInput('');
    setFeedback('');
    setHintVisible(false);
  };

  const newChallenge = () => {
    const next = FALLBACK_CHALLENGES[Math.floor(Math.random() * FALLBACK_CHALLENGES.length)];
    setActiveChallenge(next);
    reset();
  };

  const checkAnswer = () => {
    if (!activeChallenge?.answer) {
      setFeedback('There is no answer to check yet.');
      return;
    }
    const normalizedInput = String(input).trim().toLowerCase();
    const normalizedAnswer = String(activeChallenge.answer).trim().toLowerCase();
    if (normalizedInput === normalizedAnswer) {
      setFeedback('Correct! Great job comparing fractions.');
    } else {
      setFeedback(`Not quite. Try again or view the hint.`);
    }
  };

  return (
    <div style={{ border: '1px solid #dbeafe', borderRadius: 12, padding: 16, background: '#f8fbff' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Fractions Explorer</div>
      <div style={{ marginBottom: 12, fontSize: 15 }}>{activeChallenge?.prompt ?? 'Compare the fractions.'}</div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {visualBlocks.map((filled, index) => (
          <div
            key={index}
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: '1px solid #93c5fd',
              background: filled ? '#60a5fa' : '#e0f2fe',
            }}
            title={filled ? 'Filled part' : 'Empty part'}
          />
        ))}
      </div>

      {activeChallenge?.options?.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {activeChallenge.options.map((option: number | string) => {
            const optionText = String(option);
            return (
              <button
                key={optionText}
                type="button"
                onClick={() => setInput(optionText)}
                style={{
                  border: input === optionText ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                  background: '#fff',
                  borderRadius: 8,
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                {optionText}
              </button>
            );
          })}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type your answer"
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 180 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" onClick={checkAnswer} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #1d4ed8', background: '#dbeafe', cursor: 'pointer' }}>Check Answer</button>
        <button type="button" onClick={reset} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Reset</button>
        <button type="button" onClick={() => setHintVisible((value) => !value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Show Hint</button>
        <button type="button" onClick={newChallenge} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #16a34a', background: '#dcfce7', cursor: 'pointer' }}>New Challenge</button>
      </div>

      {isHintVisible && activeChallenge?.hint ? (
        <div style={{ marginBottom: 12, color: '#1f2937', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 10 }}>
          Hint: {activeChallenge.hint}
        </div>
      ) : null}

      {feedback ? (
        <div style={{ padding: '10px 12px', borderRadius: 8, background: feedback.toLowerCase().includes('correct') ? '#dcfce7' : '#fee2e2', color: '#111827' }}>
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
