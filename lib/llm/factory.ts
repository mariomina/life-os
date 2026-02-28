// lib/llm/factory.ts
// Factory for ILLMProvider — selects provider via NEXT_PUBLIC_LLM_PROVIDER (Story 8.6).

import type { ILLMProvider } from './interface'
import { ClaudeProvider } from './claude'
import { MockProvider } from './mock'

export function getLLMProvider(): ILLMProvider {
  const provider = process.env.NEXT_PUBLIC_LLM_PROVIDER ?? 'mock'
  if (provider === 'claude') return new ClaudeProvider()
  return new MockProvider()
}
