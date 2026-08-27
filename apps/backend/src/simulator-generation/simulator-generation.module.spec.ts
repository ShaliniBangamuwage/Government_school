import { selectSimulatorAiProvider } from './simulator-generation.module';
import { GroqSimulatorProviderService } from './providers/groq-simulator-provider.service';
import { GeminiSimulatorProviderService } from './providers/gemini-simulator-provider.service';

describe('SimulatorGenerationModule', () => {
  it('selects the Groq simulator provider for the Groq configuration', () => {
    process.env.AI_PROVIDER = 'groq';

    const provider = selectSimulatorAiProvider('groq', new GroqSimulatorProviderService(), new GeminiSimulatorProviderService());

    expect(provider).toBeInstanceOf(GroqSimulatorProviderService);
  });
});
