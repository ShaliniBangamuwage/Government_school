import { SimulatorGenerationService } from './simulator-generation.service';

describe('SimulatorGenerationService quality gates', () => {
  const makeService = (aiImpl: any, validatorImpl?: any, requirementsImpl?: any, reviewImpl?: any) => {
    const firebaseAdmin = { getFirestore: jest.fn().mockReturnValue({ collection: jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue({ id: 'sim-123', set: jest.fn().mockResolvedValue(undefined) }) }) }) } as any;
    return new SimulatorGenerationService(
      firebaseAdmin,
      aiImpl,
      validatorImpl ?? {
        validate: jest.fn((payload) => payload),
        scanGeneratedFiles: jest.fn(),
        sanitizeDependencies: jest.fn((deps) => ({ react: 'latest', 'react-dom': 'latest', ...(deps ?? {}) })),
      },
      requirementsImpl ?? { extractRequirements: jest.fn().mockResolvedValue({ title: 'Graph and Intersection Lab', requiredVisuals: ['Cartesian plane with axes'], requiredControls: ['m1, c1, m2, c2'], requiredCalculations: ['line intersection calculation'], requiredInteractions: ['moving controls updates graph'], requiredSpecialCases: ['parallel lines message', 'same line message'], requiredButtons: ['New Challenge', 'Check Answer', 'Show Hint', 'Reset Graph'], themeRequirements: ['blue and pink lines'] }) },
      reviewImpl ?? { review: jest.fn().mockResolvedValue({ approved: true, missingRequirements: [], reason: 'All requirements met.' }) },
    );
  };

  it('accepts the single structured AI response without a second review call', async () => {
    const service = makeService(
      {
        generate: jest.fn().mockResolvedValue({
          title: 'Generic slider demo',
          description: 'Simple value slider',
          learningObjectives: ['Adjust a value'],
          files: {
            '/App.tsx': 'export default function App(){ return <div><input type="range" /></div>; }',
            '/styles.css': 'body{font-family:sans-serif} div{display:block}',
          },
          dependencies: { react: 'latest', 'react-dom': 'latest' },
          teacherInstructions: 'Use sliders',
        }),
      },
      undefined,
      undefined,
      { review: jest.fn().mockResolvedValue({ approved: false, missingRequirements: ['Cartesian plane', 'intersection highlight'], reason: 'Generic slider does not satisfy the graph task.' }) },
    );

    await expect(service.generateFromPrompt('teacher-1', {
      prompt: 'Create a graph and intersection simulator with a cartesian plane, two lines, controls for m1, c1, m2, c2, and a highlighted intersection point.',
      title: 'Graph and Intersections',
    })).resolves.toBeDefined();
    expect((service as any).ai.generate).toHaveBeenCalledTimes(1);
  });

  it('passes only when all graph requirements are present', async () => {
    const validApp = `
      export default function App() {
        const [m1, setM1] = useState(1);
        const [c1, setC1] = useState(1);
        const [m2, setM2] = useState(-1);
        const [c2, setC2] = useState(2);
        return (
          <svg>
            <line stroke="blue" />
            <line stroke="red" />
            <circle />
            <button>New Challenge</button>
            <button>Check Answer</button>
            <button>Show Hint</button>
            <button>Reset Graph</button>
          </svg>
        );
      }
    `;

    const service = makeService({
      generate: jest.fn().mockResolvedValue({
        title: 'Graph and Intersection Lab',
        description: 'Graph and intersection exploration',
        learningObjectives: ['Explore a graph'],
        files: {
          '/App.tsx': validApp,
          '/styles.css': 'svg { width: 100%; height: 240px; } body { margin: 0; }',
        },
        dependencies: { react: 'latest', 'react-dom': 'latest' },
        teacherInstructions: 'Use a Cartesian plane and highlight the intersection.',
      }),
    });

    await expect(service.generateFromPrompt('teacher-1', {
      prompt: 'Create a graph and intersection simulator with a cartesian plane, two lines with m1 c1 m2 c2, a highlighted intersection and parallel/same-line messages.',
      title: 'Graph and Intersection',
    })).resolves.toBeDefined();
  });

  it('uses one repair call when local generated-file validation fails', async () => {
    const ai = {
      generate: jest.fn()
        .mockResolvedValueOnce({
          title: 'Graph Without Axes',
          description: 'Missing my visual requirements',
          learningObjectives: ['understand graph'],
          files: {
            '/App.tsx': 'export default function App(){ return <div>Missing styles</div>; }',
          },
          dependencies: { react: 'latest', 'react-dom': 'latest' },
          teacherInstructions: 'Missing required visuals.',
        })
        .mockResolvedValueOnce({
          title: 'Graph and Intersection Lab',
          description: 'Graph and intersection exploration',
          learningObjectives: ['Explore graph'],
          files: {
            '/App.tsx': 'export default function App(){ return <svg><line stroke="blue" /><line stroke="red" /><circle /></svg>; }',
            '/styles.css': 'svg{width:100%;height:240px}',
          },
          dependencies: { react: 'latest', 'react-dom': 'latest' },
          teacherInstructions: 'Correct requirements.',
        }),
    };

    const service = makeService(ai);

    await expect(service.generateFromPrompt('teacher-1', {
      prompt: 'Create a graph and intersection simulator with a cartesian plane, two lines, m1 c1 m2 c2, and an intersection highlight.',
      title: 'Graph and Intersection',
    })).resolves.toBeDefined();
    expect(ai.generate).toHaveBeenCalledTimes(2);
  });

  it('returns an exact missing-files reason after the single repair fails', async () => {
    const rawPrompt = 'Create a Grade 9 graph and intersection simulator with two lines y=m1x+c1 and y=m2x+c2, sliders for m1, c1, m2, c2, a Cartesian graph, real-time intersection point, and parallel/same-line handling.';
    const service = makeService({
      generate: jest.fn().mockResolvedValue({
        title: 'Graph and Intersection Lab',
        description: 'A graph simulator',
        learningObjectives: ['Explore graph'],
        files: {
          '/App.tsx': `export default function App() { return <div>current value is 0.50</div>; }`,
        },
        dependencies: { react: 'latest', 'react-dom': 'latest' },
        teacherInstructions: 'This is a generic single value slider.',
      }),
    });

    await expect(service.generateFromPrompt('teacher-1', { prompt: rawPrompt, title: 'Graph and Intersection' })).rejects.toThrow('missing App.tsx/styles.css');
  });

  it('does not render the raw teacher prompt in the simulator preview', async () => {
    const rawPrompt = 'Create a graph and intersection simulator with a cartesian plane and intersection calculations.';
    const service = makeService({
      generate: jest.fn().mockResolvedValue({
        title: 'Graph and Intersection Lab',
        description: 'A graph simulator',
        learningObjectives: ['Explore graph'],
        files: {
          '/App.tsx': 'export default function App(){ return <svg><line stroke="blue" /><line stroke="red" /><circle /></svg>; }',
          '/styles.css': 'svg{width:100%;height:240px}',
        },
        dependencies: { react: 'latest', 'react-dom': 'latest' },
        teacherInstructions: 'Use the prompt beautifully.',
      }),
    });

    const result = await service.generateFromPrompt('teacher-1', { prompt: rawPrompt, title: 'Graph and Intersection' });
    expect(result.simulator.generatedFiles['/App.tsx']).not.toContain(rawPrompt);
    expect(result.simulator.generatedFiles['/App.tsx']).not.toContain('Create a graph and intersection simulator');
  });
});
