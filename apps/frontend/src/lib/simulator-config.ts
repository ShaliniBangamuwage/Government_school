export type SimulatorAction = 'Check Answer' | 'Reset' | 'Show Hint' | 'New Challenge';

export type SimulatorConfig = {
  type: 'fractions' | 'geometry' | 'graph' | 'generic';
  title?: string;
  description?: string;
  prompt?: string;
  actions?: SimulatorAction[];
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
  };
  variables?: Array<{
    name: string;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    default?: number;
    unit?: string;
  }>;
  challenge?: {
    prompt: string;
    answer: number | string;
    options?: Array<number | string>;
    hint?: string;
    numerator?: number;
    denominator?: number;
  };
  radius?: number;
  height?: number;
  m1?: number;
  c1?: number;
  m2?: number;
  c2?: number;
  [key: string]: unknown;
};

export function buildSimulatorConfig(input: {
  prompt?: string;
  title?: string;
  config?: Record<string, any> | null;
}): SimulatorConfig {
  const normalizedPrompt = (input.prompt ?? '').trim();
  const existing = input.config && typeof input.config === 'object' ? input.config : null;

  if (existing && typeof existing.type === 'string' && existing.type) {
    return {
      ...existing,
      title: input.title ?? existing.title ?? existing.type,
      prompt: normalizedPrompt || existing.prompt || '',
      actions: Array.isArray(existing.actions) && existing.actions.length > 0 ? existing.actions : ['Check Answer', 'Reset', 'Show Hint', 'New Challenge'],
      theme: existing.theme ?? {
        primaryColor: '#2563eb',
        secondaryColor: '#8b5cf6',
        backgroundColor: '#f8fbff',
      },
    } as SimulatorConfig;
  }

  const title = input.title?.trim() || 'New Simulator';

  return {
    type: 'generic',
    title,
    description: normalizedPrompt || 'Interactive classroom simulator',
    prompt: normalizedPrompt,
    actions: ['Check Answer', 'Reset', 'Show Hint', 'New Challenge'],
    theme: {
      primaryColor: '#2563eb',
      secondaryColor: '#8b5cf6',
      backgroundColor: '#f8fbff',
    },
    variables: [
      { name: 'valueA', label: 'Value A', min: 0, max: 10, step: 0.5, default: 3 },
      { name: 'valueB', label: 'Value B', min: 0, max: 10, step: 0.5, default: 6 },
    ],
    challenge: {
      prompt: normalizedPrompt || 'Adjust the parameters and solve the challenge.',
      answer: 'Use the controls to reason through the task.',
      hint: 'This simulator is generated from the teacher prompt and is designed to adapt to the learning task.',
    },
  } satisfies SimulatorConfig;
}
