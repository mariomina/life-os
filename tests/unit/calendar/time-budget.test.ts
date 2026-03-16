import { describe, it, expect } from 'vitest'
import {
  calcTimeBudget,
  calcWeeklyTimeBudget,
} from '@/app/(app)/calendar/_components/CalendarClient'
import type { ICalendarEvent } from '@/lib/calendar/calendar-utils'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DAY = new Date(2024, 0, 15) // local Jan 15 2024

function makeEvent(overrides: Partial<ICalendarEvent>): ICalendarEvent {
  const start = overrides.start ?? new Date(2024, 0, 15, 9, 0, 0)
  const end = overrides.end ?? new Date(2024, 0, 15, 9, 30, 0)
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
  it('returns 0 committed and 1440 free when no events', () => {
    const result = calcTimeBudget([], DAY)
    expect(result.committed).toBe(0)
    expect(result.available).toBe(1440) // 24h * 60min
    expect(result.free).toBe(1440)
  })

  it('sums durations from multiple events correctly', () => {
    const events = [
      makeEvent({
        start: new Date(2024, 0, 15, 7, 0, 0),
        end: new Date(2024, 0, 15, 7, 30, 0), // 30 min
      }),
      makeEvent({
        id: 'evt-2',
        start: new Date(2024, 0, 15, 9, 0, 0),
        end: new Date(2024, 0, 15, 10, 0, 0), // 60 min
      }),
      makeEvent({
        id: 'evt-3',
        start: new Date(2024, 0, 15, 14, 0, 0),
        end: new Date(2024, 0, 15, 14, 45, 0), // 45 min
      }),
    ]
    const result = calcTimeBudget(events, DAY)
    expect(result.committed).toBe(135) // 30 + 60 + 45
    expect(result.free).toBe(1440 - 135) // 1305
  })

  it('clamps midnight-crossing events to the current day only', () => {
    // Event from 23:00 Jan15 to 01:00 Jan16 → only 60 min on Jan 15
    const events = [
      makeEvent({
        start: new Date(2024, 0, 15, 23, 0, 0),
        end: new Date(2024, 0, 16, 1, 0, 0), // 120 min total, 60 on Jan 15
      }),
    ]
    const result = calcTimeBudget(events, DAY)
    expect(result.committed).toBe(60) // only 60 min on Jan 15
    expect(result.free).toBe(1440 - 60) // 1380
  })

  it('counts the next-day portion for a midnight-crossing event', () => {
    // Same event counted from Jan 16's perspective → only 60 min on Jan 16
    const events = [
      makeEvent({
        start: new Date(2024, 0, 15, 23, 0, 0),
        end: new Date(2024, 0, 16, 1, 0, 0),
      }),
    ]
    const day16 = new Date(2024, 0, 16)
    const result = calcTimeBudget(events, day16)
    expect(result.committed).toBe(60) // only 60 min on Jan 16
  })

  it('shows negative free when committed exceeds available (overcommitted)', () => {
    // 25 hours of events — exceeds 24h available
    const events = Array.from({ length: 25 }, (_, i) =>
      makeEvent({
        id: `evt-${i}`,
        start: new Date(2024, 0, 15, i % 24, 0, 0),
        end: new Date(2024, 0, 15, (i % 24) + 1, 0, 0),
      })
    )
    const result = calcTimeBudget(events, DAY)
    expect(result.committed).toBe(25 * 60) // 1500 min
    expect(result.free).toBe(1440 - 1500) // -60
    expect(result.free).toBeLessThan(0)
  })

  it('handles a single 8-hour event', () => {
    const events = [
      makeEvent({
        start: new Date(2024, 0, 15, 9, 0, 0),
        end: new Date(2024, 0, 15, 17, 0, 0), // 480 min = 8h
      }),
    ]
    const result = calcTimeBudget(events, DAY)
    expect(result.committed).toBe(480)
    expect(result.available).toBe(1440)
    expect(result.free).toBe(960)
  })

  it('available is always 1440 minutes (24h) regardless of events', () => {
    const result1 = calcTimeBudget([], DAY)
    const result2 = calcTimeBudget([makeEvent({})], DAY)
    expect(result1.available).toBe(1440)
    expect(result2.available).toBe(1440)
  })
})

// ─── Tests: Weekly Time Budget calculation (AC3 Story 5.3) ───────────────────

describe('calcWeeklyTimeBudget', () => {
  it('returns 0 committed and 10080 free when no events', () => {
    const result = calcWeeklyTimeBudget([])
    expect(result.committed).toBe(0)
    expect(result.available).toBe(10080) // 24h * 60min * 7 days
    expect(result.free).toBe(10080)
  })

  it('sums durations across multiple days of the week correctly', () => {
    // 2h Mon + 3h Wed + 1h Fri = 6h = 360 min
    const events = [
      makeEvent({
        id: 'mon',
        start: new Date(2024, 0, 15, 9, 0, 0),
        end: new Date(2024, 0, 15, 11, 0, 0), // 120 min
      }),
      makeEvent({
        id: 'wed',
        start: new Date(2024, 0, 17, 14, 0, 0),
        end: new Date(2024, 0, 17, 17, 0, 0), // 180 min
      }),
      makeEvent({
        id: 'fri',
        start: new Date(2024, 0, 19, 8, 0, 0),
        end: new Date(2024, 0, 19, 9, 0, 0), // 60 min
      }),
    ]
    const result = calcWeeklyTimeBudget(events)
    expect(result.committed).toBe(360)
    expect(result.available).toBe(10080)
    expect(result.free).toBe(10080 - 360) // 9720
  })

  it('shows negative free when weekly committed exceeds 10080 min (overcommitted)', () => {
    // 169 hours = 10140 min > 10080 available (24h × 7)
    const BASE = new Date(2024, 0, 15, 0, 0, 0).getTime()
    const events = Array.from({ length: 169 }, (_, i) => {
      const start = new Date(BASE + i * 3600000)
      const end = new Date(BASE + (i + 1) * 3600000)
      return makeEvent({ id: `evt-${i}`, start, end })
    })
    const result = calcWeeklyTimeBudget(events)
    expect(result.committed).toBe(169 * 60) // 10140 min
    expect(result.free).toBe(10080 - 10140) // -60
    expect(result.free).toBeLessThan(0)
  })

  it('available is always 10080 minutes (24h × 7) regardless of events', () => {
    const result1 = calcWeeklyTimeBudget([])
    const result2 = calcWeeklyTimeBudget([makeEvent({})])
    expect(result1.available).toBe(10080)
    expect(result2.available).toBe(10080)
  })
})
