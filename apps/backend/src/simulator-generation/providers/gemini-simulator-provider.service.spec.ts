import { GoogleGenAI } from '@google/genai';
import { GeminiProviderError, GeminiSimulatorProviderService } from './gemini-simulator-provider.service';
import { selectSimulatorAiProvider } from '../simulator-generation.module';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

describe('GeminiSimulatorProviderService', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = originalModel;
  });

  it('parses strict JSON returned by Gemini', async () => {i
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-3.6-flash';
    const generateContent = jest.fn().mockResolvedValue({ text: JSON.stringify({ title: 'Fractions', files: { '/App.tsx': 'app', '/styles.css': 'css' } }) });
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({ models: { generateContent } }));

    const result = await new GeminiSimulatorProviderService().generate('Create a fractions simulator', 'ignored-model', []);

    expect(result.title).toBe('Fractions');
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-3.6-flash', config: expect.objectContaining({ responseMimeType: 'application/json' }) }));
  });

  it('parses fenced JSON returned by Gemini', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({ models: { generateContent: jest.fn().mockResolvedValue({ text: '```json\n{"title":"Geometry"}\n```' }) } }));

    await expect(new GeminiSimulatorProviderService().generate('Create a geometry simulator', 'gemini-3.6-flash', []))
      .resolves.toEqual({ title: 'Geometry' });
  });

  it('rejects invalid JSON from Gemini', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({ models: { generateContent: jest.fn().mockResolvedValue({ text: 'not-json' }) } }));

    await expect(new GeminiSimulatorProviderService().generate('Create a simulator', 'gemini-2.5-flash', []))
      .rejects.toThrow(GeminiProviderError);
    await expect(new GeminiSimulatorProviderService().generate('Create a simulator', 'gemini-2.5-flash', []))
      .rejects.toThrow('Invalid JSON from Gemini.');
  });

  it('reports an empty Gemini response as an incomplete JSON response', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({ models: { generateContent: jest.fn().mockResolvedValue({ text: '', candidates: [{ finishReason: 'MAX_TOKENS' }] }) } }));

    await expect(new GeminiSimulatorProviderService().generate('Create a simulator', 'gemini-3.6-flash', []))
      .rejects.toThrow('Invalid JSON from Gemini. Response was empty (MAX_TOKENS).');
  });

  it('does not misclassify a generic Gemini 400 as a model error', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const error = Object.assign(new Error('API key not valid. Please pass a valid API key.'), { status: 400, code: 'INVALID_ARGUMENT' });
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({ models: { generateContent: jest.fn().mockRejectedValue(error) } }));

    await expect(new GeminiSimulatorProviderService().generate('Create a simulator', 'gemini-2.5-flash', []))
      .rejects.toThrow('API key not valid. Please pass a valid API key.');
  });
});

describe('simulator provider selection', () => {
  it('selects Gemini without invoking Groq when configured', () => {
    const groq = { generate: jest.fn() };
    const gemini = { generate: jest.fn() };

    expect(selectSimulatorAiProvider('gemini', groq, gemini)).toBe(gemini);
    expect(groq.generate).not.toHaveBeenCalled();
  });
});
