import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MaslowScores } from '@/lib/ai/types'

const { mockAnalyzeText } = vi.hoisted(() => {
  const mockAnalyzeText = vi.fn()
  return { mockAnalyzeText }
})

// Mock the AI provider factory — no real API calls
vi.mock('@/lib/ai', () => ({
  getAIProvider: vi.fn(() => Promise.resolve({ analyzeText: mockAnalyzeText })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ getAll: vi.fn(() => []), set: vi.fn() })),
}))

import { analyzePsychometricText } from '@/actions/upload-analysis'

const VALID_SCORES: MaslowScores = {
  1: 75,
  2: 60,
  3: 80,
  4: 70,
  5: 85,
  6: 55,
  7: 65,
  8: 50,
}

const LONG_TEXT = 'a'.repeat(250)

describe('analyzePsychometricText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when text is too short', async () => {
    const result = await analyzePsychometricText('corto')
    expect(result.scores).toBeNull()
    expect(result.error).toMatch(/200/)
  })

  it('returns error when text is empty', async () => {
    const result = await analyzePsychometricText('')
    expect(result.scores).toBeNull()
    expect(result.error).not.toBeNull()
  })

  it('returns scores on success', async () => {
    mockAnalyzeText.mockResolvedValue(VALID_SCORES)
    const result = await analyzePsychometricText(LONG_TEXT)
    expect(result.error).toBeNull()
    expect(result.scores).toEqual(VALID_SCORES)
  })

  it('returns error when AI provider throws', async () => {
    mockAnalyzeText.mockRejectedValue(new Error('API rate limit exceeded'))
    const result = await analyzePsychometricText(LONG_TEXT)
    expect(result.scores).toBeNull()
    expect(result.error).toBe('API rate limit exceeded')
  })

  it('returns all 8 Maslow area scores on success', async () => {
    mockAnalyzeText.mockResolvedValue(VALID_SCORES)
    const result = await analyzePsychometricText(LONG_TEXT)
    expect(result.scores).not.toBeNull()
    const levels = [1, 2, 3, 4, 5, 6, 7, 8] as const
    for (const level of levels) {
      expect(result.scores![level]).toBeGreaterThanOrEqual(0)
      expect(result.scores![level]).toBeLessThanOrEqual(100)
    }
  })
})
