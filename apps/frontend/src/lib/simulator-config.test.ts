import { describe, expect, it } from 'vitest';
import { buildSimulatorConfig } from './simulator-config';

describe('buildSimulatorConfig', () => {
  it('builds a generic schema-first config when the AI result is not keyword-based', () => {
    const config = buildSimulatorConfig({
      prompt:
        'Create a playful math challenge with a blue theme where students adjust values and submit an answer.',
      title: 'Custom Challenge',
    });

    expect(config.type).toBe('generic');
    expect(config.title).toBe('Custom Challenge');
    expect(config.actions).toEqual(
      expect.arrayContaining(['Check Answer', 'Reset', 'Show Hint', 'New Challenge']),
    );
    expect(config.prompt).toContain('blue theme');
  });

  it('preserves an existing valid simulator config from the AI schema', () => {
    const config = buildSimulatorConfig({
      prompt: 'Geometry cylinder challenge',
      title: 'Cylinder',
      config: { type: 'geometry', radius: 2, height: 4 },
    });

    expect(config.type).toBe('geometry');
    expect(config.radius).toBe(2);
    expect(config.height).toBe(4);
  });
});
