export interface QuizAiProvider {
  generate(prompt: string, model: string, context: string[], maxOutputTokens?: number): Promise<Record<string, unknown>>;
}
