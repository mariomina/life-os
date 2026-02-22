import { describe, it, expect } from 'vitest'
import { calculateTrend, scoreColorClass, scoreBgClass } from '@/lib/utils/trend'

describe('calculateTrend', () => {
  it('returns → when no scores provided', () => {
    expect(calculateTrend([])).toBe('→')
  })

  it('returns → when only one score provided', () => {
    expect(calculateTrend([75])).toBe('→')
  })

  it('returns ↑ when last score is higher than previous', () => {
    expect(calculateTrend([50, 75])).toBe('↑')
    expect(calculateTrend([40, 50, 60, 80])).toBe('↑')
  })

  it('returns ↓ when last score is lower than previous', () => {
    expect(calculateTrend([75, 50])).toBe('↓')
    expect(calculateTrend([80, 60, 50, 40])).toBe('↓')
  })

  it('returns → when last two scores are equal', () => {
    expect(calculateTrend([50, 60, 60])).toBe('→')
    expect(calculateTrend([75, 75])).toBe('→')
  })
})

describe('scoreColorClass', () => {
  it('returns green for score >= 80', () => {
    expect(scoreColorClass(80)).toBe('text-green-500')
    expect(scoreColorClass(100)).toBe('text-green-500')
  })

  it('returns blue for score 60-79', () => {
    expect(scoreColorClass(60)).toBe('text-blue-500')
    expect(scoreColorClass(79)).toBe('text-blue-500')
  })

  it('returns yellow for score 40-59', () => {
    expect(scoreColorClass(40)).toBe('text-yellow-500')
    expect(scoreColorClass(59)).toBe('text-yellow-500')
  })

  it('returns red for score < 40', () => {
    expect(scoreColorClass(0)).toBe('text-red-500')
    expect(scoreColorClass(39)).toBe('text-red-500')
  })
})

describe('scoreBgClass', () => {
  it('returns correct bg class by score range', () => {
    expect(scoreBgClass(85)).toBe('bg-green-500')
    expect(scoreBgClass(65)).toBe('bg-blue-500')
    expect(scoreBgClass(45)).toBe('bg-yellow-500')
    expect(scoreBgClass(20)).toBe('bg-red-500')
  })
})
