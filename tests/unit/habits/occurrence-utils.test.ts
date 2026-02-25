import { describe, it, expect } from 'vitest'
import { generateHabitOccurrences } from '@/lib/habits/occurrence-utils'

// ─── Tests: generateHabitOccurrences ─────────────────────────────────────────

describe('generateHabitOccurrences — FREQ=DAILY', () => {
  it('generates exactly 7 dates in a 7-day window', () => {
    const habit = { rrule: 'FREQ=DAILY;BYHOUR=7;BYMINUTE=0;BYSECOND=0' }
    const windowStart = new Date('2024-01-01T00:00:00Z')
    const windowEnd = new Date('2024-01-07T23:59:59Z')

    const occurrences = generateHabitOccurrences(habit, windowStart, windowEnd)

    expect(occurrences).toHaveLength(7)
  })

  it('returns Date objects with the correct hour', () => {
    const habit = { rrule: 'FREQ=DAILY;BYHOUR=7;BYMINUTE=0;BYSECOND=0' }
    const windowStart = new Date('2024-01-01T00:00:00Z')
    const windowEnd = new Date('2024-01-01T23:59:59Z')

    const occurrences = generateHabitOccurrences(habit, windowStart, windowEnd)

    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].getUTCHours()).toBe(7)
  })
})

describe('generateHabitOccurrences — FREQ=WEEKLY;BYDAY=MO', () => {
  it('only generates Mondays in a 2-week window', () => {
    const habit = { rrule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=7;BYMINUTE=0;BYSECOND=0' }
    // 2024-01-01 is a Monday
    const windowStart = new Date('2024-01-01T00:00:00Z')
    const windowEnd = new Date('2024-01-14T23:59:59Z')

    const occurrences = generateHabitOccurrences(habit, windowStart, windowEnd)

    expect(occurrences).toHaveLength(2)
    // Both should be Mondays (day 1 in UTC getUTCDay: 0=Sun, 1=Mon)
    occurrences.forEach((d) => {
      expect(d.getUTCDay()).toBe(1)
    })
  })
})

describe('generateHabitOccurrences — invalid rrule', () => {
  it('throws an Error when rrule string is invalid', () => {
    const habit = { rrule: 'NOT_A_VALID_RRULE' }
    const windowStart = new Date('2024-01-01T00:00:00Z')
    const windowEnd = new Date('2024-01-07T23:59:59Z')

    expect(() => generateHabitOccurrences(habit, windowStart, windowEnd)).toThrow(/Invalid rrule/)
  })
})

describe('generateHabitOccurrences — empty window', () => {
  it('returns empty array when windowEnd is before windowStart', () => {
    const habit = { rrule: 'FREQ=DAILY;BYHOUR=7;BYMINUTE=0;BYSECOND=0' }
    const windowStart = new Date('2024-01-07T00:00:00Z')
    const windowEnd = new Date('2024-01-01T00:00:00Z')

    const occurrences = generateHabitOccurrences(habit, windowStart, windowEnd)

    expect(occurrences).toHaveLength(0)
  })

  it('returns empty array when windowEnd equals windowStart but no occurrence at that exact time', () => {
    const habit = { rrule: 'FREQ=DAILY;BYHOUR=7;BYMINUTE=0;BYSECOND=0' }
    // Same start and end, but not at 07:00 UTC
    const windowStart = new Date('2024-01-01T10:00:00Z')
    const windowEnd = new Date('2024-01-01T10:00:00Z')

    const occurrences = generateHabitOccurrences(habit, windowStart, windowEnd)

    expect(occurrences).toHaveLength(0)
  })
})
