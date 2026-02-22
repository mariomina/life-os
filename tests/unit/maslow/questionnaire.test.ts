import { describe, it, expect } from 'vitest'
import { calculateAreaScoreFromResponses, QUESTIONNAIRE } from '@/features/maslow/questionnaire'

describe('calculateAreaScoreFromResponses', () => {
  it('returns 0 when all responses are 1 (minimum)', () => {
    expect(calculateAreaScoreFromResponses([1, 1, 1, 1, 1])).toBe(0)
  })

  it('returns 100 when all responses are 5 (maximum)', () => {
    expect(calculateAreaScoreFromResponses([5, 5, 5, 5, 5])).toBe(100)
  })

  it('returns 50 when all responses are 3 (middle)', () => {
    expect(calculateAreaScoreFromResponses([3, 3, 3, 3, 3])).toBe(50)
  })

  it('returns 25 when all responses are 2', () => {
    // (10-5)/20 × 100 = 25
    expect(calculateAreaScoreFromResponses([2, 2, 2, 2, 2])).toBe(25)
  })

  it('returns 75 when all responses are 4', () => {
    // (20-5)/20 × 100 = 75
    expect(calculateAreaScoreFromResponses([4, 4, 4, 4, 4])).toBe(75)
  })

  it('calculates correctly for mixed responses', () => {
    // [1,2,3,4,5] sum=15 → (15-5)/20 × 100 = 50
    expect(calculateAreaScoreFromResponses([1, 2, 3, 4, 5])).toBe(50)
  })

  it('calculates correctly for asymmetric responses', () => {
    // [5,5,5,5,1] sum=21 → (21-5)/20 × 100 = 80
    expect(calculateAreaScoreFromResponses([5, 5, 5, 5, 1])).toBe(80)
  })
})

describe('QUESTIONNAIRE structure', () => {
  it('contains exactly 8 areas', () => {
    expect(QUESTIONNAIRE).toHaveLength(8)
  })

  it('covers Maslow levels 1 through 8 in order', () => {
    const levels = QUESTIONNAIRE.map((a) => a.level)
    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('has exactly 5 questions per area', () => {
    for (const area of QUESTIONNAIRE) {
      expect(area.questions).toHaveLength(5)
    }
  })

  it('classifies levels 1-4 as d_needs and 5-8 as b_needs', () => {
    for (const area of QUESTIONNAIRE) {
      if (area.level <= 4) {
        expect(area.group).toBe('d_needs')
      } else {
        expect(area.group).toBe('b_needs')
      }
    }
  })

  it('has correct weight multipliers per level', () => {
    const weights: Record<number, string> = {
      1: '2.0',
      2: '2.0',
      3: '1.5',
      4: '1.5',
      5: '1.2',
      6: '1.2',
      7: '1.0',
      8: '1.0',
    }
    for (const area of QUESTIONNAIRE) {
      expect(area.weightMultiplier).toBe(weights[area.level])
    }
  })
})
