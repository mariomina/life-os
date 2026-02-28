// features/correlations/patterns.test.ts
// Story 8.4 — Tests para funciones de detección de patrones avanzados.

import { describe, it, expect } from 'vitest'
import { detectDestructiveLoops, detectLeveragePoints, detectBottlenecks } from './patterns'
import type { CorrelationInput } from './patterns'

function makeCorrelation(overrides: Partial<CorrelationInput> = {}): CorrelationInput {
  return {
    entityAId: 'entity-a',
    entityBId: 'entity-b',
    entityAType: 'area',
    entityBType: 'habit',
    type: 'neutral',
    tier: 'full',
    correlationValue: '0.0000',
    ...overrides,
  }
}

// ─── detectDestructiveLoops ───────────────────────────────────────────────────

describe('detectDestructiveLoops', () => {
  it('detects strong negative correlation (≤ -0.4, tier=full)', () => {
    const corrs = [makeCorrelation({ type: 'negative', correlationValue: '-0.5000' })]
    expect(detectDestructiveLoops(corrs)).toHaveLength(1)
  })

  it('ignores positive correlations', () => {
    const corrs = [makeCorrelation({ type: 'positive', correlationValue: '0.8000' })]
    expect(detectDestructiveLoops(corrs)).toHaveLength(0)
  })

  it('ignores negative but weak correlations (> -0.4)', () => {
    const corrs = [makeCorrelation({ type: 'negative', correlationValue: '-0.3000' })]
    expect(detectDestructiveLoops(corrs)).toHaveLength(0)
  })

  it('ignores tier != full', () => {
    const corrs = [
      makeCorrelation({ type: 'negative', correlationValue: '-0.6000', tier: 'provisional' }),
    ]
    expect(detectDestructiveLoops(corrs)).toHaveLength(0)
  })

  it('ignores null correlationValue', () => {
    const corrs = [makeCorrelation({ type: 'negative', correlationValue: null })]
    expect(detectDestructiveLoops(corrs)).toHaveLength(0)
  })

  it('detects exactly at -0.4 threshold', () => {
    const corrs = [makeCorrelation({ type: 'negative', correlationValue: '-0.4000' })]
    expect(detectDestructiveLoops(corrs)).toHaveLength(1)
  })
})

// ─── detectLeveragePoints ─────────────────────────────────────────────────────

describe('detectLeveragePoints', () => {
  it('detects entity with 2+ strong positive impacts', () => {
    const corrs = [
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-1',
        type: 'positive',
        correlationValue: '0.7000',
      }),
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-2',
        type: 'positive',
        correlationValue: '0.8000',
      }),
    ]
    expect(detectLeveragePoints(corrs)).toHaveLength(2)
  })

  it('ignores entity with only 1 strong positive impact', () => {
    const corrs = [
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-1',
        type: 'positive',
        correlationValue: '0.7000',
      }),
    ]
    expect(detectLeveragePoints(corrs)).toHaveLength(0)
  })

  it('ignores weak positives (< 0.6)', () => {
    const corrs = [
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-1',
        type: 'positive',
        correlationValue: '0.5000',
      }),
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-2',
        type: 'positive',
        correlationValue: '0.4000',
      }),
    ]
    expect(detectLeveragePoints(corrs)).toHaveLength(0)
  })

  it('ignores tier != full', () => {
    const corrs = [
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-1',
        type: 'positive',
        correlationValue: '0.7000',
        tier: 'gathering',
      }),
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-2',
        type: 'positive',
        correlationValue: '0.8000',
        tier: 'gathering',
      }),
    ]
    expect(detectLeveragePoints(corrs)).toHaveLength(0)
  })
})

// ─── detectBottlenecks ────────────────────────────────────────────────────────

describe('detectBottlenecks', () => {
  it('detects entity with 2+ negative impacts', () => {
    const corrs = [
      makeCorrelation({
        entityAId: 'bad-habit',
        entityBId: 'area-1',
        type: 'negative',
        correlationValue: '-0.5000',
      }),
      makeCorrelation({
        entityAId: 'bad-habit',
        entityBId: 'area-2',
        type: 'negative',
        correlationValue: '-0.4000',
      }),
    ]
    expect(detectBottlenecks(corrs)).toHaveLength(2)
  })

  it('ignores entity with only 1 negative impact', () => {
    const corrs = [
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-1',
        type: 'negative',
        correlationValue: '-0.5000',
      }),
    ]
    expect(detectBottlenecks(corrs)).toHaveLength(0)
  })

  it('ignores positive correlations', () => {
    const corrs = [
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-1',
        type: 'positive',
        correlationValue: '0.7000',
      }),
      makeCorrelation({
        entityAId: 'habit-1',
        entityBId: 'area-2',
        type: 'positive',
        correlationValue: '0.8000',
      }),
    ]
    expect(detectBottlenecks(corrs)).toHaveLength(0)
  })

  it('returns empty for empty input', () => {
    expect(detectBottlenecks([])).toHaveLength(0)
  })
})
