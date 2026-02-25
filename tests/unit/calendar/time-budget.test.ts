import { describe, it, expect } from 'vitest'
import { calcTimeBudget } from '@/app/(app)/calendar/_components/CalendarClient'
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
