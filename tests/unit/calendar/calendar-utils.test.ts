import { describe, it, expect } from 'vitest'
import {
  toCalendarEvent,
  toCalendarEvents,
  getWeekRange,
  getMonthRange,
  getDayRange,
  formatDateHeader,
  getMonthGridDays,
  getDayHourSlots,
  getEventsForDay,
  getEventsForRange,
  formatTimeUTC,
} from '@/lib/calendar/calendar-utils'

// ─── toCalendarEvent ──────────────────────────────────────────────────────────

describe('toCalendarEvent', () => {
  it('converts an activity with scheduledAt to ICalendarEvent', () => {
    const activity = {
      id: 'abc-123',
      title: 'Meditación',
      scheduledAt: new Date('2024-01-15T07:00:00Z'),
      scheduledDurationMinutes: 30,
    }
    const event = toCalendarEvent(activity)
    expect(event).not.toBeNull()
    expect(event!.id).toBe('abc-123')
    expect(event!.title).toBe('Meditación')
    expect(event!.start).toEqual(new Date('2024-01-15T07:00:00Z'))
    expect(event!.end.getTime() - event!.start.getTime()).toBe(30 * 60 * 1000)
    expect(event!.color).toBe('blue')
  })

  it('returns null when scheduledAt is null', () => {
    const activity = {
      id: 'no-date',
      title: 'Sin fecha',
      scheduledAt: null,
      scheduledDurationMinutes: 30,
    }
    expect(toCalendarEvent(activity)).toBeNull()
  })

  it('defaults duration to 30 minutes when scheduledDurationMinutes is null', () => {
    const activity = {
      id: 'default-dur',
      title: 'Sin duración',
      scheduledAt: new Date('2024-01-15T09:00:00Z'),
      scheduledDurationMinutes: null,
    }
    const event = toCalendarEvent(activity)
    expect(event).not.toBeNull()
    expect(event!.end.getTime() - event!.start.getTime()).toBe(30 * 60 * 1000)
  })

  it('accepts custom color', () => {
    const activity = {
      id: 'colored',
      title: 'Con color',
      scheduledAt: new Date('2024-01-15T10:00:00Z'),
      scheduledDurationMinutes: 60,
    }
    const event = toCalendarEvent(activity, 'green')
    expect(event!.color).toBe('green')
  })
})

// ─── toCalendarEvents ─────────────────────────────────────────────────────────

describe('toCalendarEvents', () => {
  it('filters out activities without scheduledAt', () => {
    const activities = [
      {
        id: '1',
        title: 'A',
        scheduledAt: new Date('2024-01-15T07:00:00Z'),
        scheduledDurationMinutes: 30,
      },
      { id: '2', title: 'B', scheduledAt: null, scheduledDurationMinutes: 30 },
      {
        id: '3',
        title: 'C',
        scheduledAt: new Date('2024-01-15T09:00:00Z'),
        scheduledDurationMinutes: 45,
      },
    ]
    const events = toCalendarEvents(activities)
    expect(events).toHaveLength(2)
    expect(events.map((e) => e.id)).toEqual(['1', '3'])
  })

  it('returns empty array for empty input', () => {
    expect(toCalendarEvents([])).toEqual([])
  })
})

// ─── getWeekRange ─────────────────────────────────────────────────────────────

describe('getWeekRange', () => {
  it('returns Monday as start and Sunday as end for a mid-week date', () => {
    // Use local noon to avoid timezone boundary issues
    const wednesday = new Date(2024, 0, 17, 12, 0, 0) // Jan 17, 2024 (Wednesday)
    const { start, end } = getWeekRange(wednesday)
    expect(start.getDay()).toBe(1) // Monday = 1
    expect(end.getDay()).toBe(0) // Sunday = 0
  })

  it('returns the same week when given a Monday', () => {
    const monday = new Date(2024, 0, 15, 12, 0, 0) // Jan 15, 2024 (Monday)
    const { start } = getWeekRange(monday)
    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(15)
  })

  it('endOfWeek is 6 days after startOfWeek (7 day span)', () => {
    const wednesday = new Date(2024, 0, 17, 12, 0, 0)
    const { start, end } = getWeekRange(wednesday)
    // end is end-of-day Sunday; start is start-of-day Monday
    // The difference in calendar dates is 6 (Mon=15, Sun=21 → 21-15=6)
    const startDate = start.getDate()
    const endDate = end.getDate()
    // Both are in the same month so simple subtraction works
    expect(endDate - startDate).toBe(6)
  })
})

// ─── getMonthRange ────────────────────────────────────────────────────────────

describe('getMonthRange', () => {
  it('returns Jan 1 and Jan 31 for January 2024', () => {
    const { start, end } = getMonthRange(new Date('2024-01-15T00:00:00Z'))
    expect(start.getDate()).toBe(1)
    expect(end.getDate()).toBe(31)
    expect(start.getMonth()).toBe(0)
    expect(end.getMonth()).toBe(0)
  })

  it('handles February in leap year correctly', () => {
    const { end } = getMonthRange(new Date('2024-02-10T00:00:00Z'))
    expect(end.getDate()).toBe(29) // 2024 is a leap year
  })
})

// ─── getDayRange ──────────────────────────────────────────────────────────────

describe('getDayRange', () => {
  it('returns start of day and end of day', () => {
    const { start, end } = getDayRange(new Date('2024-01-15T14:30:00'))
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
  })
})

// ─── formatDateHeader ─────────────────────────────────────────────────────────

describe('formatDateHeader', () => {
  it('formats day view with full date in Spanish', () => {
    // 2024-01-15 = Monday, January 15
    const result = formatDateHeader(new Date('2024-01-15T12:00:00'), 'day')
    expect(result.toLowerCase()).toContain('enero')
    expect(result).toContain('2024')
    expect(result).toContain('15')
  })

  it('formats month view as "mes año" in Spanish', () => {
    const result = formatDateHeader(new Date('2024-01-15T12:00:00'), 'month')
    expect(result.toLowerCase()).toContain('enero')
    expect(result).toContain('2024')
  })

  it('formats year view as just the year', () => {
    const result = formatDateHeader(new Date('2024-06-15T12:00:00'), 'year')
    expect(result).toBe('2024')
  })

  it('formats week view with date range', () => {
    // 2024-01-15 is a Monday
    const result = formatDateHeader(new Date('2024-01-15T12:00:00'), 'week')
    expect(result).toContain('15')
    expect(result).toContain('21') // Sunday of that week
  })
})

// ─── getMonthGridDays ─────────────────────────────────────────────────────────

describe('getMonthGridDays', () => {
  it('returns a multiple of 7 (complete weeks)', () => {
    const days = getMonthGridDays(new Date('2024-01-15T00:00:00Z'))
    expect(days.length % 7).toBe(0)
  })

  it('always includes all days of the month', () => {
    const days = getMonthGridDays(new Date('2024-01-15T00:00:00Z'))
    const januaryDays = days.filter((d) => d.getMonth() === 0 && d.getFullYear() === 2024)
    expect(januaryDays).toHaveLength(31)
  })
})

// ─── getDayHourSlots ──────────────────────────────────────────────────────────

describe('getDayHourSlots', () => {
  it('returns 24 slots for a full day (0-24)', () => {
    const slots = getDayHourSlots(new Date(), 0, 24)
    expect(slots).toHaveLength(24)
  })

  it('returns correct number of slots for a custom range', () => {
    const slots = getDayHourSlots(new Date(), 7, 22)
    expect(slots).toHaveLength(15)
  })
})

// ─── getEventsForDay ─────────────────────────────────────────────────────────

describe('getEventsForDay', () => {
  // Use local time (no Z suffix) to avoid timezone-crossing issues in isSameDay
  const events = [
    {
      id: '1',
      title: 'Morning',
      start: new Date(2024, 0, 15, 7, 0, 0),
      end: new Date(2024, 0, 15, 8, 0, 0),
    },
    {
      id: '2',
      title: 'Afternoon',
      start: new Date(2024, 0, 15, 15, 0, 0),
      end: new Date(2024, 0, 15, 16, 0, 0),
    },
    {
      id: '3',
      title: 'Next day',
      start: new Date(2024, 0, 16, 9, 0, 0),
      end: new Date(2024, 0, 16, 10, 0, 0),
    },
  ]

  it('returns events for the specified day', () => {
    const result = getEventsForDay(events, new Date(2024, 0, 15, 12, 0, 0))
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.id)).toEqual(['1', '2'])
  })

  it('returns empty array when no events on that day', () => {
    const result = getEventsForDay(events, new Date(2024, 0, 17, 12, 0, 0))
    expect(result).toHaveLength(0)
  })
})

// ─── getEventsForRange ────────────────────────────────────────────────────────

describe('getEventsForRange', () => {
  const events = [
    {
      id: '1',
      title: 'In range',
      start: new Date('2024-01-15T07:00:00Z'),
      end: new Date('2024-01-15T08:00:00Z'),
    },
    {
      id: '2',
      title: 'After range',
      start: new Date('2024-01-20T07:00:00Z'),
      end: new Date('2024-01-20T08:00:00Z'),
    },
  ]

  it('returns only events within the range', () => {
    const range = {
      start: new Date('2024-01-14T00:00:00Z'),
      end: new Date('2024-01-16T23:59:59Z'),
    }
    const result = getEventsForRange(events, range)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })
})

// ─── formatTimeUTC ────────────────────────────────────────────────────────────

describe('formatTimeUTC', () => {
  it('formats a UTC date as HH:mm', () => {
    const date = new Date('2024-01-15T07:30:00Z')
    expect(formatTimeUTC(date)).toBe('07:30')
  })

  it('pads single digit hours', () => {
    const date = new Date('2024-01-15T09:05:00Z')
    expect(formatTimeUTC(date)).toBe('09:05')
  })
})
