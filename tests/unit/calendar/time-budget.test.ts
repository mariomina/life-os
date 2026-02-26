import { describe, it, expect } from 'vitest'
import {
  calcTimeBudget,
  calcWeeklyTimeBudget,
} from '@/app/(app)/calendar/_components/CalendarClient'
import type { ICalendarEvent } from '@/lib/calendar/calendar-utils'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<ICalendarEvent>): ICalendarEvent {
  const start = overrides.start ?? new Date('2024-01-15T09:00:00Z')
  const end = overrides.end ?? new Date('2024-01-15T09:30:00Z')
  return {
    id: 'evt-1',
    title: 'Test event',
    start,
    end,
    color: 'blue',
    ...overrides,
  }
}

// ─── Tests: Time Budget calculation (AC4) ────────────────────────────────────

describe('calcTimeBudget', () => {
  it('returns 0 committed and 960 free when no events', () => {
    const result = calcTimeBudget([])
    expect(result.committed).toBe(0)
    expect(result.available).toBe(960) // 16h * 60min
    expect(result.free).toBe(960)
  })

  it('sums durations from multiple events correctly', () => {
    const events = [
      makeEvent({
        start: new Date('2024-01-15T07:00:00Z'),
        end: new Date('2024-01-15T07:30:00Z'), // 30 min
      }),
      makeEvent({
        id: 'evt-2',
        start: new Date('2024-01-15T09:00:00Z'),
        end: new Date('2024-01-15T10:00:00Z'), // 60 min
      }),
      makeEvent({
        id: 'evt-3',
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T14:45:00Z'), // 45 min
      }),
    ]
    const result = calcTimeBudget(events)
    expect(result.committed).toBe(135) // 30 + 60 + 45
    expect(result.free).toBe(960 - 135) // 825
  })

  it('shows negative free when committed exceeds available (overcommitted)', () => {
    // 17 hours of events — exceeds 16h available
    const events = Array.from({ length: 17 }, (_, i) =>
      makeEvent({
        id: `evt-${i}`,
        start: new Date(`2024-01-15T${String(i).padStart(2, '0')}:00:00Z`),
        end: new Date(`2024-01-15T${String(i + 1).padStart(2, '0')}:00:00Z`),
      })
    )
    const result = calcTimeBudget(events)
    expect(result.committed).toBe(17 * 60) // 1020 min
    expect(result.free).toBe(960 - 1020) // -60
    expect(result.free).toBeLessThan(0)
  })

  it('handles a single 8-hour event', () => {
    const events = [
      makeEvent({
        start: new Date('2024-01-15T09:00:00Z'),
        end: new Date('2024-01-15T17:00:00Z'), // 480 min = 8h
      }),
    ]
    const result = calcTimeBudget(events)
    expect(result.committed).toBe(480)
    expect(result.available).toBe(960)
    expect(result.free).toBe(480)
  })

  it('available is always 960 minutes (16h) regardless of events', () => {
    const result1 = calcTimeBudget([])
    const result2 = calcTimeBudget([makeEvent({})])
    expect(result1.available).toBe(960)
    expect(result2.available).toBe(960)
  })
})

// ─── Tests: Weekly Time Budget calculation (AC3 Story 5.3) ───────────────────

describe('calcWeeklyTimeBudget', () => {
  it('returns 0 committed and 6720 free when no events', () => {
    const result = calcWeeklyTimeBudget([])
    expect(result.committed).toBe(0)
    expect(result.available).toBe(6720) // 16h * 60min * 7 days
    expect(result.free).toBe(6720)
  })

  it('sums durations across multiple days of the week correctly', () => {
    // 2h Mon + 3h Wed + 1h Fri = 6h = 360 min
    const events = [
      makeEvent({
        id: 'mon',
        start: new Date('2024-01-15T09:00:00Z'),
        end: new Date('2024-01-15T11:00:00Z'), // 120 min
      }),
      makeEvent({
        id: 'wed',
        start: new Date('2024-01-17T14:00:00Z'),
        end: new Date('2024-01-17T17:00:00Z'), // 180 min
      }),
      makeEvent({
        id: 'fri',
        start: new Date('2024-01-19T08:00:00Z'),
        end: new Date('2024-01-19T09:00:00Z'), // 60 min
      }),
    ]
    const result = calcWeeklyTimeBudget(events)
    expect(result.committed).toBe(360)
    expect(result.available).toBe(6720)
    expect(result.free).toBe(6720 - 360) // 6360
  })

  it('shows negative free when weekly committed exceeds 6720 min (overcommitted)', () => {
    // 113 hours = 6780 min > 6720 available
    const events = Array.from({ length: 113 }, (_, i) => {
      const dayOffset = Math.floor(i / 24)
      const hour = i % 24
      const date = new Date(`2024-01-1${5 + dayOffset}T${String(hour).padStart(2, '0')}:00:00Z`)
      const end = new Date(date.getTime() + 60 * 60 * 1000)
      return makeEvent({ id: `evt-${i}`, start: date, end })
    })
    const result = calcWeeklyTimeBudget(events)
    expect(result.committed).toBe(113 * 60) // 6780 min
    expect(result.free).toBe(6720 - 6780) // -60
    expect(result.free).toBeLessThan(0)
  })

  it('available is always 6720 minutes (16h × 7) regardless of events', () => {
    const result1 = calcWeeklyTimeBudget([])
    const result2 = calcWeeklyTimeBudget([makeEvent({})])
    expect(result1.available).toBe(6720)
    expect(result2.available).toBe(6720)
  })
})
