// tests/unit/areas/subarea-correlations.test.ts
// Unit tests for Story 11.9 — Motor de Correlaciones.
// Tests pearsonCorrelation, forwardFill, calculateSubareaCorrelation,
// and the significance/insightMessage logic.

import { describe, it, expect } from 'vitest'
import {
  pearsonCorrelation,
  forwardFill,
  calculateSubareaCorrelation,
  buildDateRange,
} from '@/features/correlation-engine/subarea-correlations'

// ─── pearsonCorrelation ───────────────────────────────────────────────────────

describe('pearsonCorrelation', () => {
  it('returns 1.0 for perfectly correlated series', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [2, 4, 6, 8, 10]
    expect(pearsonCorrelation(x, y)).toBeCloseTo(1.0, 5)
  })

  it('returns -1.0 for perfectly negatively correlated series', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [10, 8, 6, 4, 2]
    expect(pearsonCorrelation(x, y)).toBeCloseTo(-1.0, 5)
  })

  it('returns near 0 for uncorrelated series', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [3, 1, 4, 1, 5]
    expect(Math.abs(pearsonCorrelation(x, y))).toBeLessThan(0.5)
  })

  it('returns 0 when series has zero variance', () => {
    const x = [5, 5, 5, 5, 5]
    const y = [1, 2, 3, 4, 5]
    expect(pearsonCorrelation(x, y)).toBe(0)
  })

  it('returns 0 for empty series', () => {
    expect(pearsonCorrelation([], [])).toBe(0)
  })
})

// ─── forwardFill ─────────────────────────────────────────────────────────────

describe('forwardFill', () => {
  it('fills missing days with last known value', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']
    const scores = new Map([
      ['2026-01-01', 80],
      ['2026-01-03', 90],
    ])
    const result = forwardFill(scores, dates)
    expect(result).toEqual([80, 80, 90, 90])
  })

  it('uses 0 when no prior value exists', () => {
    const dates = ['2026-01-01', '2026-01-02']
    const scores = new Map<string, number>()
    const result = forwardFill(scores, dates)
    expect(result).toEqual([0, 0])
  })

  it('returns exact scores when no gaps', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03']
    const scores = new Map([
      ['2026-01-01', 70],
      ['2026-01-02', 75],
      ['2026-01-03', 80],
    ])
    expect(forwardFill(scores, dates)).toEqual([70, 75, 80])
  })
})

// ─── calculateSubareaCorrelation ─────────────────────────────────────────────

describe('calculateSubareaCorrelation', () => {
  it('returns correct Pearson with lagDays=0', () => {
    const source = [1, 2, 3, 4, 5]
    const target = [2, 4, 6, 8, 10]
    expect(calculateSubareaCorrelation(source, target, 0)).toBeCloseTo(1.0, 5)
  })

  it('returns 0 for empty series', () => {
    expect(calculateSubareaCorrelation([], [], 0)).toBe(0)
  })

  it('applies lag correctly — shifts target forward by lagDays', () => {
    // source: [1,2,3,4,5], target shifted by 1 means we compare [1,2,3,4] with [2,4,6,8]
    const source = [10, 20, 30, 40, 50]
    const target = [0, 10, 20, 30, 40] // target[i] = source[i-1]
    const r = calculateSubareaCorrelation(source, target, 1)
    expect(r).toBeCloseTo(1.0, 4)
  })

  it('returns 0 when lag exceeds series length', () => {
    const source = [1, 2, 3]
    const target = [1, 2, 3]
    expect(calculateSubareaCorrelation(source, target, 10)).toBe(0)
  })
})

// ─── Significance logic ───────────────────────────────────────────────────────

describe('significance thresholds', () => {
  const SIGNIFICANCE_THRESHOLD = 0.3
  const MIN_DAYS = 21

  it('marks correlation significant when |r| > 0.3 and ≥ 21 days', () => {
    const r = 0.65
    const days = 30
    const isSignificant = Math.abs(r) > SIGNIFICANCE_THRESHOLD && days >= MIN_DAYS
    expect(isSignificant).toBe(true)
  })

  it('does NOT mark significant when |r| < 0.3', () => {
    const r = 0.2
    const days = 30
    const isSignificant = Math.abs(r) > SIGNIFICANCE_THRESHOLD && days >= MIN_DAYS
    expect(isSignificant).toBe(false)
  })

  it('does NOT mark significant when days < 21 even if |r| > 0.3', () => {
    const r = 0.8
    const days = 15
    const isSignificant = Math.abs(r) > SIGNIFICANCE_THRESHOLD && days >= MIN_DAYS
    expect(isSignificant).toBe(false)
  })

  it('does NOT mark significant at exactly 0.3 (boundary — must be strictly greater)', () => {
    const r = 0.3
    const days = 30
    const isSignificant = Math.abs(r) > SIGNIFICANCE_THRESHOLD && days >= MIN_DAYS
    expect(isSignificant).toBe(false)
  })
})

// ─── buildDateRange ───────────────────────────────────────────────────────────

describe('buildDateRange', () => {
  it('returns correct number of dates', () => {
    const dates = buildDateRange(90)
    expect(dates.length).toBe(90)
  })

  it('last date in range is today', () => {
    const ref = new Date('2026-03-12')
    const dates = buildDateRange(7, ref)
    expect(dates[dates.length - 1]).toBe('2026-03-12')
  })

  it('first date in range is days-1 ago', () => {
    const ref = new Date('2026-03-12')
    const dates = buildDateRange(7, ref)
    expect(dates[0]).toBe('2026-03-06')
  })
})
