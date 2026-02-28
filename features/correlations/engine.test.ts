// features/correlations/engine.test.ts
// Story 8.3 — Tests para funciones puras del motor de correlaciones.

import { describe, it, expect } from 'vitest'
import {
  computePearson,
  computeSpearman,
  classifyCorrelation,
  buildCorrelationPairs,
} from './engine'

// ─── computePearson ───────────────────────────────────────────────────────────

describe('computePearson', () => {
  it('perfect positive correlation: [1,2,3] vs [1,2,3] → 1.0', () => {
    const r = computePearson([1, 2, 3], [1, 2, 3])
    expect(r).toBeCloseTo(1.0)
  })

  it('perfect negative correlation: [1,2,3] vs [3,2,1] → -1.0', () => {
    const r = computePearson([1, 2, 3], [3, 2, 1])
    expect(r).toBeCloseTo(-1.0)
  })

  it('returns null when arrays have different lengths', () => {
    expect(computePearson([1, 2], [1, 2, 3])).toBeNull()
  })

  it('returns null when fewer than 3 data points', () => {
    expect(computePearson([1, 2], [3, 4])).toBeNull()
  })

  it('returns null when variance is zero (constant array)', () => {
    expect(computePearson([5, 5, 5], [1, 2, 3])).toBeNull()
  })

  it('returns null when both arrays are constant', () => {
    expect(computePearson([3, 3, 3], [7, 7, 7])).toBeNull()
  })

  it('computes partial correlation for known values', () => {
    // [1,2,3,4,5] vs [2,4,5,4,5]: known r ≈ 0.8
    const r = computePearson([1, 2, 3, 4, 5], [2, 4, 5, 4, 5])
    expect(r).toBeGreaterThan(0.7)
    expect(r).toBeLessThan(1.0)
  })
})

// ─── computeSpearman ──────────────────────────────────────────────────────────

describe('computeSpearman', () => {
  it('monotonically increasing → rank correlation = 1.0', () => {
    const r = computeSpearman([1, 2, 3, 4, 5], [2, 5, 8, 11, 14])
    expect(r).toBeCloseTo(1.0)
  })

  it('monotonically decreasing → rank correlation = -1.0', () => {
    const r = computeSpearman([1, 2, 3, 4, 5], [14, 11, 8, 5, 2])
    expect(r).toBeCloseTo(-1.0)
  })

  it('returns null when fewer than 3 data points', () => {
    expect(computeSpearman([1, 2], [3, 4])).toBeNull()
  })

  it('returns null for mismatched lengths', () => {
    expect(computeSpearman([1, 2, 3], [1, 2])).toBeNull()
  })
})

// ─── classifyCorrelation ──────────────────────────────────────────────────────

describe('classifyCorrelation', () => {
  it('coef=0.5 + 14d → positive/full', () => {
    const result = classifyCorrelation(0.5, 14)
    expect(result.type).toBe('positive')
    expect(result.tier).toBe('full')
  })

  it('coef=-0.5 + 14d → negative/full', () => {
    const result = classifyCorrelation(-0.5, 14)
    expect(result.type).toBe('negative')
    expect(result.tier).toBe('full')
  })

  it('coef=0.1 + 14d → neutral/full (below threshold)', () => {
    const result = classifyCorrelation(0.1, 14)
    expect(result.type).toBe('neutral')
    expect(result.tier).toBe('full')
  })

  it('coef=0.5 + 3d → neutral/gathering (insufficient data)', () => {
    const result = classifyCorrelation(0.5, 3)
    expect(result.type).toBe('neutral')
    expect(result.tier).toBe('gathering')
  })

  it('coef=0.5 + 10d → neutral/provisional', () => {
    const result = classifyCorrelation(0.5, 10)
    expect(result.type).toBe('neutral')
    expect(result.tier).toBe('provisional')
  })

  it('null coef + 14d → neutral/full', () => {
    const result = classifyCorrelation(null, 14)
    expect(result.type).toBe('neutral')
    expect(result.tier).toBe('full')
  })

  it('threshold edge: coef=0.3 → positive', () => {
    expect(classifyCorrelation(0.3, 14).type).toBe('positive')
  })

  it('threshold edge: coef=-0.3 → negative', () => {
    expect(classifyCorrelation(-0.3, 14).type).toBe('negative')
  })
})

// ─── buildCorrelationPairs ────────────────────────────────────────────────────

describe('buildCorrelationPairs', () => {
  it('returns empty for 0 metrics', () => {
    expect(buildCorrelationPairs([])).toEqual([])
  })

  it('returns 0 pairs for 1 metric', () => {
    const m = [{ id: 'a', type: 'area' as const, label: 'A', series: [] }]
    expect(buildCorrelationPairs(m)).toHaveLength(0)
  })

  it('returns 1 pair for 2 metrics', () => {
    const m = [
      { id: 'a', type: 'area' as const, label: 'A', series: [] },
      { id: 'b', type: 'habit' as const, label: 'B', series: [] },
    ]
    expect(buildCorrelationPairs(m)).toHaveLength(1)
  })

  it('returns 3 pairs for 3 metrics (n*(n-1)/2)', () => {
    const m = [
      { id: 'a', type: 'area' as const, label: 'A', series: [] },
      { id: 'b', type: 'area' as const, label: 'B', series: [] },
      { id: 'c', type: 'habit' as const, label: 'C', series: [] },
    ]
    expect(buildCorrelationPairs(m)).toHaveLength(3)
  })

  it('no self-pairs (entityA.id !== entityB.id for all pairs)', () => {
    const m = [
      { id: 'a', type: 'area' as const, label: 'A', series: [] },
      { id: 'b', type: 'area' as const, label: 'B', series: [] },
      { id: 'c', type: 'area' as const, label: 'C', series: [] },
    ]
    const pairs = buildCorrelationPairs(m)
    pairs.forEach((p) => expect(p.entityA.id).not.toBe(p.entityB.id))
  })
})
