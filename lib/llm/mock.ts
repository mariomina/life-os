// lib/llm/mock.ts
// MockProvider — Static responses for development and tests (Story 8.6).

import type { ILLMProvider } from './interface'

export class MockProvider implements ILLMProvider {
  readonly providerName = 'mock'

  async generateInsight(_prompt: string): Promise<string> {
    return 'Análisis disponible. Mantuviste una consistencia sólida esta semana. Continúa con tus hábitos actuales para seguir progresando hacia tus objetivos.'
  }
}
