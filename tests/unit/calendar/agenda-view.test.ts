import { describe, it, expect } from 'vitest'
import { addDays, eachDayOfInterval } from 'date-fns'
import { getEventsForDay } from '@/lib/calendar/calendar-utils'
import type { ICalendarEvent } from '@/lib/calendar/calendar-utils'
import { formatMinutes } from '@/app/(app)/calendar/_components/CalendarClient'

// ─── Helper: simulates AgendaView 30-day window logic ────────────────────────

function getAgendaDays(currentDate: Date, events: ICalendarEvent[]) {
  const next30Days = eachDayOfInterval({
    start: currentDate,
    end: addDays(currentDate, 29),
  })
  return next30Days
    .map((day) => ({ day, dayEvents: getEventsForDay(events, day) }))
    .filter(({ dayEvents }) => dayEvents.length > 0)
}

// Helper: simulates formatDuration used in AgendaView row
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Use local noon to avoid timezone edge cases with isSameDay (date-fns operates in local time)
const BASE_DATE = new Date(2024, 5, 15, 12, 0, 0) // June 15, 2024 12:00 local

function makeEvent(
  id: string,
  year: number,
  month: number, // 0-indexed
  day: number,
  hour = 9,
  durationMin = 30
): ICalendarEvent {
  const start = new Date(year, month, day, hour, 0, 0)
  return {
    id,
    title: `Event ${id}`,
    start,
    end: new Date(start.getTime() + durationMin * 60000),
    color: 'blue',
    description: 'Test Area',
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AgendaView — 30-day window logic', () => {
  it('includes days that have events within the 30-day window', () => {
    // June 16 is day 1 within the June 15 window
    const events = [makeEvent('e1', 2024, 5, 16)]
    const result = getAgendaDays(BASE_DATE, events)
    expect(result).toHaveLength(1)
    expect(result[0].dayEvents[0].id).toBe('e1')
  })

  it('excludes days with no events', () => {
    // Window starting June 17 — event on June 16 is before window
    const windowStart = new Date(2024, 5, 17, 12, 0, 0)
    const eventOnJune16 = makeEvent('e2', 2024, 5, 16)
    const result = getAgendaDays(windowStart, [eventOnJune16])
    expect(result).toHaveLength(0)
  })

  it('excludes events on day 31 (outside the 30-day window)', () => {
    // Window: June 15 – July 14 (days 0..29); July 15 = day 30 → excluded
    const day31Event = makeEvent('e3', 2024, 6, 15) // July 15 = day 30
    const result = getAgendaDays(BASE_DATE, [day31Event])
    expect(result).toHaveLength(0)
  })

  it('includes events on day 30 (last day of 30-day window)', () => {
    // addDays(June 15, 29) = July 14 → last day included
    const lastDayEvent = makeEvent('e4', 2024, 6, 14) // July 14 = day 29
    const result = getAgendaDays(BASE_DATE, [lastDayEvent])
    expect(result).toHaveLength(1)
    expect(result[0].dayEvents[0].id).toBe('e4')
  })

  it('returns empty when no events exist in the 30-day window', () => {
    const result = getAgendaDays(BASE_DATE, [])
    expect(result).toHaveLength(0)
  })

  it('groups multiple events on the same day together', () => {
    const morning = makeEvent('e5', 2024, 5, 16, 9, 30)
    const afternoon = makeEvent('e6', 2024, 5, 16, 15, 60)
    const result = getAgendaDays(BASE_DATE, [morning, afternoon])
    expect(result).toHaveLength(1)
    expect(result[0].dayEvents).toHaveLength(2)
  })
})

describe('formatDuration — agenda row display', () => {
  it('shows Xm for durations under 60 minutes', () => {
    expect(formatDuration(30)).toBe('30m')
    expect(formatDuration(15)).toBe('15m')
    expect(formatDuration(45)).toBe('45m')
  })

  it('shows Xh for exact hours (no trailing 0m)', () => {
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(120)).toBe('2h')
  })

  it('shows Xh Ym for mixed hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m')
    expect(formatDuration(75)).toBe('1h 15m')
  })
})

describe('formatMinutes — time budget display (no regression)', () => {
  it('always returns Xh Ym format (for TimeBudgetPanel)', () => {
    expect(formatMinutes(30)).toBe('0h 30m')
    expect(formatMinutes(60)).toBe('1h 0m')
    expect(formatMinutes(90)).toBe('1h 30m')
    expect(formatMinutes(960)).toBe('16h 0m')
  })
})
