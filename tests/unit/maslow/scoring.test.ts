import { describe, it, expect } from 'vitest'
import { calculateAreaScore, calculateGlobalScore } from '@/features/maslow/scoring'
import type { MaslowLevel } from '@/lib/utils/maslow-weights'

// Helpers para construir areaScores completo
const allZeros = (): Record<MaslowLevel, number> => ({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
})
const allHundred = (): Record<MaslowLevel, number> => ({
  1: 100,
  2: 100,
  3: 100,
  4: 100,
  5: 100,
  6: 100,
  7: 100,
  8: 100,
})
const dNeedsOnly = (): Record<MaslowLevel, number> => ({
  1: 100,
  2: 100,
  3: 100,
  4: 100,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
})

describe('calculateGlobalScore', () => {
  it('returns 0 when all area scores are 0', () => {
    expect(calculateGlobalScore(allZeros())).toBe(0)
  })

  it('returns 100 when all area scores are 100', () => {
    // (100×2+100×2+100×1.5+100×1.5+100×1.2+100×1.2+100×1+100×1) / 11.4
    // = (200+200+150+150+120+120+100+100) / 11.4 = 1140/11.4 = 100
    expect(calculateGlobalScore(allHundred())).toBeCloseTo(100, 5)
  })

  it('returns ≈61.4 when only D-Needs (levels 1-4) are at 100% and B-Needs at 0%', () => {
    // (100×2+100×2+100×1.5+100×1.5) / 11.4 = 700/11.4 ≈ 61.403
    expect(calculateGlobalScore(dNeedsOnly())).toBeCloseTo(61.4, 1)
  })

  it('level 1-2 (weight 2.0) has more impact than level 7-8 (weight 1.0)', () => {
    const onlyLevel1: Record<MaslowLevel, number> = { ...allZeros(), 1: 100 }
    const onlyLevel7: Record<MaslowLevel, number> = { ...allZeros(), 7: 100 }
    expect(calculateGlobalScore(onlyLevel1)).toBeGreaterThan(calculateGlobalScore(onlyLevel7))
  })

  it('reduces global score proportionally when one area is at 50%', () => {
    const full = calculateGlobalScore(allHundred())
    const half1 = calculateGlobalScore({ ...allHundred(), 1: 50 })
    // Reducción esperada: 50 × 2.0 / 11.4 ≈ 8.77 puntos menos
    expect(full - half1).toBeCloseTo((50 * 2.0) / 11.4, 5)
  })

  it('a critical area (level 1) at 0 has more impact on global than a growth area (level 8) at 0', () => {
    const missingLevel1: Record<MaslowLevel, number> = { ...allHundred(), 1: 0 }
    const missingLevel8: Record<MaslowLevel, number> = { ...allHundred(), 8: 0 }
    expect(calculateGlobalScore(missingLevel1)).toBeLessThan(calculateGlobalScore(missingLevel8))
  })
})

describe('calculateAreaScore', () => {
  it('applies the correct multiplier for each Maslow level', () => {
    expect(calculateAreaScore(100, 1)).toBeCloseTo(200) // 2.0×
    expect(calculateAreaScore(100, 2)).toBeCloseTo(200) // 2.0×
    expect(calculateAreaScore(100, 3)).toBeCloseTo(150) // 1.5×
    expect(calculateAreaScore(100, 4)).toBeCloseTo(150) // 1.5×
    expect(calculateAreaScore(100, 5)).toBeCloseTo(120) // 1.2×
    expect(calculateAreaScore(100, 6)).toBeCloseTo(120) // 1.2×
    expect(calculateAreaScore(100, 7)).toBeCloseTo(100) // 1.0×
    expect(calculateAreaScore(100, 8)).toBeCloseTo(100) // 1.0×
  })

  it('clamps negative scores to 0', () => {
    expect(calculateAreaScore(-10, 1)).toBe(0)
  })

  it('clamps scores above 100 to 100 before applying multiplier', () => {
    expect(calculateAreaScore(150, 1)).toBeCloseTo(200) // clamped to 100 × 2.0
  })
})
