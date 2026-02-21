import { describe, it, expect } from 'vitest'
import { MASLOW_WEIGHTS, MASLOW_TOTAL_WEIGHT, type MaslowLevel } from '@/lib/utils/maslow-weights'

describe('MASLOW_WEIGHTS', () => {
  it('contains all 8 Maslow levels as keys', () => {
    const levels: MaslowLevel[] = [1, 2, 3, 4, 5, 6, 7, 8]
    for (const level of levels) {
      expect(MASLOW_WEIGHTS).toHaveProperty(String(level))
    }
  })

  it('has the correct multiplier for each level', () => {
    expect(MASLOW_WEIGHTS[1]).toBe(2.0)
    expect(MASLOW_WEIGHTS[2]).toBe(2.0)
    expect(MASLOW_WEIGHTS[3]).toBe(1.5)
    expect(MASLOW_WEIGHTS[4]).toBe(1.5)
    expect(MASLOW_WEIGHTS[5]).toBe(1.2)
    expect(MASLOW_WEIGHTS[6]).toBe(1.2)
    expect(MASLOW_WEIGHTS[7]).toBe(1.0)
    expect(MASLOW_WEIGHTS[8]).toBe(1.0)
  })
})

describe('MASLOW_TOTAL_WEIGHT', () => {
  it('equals 11.4', () => {
    expect(MASLOW_TOTAL_WEIGHT).toBe(11.4)
  })

  it('equals the sum of all MASLOW_WEIGHTS values', () => {
    const sum = Object.values(MASLOW_WEIGHTS).reduce((acc, w) => acc + w, 0)
    expect(sum).toBeCloseTo(MASLOW_TOTAL_WEIGHT, 10)
  })
})
