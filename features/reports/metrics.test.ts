// features/reports/metrics.test.ts
// Story 8.2 — Tests para funciones puras de métricas.

import { describe, it, expect } from 'vitest'
import { computeHabitConsistency, computeCCR, computeAreaHealthTrend } from './metrics'

// ─── computeHabitConsistency ──────────────────────────────────────────────────

describe('computeHabitConsistency', () => {
  it('returns empty array for empty input', () => {
    expect(computeHabitConsistency([])).toEqual([])
  })

  it('rate = completed/planned for normal habit', () => {
    const result = computeHabitConsistency([
      { habitId: 'h1', habitName: 'Ejercicio', planned: 7, completed: 5 },
    ])
    expect(result[0].rate).toBeCloseTo(5 / 7)
  })

  it('rate = 0 when planned = 0', () => {
    const result = computeHabitConsistency([
      { habitId: 'h1', habitName: 'Test', planned: 0, completed: 0 },
    ])
    expect(result[0].rate).toBe(0)
  })

  it('rate = 1.0 when fully completed', () => {
    const result = computeHabitConsistency([
      { habitId: 'h1', habitName: 'Test', planned: 5, completed: 5 },
    ])
    expect(result[0].rate).toBe(1)
  })

  it('preserves original fields', () => {
    const input = [{ habitId: 'h1', habitName: 'Meditación', planned: 10, completed: 8 }]
    const result = computeHabitConsistency(input)
    expect(result[0].habitId).toBe('h1')
    expect(result[0].habitName).toBe('Meditación')
    expect(result[0].planned).toBe(10)
    expect(result[0].completed).toBe(8)
  })

  it('processes multiple habits independently', () => {
    const result = computeHabitConsistency([
      { habitId: 'h1', habitName: 'A', planned: 4, completed: 4 },
      { habitId: 'h2', habitName: 'B', planned: 4, completed: 2 },
    ])
    expect(result[0].rate).toBe(1)
    expect(result[1].rate).toBe(0.5)
  })
})

// ─── computeCCR ───────────────────────────────────────────────────────────────

describe('computeCCR', () => {
  it('returns correct rate when planned > 0', () => {
    const result = computeCCR(10, 8)
    expect(result.rate).toBeCloseTo(0.8)
    expect(result.planned).toBe(10)
    expect(result.completed).toBe(8)
  })

  it('returns null rate when planned = 0', () => {
    const result = computeCCR(0, 0)
    expect(result.rate).toBeNull()
  })

  it('returns rate = 1 when all activities completed', () => {
    expect(computeCCR(5, 5).rate).toBe(1)
  })

  it('returns rate = 0 when nothing completed', () => {
    expect(computeCCR(5, 0).rate).toBe(0)
  })
})

// ─── computeAreaHealthTrend ───────────────────────────────────────────────────

describe('computeAreaHealthTrend', () => {
  it('returns improving when delta > 5', () => {
    expect(computeAreaHealthTrend(80, 70)).toBe('improving')
  })

  it('returns declining when delta < -5', () => {
    expect(computeAreaHealthTrend(60, 70)).toBe('declining')
  })

  it('returns stable when delta = 0', () => {
    expect(computeAreaHealthTrend(70, 70)).toBe('stable')
  })

  it('returns stable when delta exactly 5 (not > 5)', () => {
    expect(computeAreaHealthTrend(75, 70)).toBe('stable')
  })

  it('returns stable when delta exactly -5 (not < -5)', () => {
    expect(computeAreaHealthTrend(65, 70)).toBe('stable')
  })

  it('returns improving when delta = 6', () => {
    expect(computeAreaHealthTrend(76, 70)).toBe('improving')
  })

  it('returns declining when delta = -6', () => {
    expect(computeAreaHealthTrend(64, 70)).toBe('declining')
  })
})
