'use server'

import { getAIProvider } from '@/lib/ai'
import type { MaslowScores } from '@/lib/ai/types'

const MIN_TEXT_LENGTH = 200

/**
 * Analyzes psychometric text using AI and returns Maslow area scores (0-100).
 * Mocked in tests — no real API calls during CI.
 */
export async function analyzePsychometricText(
  text: string
): Promise<{ scores: MaslowScores | null; error: string | null }> {
  if (!text || text.trim().length < MIN_TEXT_LENGTH) {
    return {
      scores: null,
      error: `El texto debe tener al menos ${MIN_TEXT_LENGTH} caracteres para un análisis válido.`,
    }
  }

  try {
    const provider = await getAIProvider()
    const scores = await provider.analyzeText(text.trim())
    return { scores, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado al analizar el texto'
    return { scores: null, error: message }
  }
}
