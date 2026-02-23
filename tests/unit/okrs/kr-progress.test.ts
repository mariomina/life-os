import { describe, it, expect } from 'vitest'

// ─── Lógica pura de cálculo de progreso por tipo de KR ───────────────────────
// Replicamos exactamente la lógica de calculateKRProgress en lib/db/queries/okrs.ts
// como funciones puras para testear sin conexión a DB.

type KRType = 'time_based' | 'outcome_based' | 'milestone'

function calcTimeBased(totalSeconds: number, targetHours: number): number {
  if (targetHours <= 0) return 0
  const horasReales = totalSeconds / 3600
  return Math.min(100, Math.round((horasReales / targetHours) * 100))
}

function calcOutcomeBased(completedCount: number, targetValue: number): number {
  if (targetValue <= 0) return 0
  return Math.min(100, Math.round((completedCount / targetValue) * 100))
}

function calcMilestone(completedCount: number): number {
  return completedCount > 0 ? 100 : 0
}

function calculateKRProgress(
  krType: KRType,
  targetValue: number | null,
  totalSeconds: number,
  completedCount: number
): number {
  if (krType === 'time_based') {
    if (!targetValue || targetValue <= 0) return 0
    return calcTimeBased(totalSeconds, targetValue)
  }
  if (krType === 'outcome_based') {
    if (!targetValue || targetValue <= 0) return 0
    return calcOutcomeBased(completedCount, targetValue)
  }
  if (krType === 'milestone') {
    return calcMilestone(completedCount)
  }
  return 0
}

function calcAnnualOKRProgress(krProgressValues: number[]): number {
  if (krProgressValues.length === 0) return 0
  const total = krProgressValues.reduce((acc, p) => acc + p, 0)
  return Math.round(total / krProgressValues.length)
}

// ─── Tests: time_based ───────────────────────────────────────────────────────

describe('calculateKRProgress — time_based', () => {
  it('returns 40 when 20 hours registered out of 50 target', () => {
    // AC1: target=50h, real=20h → 40%
    const totalSeconds = 20 * 3600
    expect(calculateKRProgress('time_based', 50, totalSeconds, 0)).toBe(40)
  })

  it('returns 100 (cap) when real hours exceed target', () => {
    const totalSeconds = 60 * 3600 // 60h registradas, target 50h → sin cap = 120%
    expect(calculateKRProgress('time_based', 50, totalSeconds, 0)).toBe(100)
  })

  it('returns 0 when no time entries exist', () => {
    expect(calculateKRProgress('time_based', 50, 0, 0)).toBe(0)
  })

  it('returns 0 when targetValue is null', () => {
    expect(calculateKRProgress('time_based', null, 72000, 0)).toBe(0)
  })

  it('returns 0 when targetValue is 0', () => {
    expect(calculateKRProgress('time_based', 0, 72000, 0)).toBe(0)
  })

  it('rounds correctly — 1h of 3h target → 33%', () => {
    const totalSeconds = 1 * 3600
    expect(calculateKRProgress('time_based', 3, totalSeconds, 0)).toBe(33)
  })

  it('handles partial hours — 90 min of 4h target → 38%', () => {
    const totalSeconds = 90 * 60 // 5400 seconds
    expect(calculateKRProgress('time_based', 4, totalSeconds, 0)).toBe(38)
  })
})

// ─── Tests: outcome_based ────────────────────────────────────────────────────

describe('calculateKRProgress — outcome_based', () => {
  it('returns 30 when 3 of 10 activities completed', () => {
    // AC2: target=10, completadas=3 → 30%
    expect(calculateKRProgress('outcome_based', 10, 0, 3)).toBe(30)
  })

  it('returns 100 when completedCount equals targetValue', () => {
    expect(calculateKRProgress('outcome_based', 10, 0, 10)).toBe(100)
  })

  it('returns 100 (cap) when completedCount exceeds targetValue', () => {
    expect(calculateKRProgress('outcome_based', 5, 0, 8)).toBe(100)
  })

  it('returns 0 when no activities completed', () => {
    expect(calculateKRProgress('outcome_based', 10, 0, 0)).toBe(0)
  })

  it('returns 0 when targetValue is null', () => {
    expect(calculateKRProgress('outcome_based', null, 0, 5)).toBe(0)
  })

  it('returns 0 when targetValue is 0', () => {
    expect(calculateKRProgress('outcome_based', 0, 0, 5)).toBe(0)
  })

  it('rounds correctly — 1 of 3 → 33%', () => {
    expect(calculateKRProgress('outcome_based', 3, 0, 1)).toBe(33)
  })
})

// ─── Tests: milestone ────────────────────────────────────────────────────────

describe('calculateKRProgress — milestone', () => {
  it('returns 0 when no completed activities (not confirmed)', () => {
    // AC3a: sin confirmación → 0%
    expect(calculateKRProgress('milestone', null, 0, 0)).toBe(0)
  })

  it('returns 100 when at least 1 activity is completed (confirmed)', () => {
    // AC3b: con ≥1 activity completada → 100%
    expect(calculateKRProgress('milestone', null, 0, 1)).toBe(100)
  })

  it('returns 100 regardless of how many completed activities exist', () => {
    expect(calculateKRProgress('milestone', null, 0, 5)).toBe(100)
  })

  it('ignores targetValue — milestone is binary', () => {
    // targetValue no aplica para milestone
    expect(calculateKRProgress('milestone', 50, 0, 0)).toBe(0)
    expect(calculateKRProgress('milestone', 50, 0, 1)).toBe(100)
  })

  it('ignores totalSeconds — milestone is not time-based', () => {
    expect(calculateKRProgress('milestone', null, 9999999, 0)).toBe(0)
  })
})

// ─── Tests: annual OKR progress (average of KRs) ─────────────────────────────

describe('calcAnnualOKRProgress — average of KR progress values', () => {
  it('returns 0 when no active KRs', () => {
    // AC4: sin KRs activos → 0%
    expect(calcAnnualOKRProgress([])).toBe(0)
  })

  it('returns the single KR progress when only one KR', () => {
    expect(calcAnnualOKRProgress([60])).toBe(60)
  })

  it('returns average of multiple KRs', () => {
    // 3 KRs: 40%, 60%, 80% → avg = 60%
    expect(calcAnnualOKRProgress([40, 60, 80])).toBe(60)
  })

  it('rounds the average correctly', () => {
    // 30 + 40 + 50 = 120 / 3 = 40 (exact)
    expect(calcAnnualOKRProgress([30, 40, 50])).toBe(40)
  })

  it('rounds non-exact average', () => {
    // 33 + 67 = 100 / 2 = 50
    expect(calcAnnualOKRProgress([33, 67])).toBe(50)
  })

  it('handles KRs at 0% and 100%', () => {
    // 0 + 100 + 100 = 200 / 3 = 67 (rounded)
    expect(calcAnnualOKRProgress([0, 100, 100])).toBe(67)
  })
})

// ─── Tests: cap 100% (AC5) ───────────────────────────────────────────────────

describe('Progress cap at 100%', () => {
  it('time_based: never exceeds 100% regardless of registered hours', () => {
    const totalSeconds = 1000 * 3600 // 1000 horas
    expect(calculateKRProgress('time_based', 10, totalSeconds, 0)).toBe(100)
  })

  it('outcome_based: never exceeds 100% regardless of completed count', () => {
    expect(calculateKRProgress('outcome_based', 1, 0, 999)).toBe(100)
  })

  it('milestone: caps naturally at 100 (binary)', () => {
    expect(calculateKRProgress('milestone', null, 0, 100)).toBe(100)
  })
})
