export interface SimulatorAiProvider {
  generate(prompt: string, model: string, context: string[], maxOutputTokens?: number): Promise<Record<string, unknown>>;
}
