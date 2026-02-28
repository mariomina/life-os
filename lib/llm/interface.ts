// lib/llm/interface.ts
// ILLMProvider — Abstraction layer for LLM inference (Story 8.6).

export interface ILLMProvider {
  generateInsight(prompt: string): Promise<string>
  readonly providerName: string
}
