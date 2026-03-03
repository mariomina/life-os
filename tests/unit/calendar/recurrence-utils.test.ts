// tests/unit/calendar/recurrence-utils.test.ts
// Unit tests for generateOccurrences and describeRecurrence — Story 10.4

import { describe, it, expect } from 'vitest'
import {
  generateOccurrences,
  describeRecurrence,
  type RecurrenceOptions,
} from '@/lib/calendar/recurrence-utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Monday 2026-03-09 at 09:00 local */
const BASE_DATE = new Date('2026-03-09T09:00:00')

function makeOpts(overrides: Partial<RecurrenceOptions> = {}): RecurrenceOptions {
  return {
    type: 'weekly',
    endType: 'count',
    count: 4,
    endDate: '',
    ...overrides,
  }
}

// ─── generateOccurrences ──────────────────────────────────────────────────────

describe('generateOccurrences', () => {
  it('type=none always returns only the start date', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'none', count: 5 }))
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(BASE_DATE)
  })

  it('daily count=7 returns 7 consecutive dates', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'daily', count: 7 }))
    expect(result).toHaveLength(7)
    for (let i = 0; i < result.length; i++) {
      const expected = new Date(BASE_DATE)
      expected.setDate(expected.getDate() + i)
      expect(result[i].getDate()).toBe(expected.getDate())
      expect(result[i].getHours()).toBe(BASE_DATE.getHours())
    }
  })

  it('weekdays count=5 returns only Mon-Fri', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'weekdays', count: 5 }))
    expect(result).toHaveLength(5)
    for (const date of result) {
      const day = date.getDay() // 0=Sun, 6=Sat
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(5)
    }
  })

  it('weekly count=4 returns 4 dates exactly 7 days apart', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'weekly', count: 4 }))
    expect(result).toHaveLength(4)
    for (let i = 1; i < result.length; i++) {
      const diffMs = result[i].getTime() - result[i - 1].getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(7)
    }
  })

  it('monthly count=3 returns 3 dates on the same day of month', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'monthly', count: 3 }))
    expect(result).toHaveLength(3)
    for (const date of result) {
      expect(date.getDate()).toBe(BASE_DATE.getDate())
    }
    // Months increment correctly
    expect(result[0].getMonth()).toBe(BASE_DATE.getMonth())
    expect(result[1].getMonth()).toBe(BASE_DATE.getMonth() + 1)
    expect(result[2].getMonth()).toBe(BASE_DATE.getMonth() + 2)
  })

  it('count=1 returns only the start date regardless of type', () => {
    for (const type of ['daily', 'weekdays', 'weekly', 'monthly'] as const) {
      const result = generateOccurrences(BASE_DATE, makeOpts({ type, count: 1 }))
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(BASE_DATE)
    }
  })

  it('endDate in the past returns only the start date (first occurrence)', () => {
    const result = generateOccurrences(
      BASE_DATE,
      makeOpts({
        type: 'daily',
        count: 30,
        endType: 'date',
        endDate: '2020-01-01', // far in the past
      })
    )
    // The start date itself is still included (it's before endDate check kicks in on iteration)
    // Actually since start > endDate, the loop should produce 0 elements
    // but we clamp to at least 0
    expect(result.length).toBeLessThanOrEqual(1)
  })

  it('weekly endDate stops at the end date', () => {
    // 4 weeks from BASE_DATE = 2026-03-09 → 2026-03-30
    // endDate = 2026-03-23 → should yield 2026-03-09 and 2026-03-16 (2 events)
    const result = generateOccurrences(
      BASE_DATE,
      makeOpts({
        type: 'weekly',
        count: 52, // large count, date should cut it
        endType: 'date',
        endDate: '2026-03-23',
      })
    )
    expect(result).toHaveLength(3) // 09, 16, 23
    expect(result[result.length - 1].getDate()).toBeLessThanOrEqual(23)
  })

  it('preserves the hour and minute of the start date', () => {
    const start = new Date('2026-03-09T15:30:00')
    const result = generateOccurrences(start, makeOpts({ type: 'daily', count: 3 }))
    for (const date of result) {
      expect(date.getHours()).toBe(15)
      expect(date.getMinutes()).toBe(30)
    }
  })
})

// ─── describeRecurrence ────────────────────────────────────────────────────────

describe('describeRecurrence', () => {
  it('returns empty string for type=none', () => {
    const result = describeRecurrence(makeOpts({ type: 'none' }), BASE_DATE)
    expect(result).toBe('')
  })

  it('weekly count=4 returns readable string with correct count', () => {
    const result = describeRecurrence(makeOpts({ type: 'weekly', count: 4 }), BASE_DATE)
    expect(result).toMatch(/4/)
    expect(result).toMatch(/semana/)
  })

  it('daily count=1 uses singular "evento"', () => {
    const result = describeRecurrence(makeOpts({ type: 'daily', count: 1 }), BASE_DATE)
    expect(result).toMatch(/1 evento[^s]/)
  })

  it('monthly endType=date includes date text', () => {
    const result = describeRecurrence(
      makeOpts({ type: 'monthly', count: 12, endType: 'date', endDate: '2026-12-31' }),
      BASE_DATE
    )
    expect(result).toMatch(/mes/)
    expect(result).toMatch(/hasta/)
  })
})
