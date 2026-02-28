// features/reports/weekly.test.ts
// Story 8.8 — Tests para aggregateWeeklyMetrics.

import { describe, it, expect } from 'vitest'
import { aggregateWeeklyMetrics } from './weekly'

const baseCCR = { planned: 10, completed: 7, rate: 0.7 }
const baseHabits = [{ rate: 0.8 }, { rate: 0.6 }]
const baseOkrs = [{ avgProgress: 50 }, { avgProgress: 70 }]
const baseTimeByArea = [
  { areaName: 'Salud', totalSeconds: 7200 },
  { areaName: 'Trabajo', totalSeconds: 5400 },
  { areaName: 'Familia', totalSeconds: 3600 },
  { areaName: 'Ocio', totalSeconds: 1800 },
]
const baseTrends = [
  { areaName: 'Salud', trend: 'improving' as const },
  { areaName: 'Trabajo', trend: 'stable' as const },
]

describe('aggregateWeeklyMetrics', () => {
  it('returns correct ccrRate from input', () => {
    const result = aggregateWeeklyMetrics(baseCCR, baseHabits, baseOkrs, baseTimeByArea, baseTrends)
    expect(result.ccrRate).toBe(0.7)
  })

  it('returns null ccrRate when planned = 0', () => {
    const result = aggregateWeeklyMetrics(
      { planned: 0, completed: 0, rate: null },
      baseHabits,
      baseOkrs,
      baseTimeByArea,
      baseTrends
    )
    expect(result.ccrRate).toBeNull()
  })

  it('computes habitConsistencyAvg correctly', () => {
    const result = aggregateWeeklyMetrics(baseCCR, baseHabits, baseOkrs, baseTimeByArea, baseTrends)
    expect(result.habitConsistencyAvg).toBe(0.7) // (0.8 + 0.6) / 2
  })

  it('returns 0 for habitConsistencyAvg when habits is empty', () => {
    const result = aggregateWeeklyMetrics(baseCCR, [], baseOkrs, baseTimeByArea, baseTrends)
    expect(result.habitConsistencyAvg).toBe(0)
  })

  it('computes okrProgressAvg correctly', () => {
    const result = aggregateWeeklyMetrics(baseCCR, baseHabits, baseOkrs, baseTimeByArea, baseTrends)
    expect(result.okrProgressAvg).toBe(60) // (50 + 70) / 2
  })

  it('returns 0 for okrProgressAvg when okrs is empty', () => {
    const result = aggregateWeeklyMetrics(baseCCR, baseHabits, [], baseTimeByArea, baseTrends)
    expect(result.okrProgressAvg).toBe(0)
  })

  it('returns only top 3 areas from timeByArea', () => {
    const result = aggregateWeeklyMetrics(baseCCR, baseHabits, baseOkrs, baseTimeByArea, baseTrends)
    expect(result.timeByAreaTop3).toHaveLength(3)
    expect(result.timeByAreaTop3[0].areaName).toBe('Salud')
    expect(result.timeByAreaTop3[2].areaName).toBe('Familia')
  })

  it('returns all areas if fewer than 3', () => {
    const twoAreas = [
      { areaName: 'Salud', totalSeconds: 7200 },
      { areaName: 'Trabajo', totalSeconds: 5400 },
    ]
    const result = aggregateWeeklyMetrics(baseCCR, baseHabits, baseOkrs, twoAreas, baseTrends)
    expect(result.timeByAreaTop3).toHaveLength(2)
  })

  it('includes areaHealthTrends as-is', () => {
    const result = aggregateWeeklyMetrics(baseCCR, baseHabits, baseOkrs, baseTimeByArea, baseTrends)
    expect(result.areaHealthTrends).toEqual(baseTrends)
  })
})
