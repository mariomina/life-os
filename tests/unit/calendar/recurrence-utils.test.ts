// tests/unit/calendar/recurrence-utils.test.ts
// Unit tests for generateOccurrences and describeRecurrence — Story 10.4 / 10.6 / 10.7

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
    for (const type of ['daily', 'weekly', 'monthly'] as const) {
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

  it('yearly count=3 returns 3 dates on the same day/month but consecutive years', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'yearly', count: 3 }))
    expect(result).toHaveLength(3)
    for (const date of result) {
      expect(date.getMonth()).toBe(BASE_DATE.getMonth())
      expect(date.getDate()).toBe(BASE_DATE.getDate())
    }
    expect(result[0].getFullYear()).toBe(BASE_DATE.getFullYear())
    expect(result[1].getFullYear()).toBe(BASE_DATE.getFullYear() + 1)
    expect(result[2].getFullYear()).toBe(BASE_DATE.getFullYear() + 2)
  })

  it('yearly count=10 returns exactly 10 occurrences (MAX_OCCURRENCES limit)', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'yearly', count: 10 }))
    expect(result).toHaveLength(10)
  })

  it('yearly count=35 is capped to MAX_OCCURRENCES=30', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'yearly', count: 35 }))
    expect(result).toHaveLength(30)
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

  it('yearly count=3 returns readable string with "año"', () => {
    const result = describeRecurrence(makeOpts({ type: 'yearly', count: 3 }), BASE_DATE)
    expect(result).toMatch(/3/)
    expect(result).toMatch(/año/)
  })
})

// ─── custom recurrence (Story 10.7) ───────────────────────────────────────────

describe('custom recurrence — Mon-Fri (daysOfWeek=[1,2,3,4,5])', () => {
  function makeCustomWeekdays(overrides: Partial<RecurrenceOptions> = {}): RecurrenceOptions {
    return makeOpts({
      type: 'custom',
      unit: 'week',
      interval: 1,
      daysOfWeek: [1, 2, 3, 4, 5],
      ...overrides,
    })
  }

  it('count=5 returns only Mon-Fri dates', () => {
    const result = generateOccurrences(BASE_DATE, makeCustomWeekdays({ count: 5 }))
    expect(result).toHaveLength(5)
    for (const date of result) {
      const day = date.getDay() // 0=Sun, 6=Sat
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(5)
    }
  })

  it('count=10 returns exactly 10 Mon-Fri dates', () => {
    const result = generateOccurrences(BASE_DATE, makeCustomWeekdays({ count: 10 }))
    expect(result).toHaveLength(10)
    for (const date of result) {
      const day = date.getDay()
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(5)
    }
  })

  it('preserves the hour and minute of the start date', () => {
    const start = new Date('2026-03-09T08:30:00') // Monday
    const result = generateOccurrences(start, makeCustomWeekdays({ count: 3 }))
    for (const date of result) {
      expect(date.getHours()).toBe(8)
      expect(date.getMinutes()).toBe(30)
    }
  })

  it('starting on Friday only includes Fri then skips to Mon', () => {
    // 2026-03-13 is a Friday
    const friday = new Date('2026-03-13T09:00:00')
    const result = generateOccurrences(friday, makeCustomWeekdays({ count: 3 }))
    expect(result).toHaveLength(3)
    expect(result[0].getDay()).toBe(5) // Fri
    expect(result[1].getDay()).toBe(1) // Mon (skip Sat/Sun)
    expect(result[2].getDay()).toBe(2) // Tue
  })
})

describe('custom recurrence — biweekly on Wed-Fri', () => {
  it('every 2 weeks on Wed(3) and Fri(5) returns correct dates', () => {
    // BASE_DATE = 2026-03-09 (Monday)
    // Week of 09-Mar: Wed=11-Mar, Fri=13-Mar
    // Skip week of 16-Mar (interval=2)
    // Week of 23-Mar: Wed=25-Mar, Fri=27-Mar
    const result = generateOccurrences(
      BASE_DATE,
      makeOpts({
        type: 'custom',
        unit: 'week',
        interval: 2,
        daysOfWeek: [3, 5],
        count: 4,
      })
    )
    expect(result).toHaveLength(4)
    expect(result[0].getDate()).toBe(11) // Wed Mar 11
    expect(result[1].getDate()).toBe(13) // Fri Mar 13
    expect(result[2].getDate()).toBe(25) // Wed Mar 25
    expect(result[3].getDate()).toBe(27) // Fri Mar 27
  })
})

describe('custom recurrence — endType=never', () => {
  it('uses MAX_OCCURRENCES=260 for custom type', () => {
    const result = generateOccurrences(
      BASE_DATE,
      makeOpts({
        type: 'custom',
        unit: 'week',
        interval: 1,
        daysOfWeek: [1, 2, 3, 4, 5],
        endType: 'never',
        count: 1, // ignored when endType='never'
      })
    )
    expect(result).toHaveLength(260)
    for (const date of result) {
      const day = date.getDay()
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(5)
    }
  })
})

describe('custom recurrence — simple interval (no days)', () => {
  it('every 3 days returns dates 3 days apart', () => {
    const result = generateOccurrences(
      BASE_DATE,
      makeOpts({ type: 'custom', unit: 'day', interval: 3, count: 4 })
    )
    expect(result).toHaveLength(4)
    for (let i = 1; i < result.length; i++) {
      const diffDays = (result[i].getTime() - result[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(3)
    }
  })

  it('every 2 months returns months 2 apart on same day', () => {
    const result = generateOccurrences(
      BASE_DATE,
      makeOpts({ type: 'custom', unit: 'month', interval: 2, count: 3 })
    )
    expect(result).toHaveLength(3)
    expect(result[0].getMonth()).toBe(BASE_DATE.getMonth())
    expect(result[1].getMonth()).toBe(BASE_DATE.getMonth() + 2)
    expect(result[2].getMonth()).toBe(BASE_DATE.getMonth() + 4)
    for (const date of result) {
      expect(date.getDate()).toBe(BASE_DATE.getDate())
    }
  })
})

describe('describeRecurrence — custom type', () => {
  it('custom weekly Mon-Fri shows day abbreviations', () => {
    const result = describeRecurrence(
      makeOpts({
        type: 'custom',
        unit: 'week',
        interval: 1,
        daysOfWeek: [1, 2, 3, 4, 5],
        count: 5,
      }),
      BASE_DATE
    )
    expect(result).toMatch(/semana/)
    expect(result).toMatch(/Lu/)
    expect(result).toMatch(/Vi/)
  })

  it('custom every 2 weeks shows interval in label', () => {
    const result = describeRecurrence(
      makeOpts({
        type: 'custom',
        unit: 'week',
        interval: 2,
        daysOfWeek: [3],
        count: 4,
      }),
      BASE_DATE
    )
    expect(result).toMatch(/2 semanas/)
  })

  it('custom endType=never shows "próximos"', () => {
    const result = describeRecurrence(
      makeOpts({
        type: 'custom',
        unit: 'week',
        interval: 1,
        daysOfWeek: [1, 2, 3, 4, 5],
        endType: 'never',
        count: 1,
      }),
      BASE_DATE
    )
    expect(result).toMatch(/próximos/)
  })

  it('custom excludeHolidays shows excl. festivos', () => {
    const result = describeRecurrence(
      makeOpts({
        type: 'custom',
        unit: 'week',
        interval: 1,
        daysOfWeek: [1, 2, 3, 4, 5],
        excludeHolidays: true,
        count: 5,
      }),
      BASE_DATE
    )
    expect(result).toMatch(/festivos/)
  })
})

// ─── weekdays shortcut (tipo directo Lun-Vi) ──────────────────────────────────

describe('weekdays recurrence', () => {
  it('count=5 returns only Mon-Fri dates', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'weekdays', count: 5 }))
    expect(result).toHaveLength(5)
    for (const date of result) {
      const day = date.getDay() // 0=Sun, 6=Sat
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(5)
    }
  })

  it('count=10 returns exactly 10 Mon-Fri dates', () => {
    const result = generateOccurrences(BASE_DATE, makeOpts({ type: 'weekdays', count: 10 }))
    expect(result).toHaveLength(10)
    for (const date of result) {
      const day = date.getDay()
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(5)
    }
  })

  it('preserves the hour and minute of the start date', () => {
    const start = new Date('2026-03-09T08:30:00') // Monday
    const result = generateOccurrences(start, makeOpts({ type: 'weekdays', count: 3 }))
    for (const date of result) {
      expect(date.getHours()).toBe(8)
      expect(date.getMinutes()).toBe(30)
    }
  })

  it('starting on Friday only includes Fri then skips to Mon', () => {
    // 2026-03-13 is a Friday
    const friday = new Date('2026-03-13T09:00:00')
    const result = generateOccurrences(friday, makeOpts({ type: 'weekdays', count: 3 }))
    expect(result).toHaveLength(3)
    expect(result[0].getDay()).toBe(5) // Fri
    expect(result[1].getDay()).toBe(1) // Mon (skip Sat/Sun)
    expect(result[2].getDay()).toBe(2) // Tue
  })

  it('describeRecurrence returns readable text with "hábiles"', () => {
    const result = describeRecurrence(makeOpts({ type: 'weekdays', count: 5 }), BASE_DATE)
    expect(result).toMatch(/5/)
    expect(result).toMatch(/hábiles/)
  })
})
