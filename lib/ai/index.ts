import type { ILLMProvider } from '@/lib/ai/types'

/**
 * Returns the configured AI provider instance.
 * Currently only Claude is supported. More providers can be added via AI_PROVIDER env var.
 */
export async function getAIProvider(): Promise<ILLMProvider> {
  const provider = process.env.AI_PROVIDER ?? 'claude'

  if (provider === 'claude') {
    const { ClaudeProvider } = await import('@/lib/ai/providers/claude')
    return new ClaudeProvider()
  }

  throw new Error(`Proveedor de IA no soportado: ${provider}`)
}

export type { ILLMProvider, MaslowScores } from '@/lib/ai/types'
