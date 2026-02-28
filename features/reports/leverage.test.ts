// features/reports/leverage.test.ts
// Story 8.7 — Tests para computeLeverageMetrics y computeROIByExecutorType.

import { describe, it, expect } from 'vitest'
import { computeLeverageMetrics, computeROIByExecutorType } from './leverage'

describe('computeLeverageMetrics', () => {
  it('returns all zeros for empty activities', () => {
    const result = computeLeverageMetrics([])
    expect(result.totalActivities).toBe(0)
    expect(result.aiPercentage).toBe(0)
    expect(result.aiAccuracyRate).toBe(0)
    expect(result.estimatedHumanHoursSaved).toBe(0)
  })

  it('returns 0 aiPercentage when only human activities', () => {
    const activities = [
      { executorType: 'human' as const, status: 'completed', scheduledDurationMinutes: 30 },
      { executorType: 'human' as const, status: 'pending', scheduledDurationMinutes: 60 },
    ]
    const result = computeLeverageMetrics(activities)
    expect(result.aiPercentage).toBe(0)
    expect(result.humanActivities).toBe(2)
    expect(result.aiActivities).toBe(0)
  })

  it('returns 100 aiPercentage when only ai activities', () => {
    const activities = [
      { executorType: 'ai' as const, status: 'completed', scheduledDurationMinutes: 30 },
      { executorType: 'ai' as const, status: 'completed', scheduledDurationMinutes: 60 },
    ]
    const result = computeLeverageMetrics(activities)
    expect(result.aiPercentage).toBe(100)
    expect(result.aiActivities).toBe(2)
  })

  it('computes exact mix of executor types', () => {
    const activities = [
      { executorType: 'ai' as const, status: 'completed', scheduledDurationMinutes: 30 },
      { executorType: 'human' as const, status: 'completed', scheduledDurationMinutes: 60 },
      { executorType: 'mixed' as const, status: 'pending', scheduledDurationMinutes: 15 },
      { executorType: 'ai' as const, status: 'pending', scheduledDurationMinutes: 45 },
    ]
    const result = computeLeverageMetrics(activities)
    expect(result.totalActivities).toBe(4)
    expect(result.aiActivities).toBe(2)
    expect(result.humanActivities).toBe(1)
    expect(result.mixedActivities).toBe(1)
    expect(result.aiPercentage).toBe(50)
  })

  it('computes aiAccuracyRate correctly', () => {
    const activities = [
      { executorType: 'ai' as const, status: 'completed', scheduledDurationMinutes: 30 },
      { executorType: 'ai' as const, status: 'completed', scheduledDurationMinutes: 30 },
      { executorType: 'ai' as const, status: 'pending', scheduledDurationMinutes: 30 },
    ]
    const result = computeLeverageMetrics(activities)
    expect(result.aiAccuracyRate).toBeCloseTo(2 / 3)
    expect(result.aiCompletedSuccessfully).toBe(2)
  })

  it('sets aiAccuracyRate to 0 when no ai activities', () => {
    const activities = [
      { executorType: 'human' as const, status: 'completed', scheduledDurationMinutes: 60 },
    ]
    const result = computeLeverageMetrics(activities)
    expect(result.aiAccuracyRate).toBe(0)
  })

  it('computes estimatedHumanHoursSaved only for ai completed', () => {
    const activities = [
      { executorType: 'ai' as const, status: 'completed', scheduledDurationMinutes: 60 },
      { executorType: 'ai' as const, status: 'pending', scheduledDurationMinutes: 120 },
      { executorType: 'human' as const, status: 'completed', scheduledDurationMinutes: 60 },
    ]
    const result = computeLeverageMetrics(activities)
    expect(result.estimatedHumanHoursSaved).toBe(1) // only 60 min / 60 = 1h
  })

  it('handles null scheduledDurationMinutes as 0', () => {
    const activities = [
      { executorType: 'ai' as const, status: 'completed', scheduledDurationMinutes: null },
      { executorType: 'ai' as const, status: 'completed', scheduledDurationMinutes: null },
    ]
    const result = computeLeverageMetrics(activities)
    expect(result.estimatedHumanHoursSaved).toBe(0)
  })
})

describe('computeROIByExecutorType', () => {
  it('returns empty array for empty activities', () => {
    expect(computeROIByExecutorType([])).toEqual([])
  })

  it('groups activities by executor type', () => {
    const activities = [
      { executorType: 'ai' as const, scheduledDurationMinutes: 30 },
      { executorType: 'ai' as const, scheduledDurationMinutes: 60 },
      { executorType: 'human' as const, scheduledDurationMinutes: 45 },
    ]
    const result = computeROIByExecutorType(activities)
    const ai = result.find((r) => r.executorType === 'ai')
    const human = result.find((r) => r.executorType === 'human')
    expect(ai?.count).toBe(2)
    expect(ai?.totalMinutes).toBe(90)
    expect(ai?.avgMinutes).toBe(45)
    expect(human?.count).toBe(1)
    expect(human?.totalMinutes).toBe(45)
  })

  it('sorts results by count descending', () => {
    const activities = [
      { executorType: 'human' as const, scheduledDurationMinutes: 30 },
      { executorType: 'ai' as const, scheduledDurationMinutes: 30 },
      { executorType: 'ai' as const, scheduledDurationMinutes: 30 },
      { executorType: 'ai' as const, scheduledDurationMinutes: 30 },
    ]
    const result = computeROIByExecutorType(activities)
    expect(result[0].executorType).toBe('ai')
    expect(result[0].count).toBe(3)
  })

  it('treats null scheduledDurationMinutes as 0 in totals', () => {
    const activities = [
      { executorType: 'ai' as const, scheduledDurationMinutes: null },
      { executorType: 'ai' as const, scheduledDurationMinutes: 60 },
    ]
    const result = computeROIByExecutorType(activities)
    const ai = result.find((r) => r.executorType === 'ai')
    expect(ai?.totalMinutes).toBe(60)
    expect(ai?.avgMinutes).toBe(30)
  })
})
