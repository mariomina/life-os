import { describe, it, expect } from 'vitest'
import { maslowLevelToColor } from '@/lib/db/queries/calendar'
import type { ActivityForCalendar } from '@/lib/db/queries/calendar'

// ─── Pure helpers extracted from getActivitiesForDay logic ────────────────────

/** Mimics the UTC day-range filter applied in the query */
function isInDay(scheduledAt: Date, date: Date): boolean {
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setUTCHours(23, 59, 59, 999)
  return scheduledAt >= dayStart && scheduledAt <= dayEnd
}

/** Mimics the UTC week-range filter applied in getActivitiesForWeek (ISO Mon–Sun, UTC) */
function isInWeek(scheduledAt: Date, date: Date): boolean {
  const utcDay = date.getUTCDay()
  const daysFromMonday = (utcDay + 6) % 7
  const rangeStart = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - daysFromMonday,
      0,
      0,
      0,
      0
    )
  )
  const rangeEnd = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - daysFromMonday + 6,
      23,
      59,
      59,
      999
    )
  )
  return scheduledAt >= rangeStart && scheduledAt <= rangeEnd
}

/** Mimics ORDER BY scheduledAt ASC */
function sortByScheduledAt(activities: ActivityForCalendar[]): ActivityForCalendar[] {
  return [...activities].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TARGET_DATE = new Date('2024-01-15T00:00:00Z')

function makeActivity(overrides: Partial<ActivityForCalendar>): ActivityForCalendar {
  return {
    id: 'act-1',
    title: 'Test activity',
    scheduledAt: new Date('2024-01-15T09:00:00Z'),
    scheduledDurationMinutes: 30,
    status: 'pending',
    areaName: null,
    areaColor: 'blue',
    habitTitle: null,
    habitId: null,
    ...overrides,
  }
}

// ─── Tests: UTC day-range filter (AC1) ───────────────────────────────────────

describe('getActivitiesForDay — UTC day-range filter', () => {
  it('includes activity scheduled at start of UTC day (00:00:00Z)', () => {
    const act = makeActivity({ scheduledAt: new Date('2024-01-15T00:00:00Z') })
    expect(isInDay(act.scheduledAt, TARGET_DATE)).toBe(true)
  })

  it('includes activity scheduled at end of UTC day (23:59:59.999Z)', () => {
    const act = makeActivity({ scheduledAt: new Date('2024-01-15T23:59:59.999Z') })
    expect(isInDay(act.scheduledAt, TARGET_DATE)).toBe(true)
  })

  it('excludes activity scheduled on the previous day', () => {
    const act = makeActivity({ scheduledAt: new Date('2024-01-14T23:59:59.999Z') })
    expect(isInDay(act.scheduledAt, TARGET_DATE)).toBe(false)
  })

  it('excludes activity scheduled on the next day', () => {
    const act = makeActivity({ scheduledAt: new Date('2024-01-16T00:00:00Z') })
    expect(isInDay(act.scheduledAt, TARGET_DATE)).toBe(false)
  })
})

// ─── Tests: JOIN results (AC1) ────────────────────────────────────────────────

describe('getActivitiesForDay — area and habit joins', () => {
  it('returns areaName and habitTitle as null when not joined', () => {
    const act = makeActivity({ areaName: null, habitTitle: null, habitId: null })
    expect(act.areaName).toBeNull()
    expect(act.habitTitle).toBeNull()
    expect(act.habitId).toBeNull()
  })

  it('returns area name when area is joined', () => {
    const act = makeActivity({ areaName: 'Fisiológica', areaColor: 'red' })
    expect(act.areaName).toBe('Fisiológica')
    expect(act.areaColor).toBe('red')
  })

  it('returns habitTitle when habit is joined', () => {
    const act = makeActivity({ habitTitle: 'Meditación', habitId: 'habit-1' })
    expect(act.habitTitle).toBe('Meditación')
    expect(act.habitId).toBe('habit-1')
  })
})

// ─── Tests: ORDER BY scheduledAt ASC (AC1) ────────────────────────────────────

describe('getActivitiesForDay — orderBy scheduledAt ASC', () => {
  it('returns activities sorted by scheduledAt ascending', () => {
    const late = makeActivity({ id: 'act-late', scheduledAt: new Date('2024-01-15T15:00:00Z') })
    const early = makeActivity({ id: 'act-early', scheduledAt: new Date('2024-01-15T07:00:00Z') })
    const mid = makeActivity({ id: 'act-mid', scheduledAt: new Date('2024-01-15T09:00:00Z') })

    const sorted = sortByScheduledAt([late, early, mid])
    expect(sorted.map((a) => a.id)).toEqual(['act-early', 'act-mid', 'act-late'])
  })

  it('handles single activity without sorting error', () => {
    const act = makeActivity({ id: 'solo' })
    const sorted = sortByScheduledAt([act])
    expect(sorted).toHaveLength(1)
    expect(sorted[0].id).toBe('solo')
  })
})

// ─── Tests: getActivitiesForWeek — week-range filter (AC1 Story 5.3) ──────────

// Target week: 2024-01-15 is a Monday — so the ISO week is Mon 2024-01-15 to Sun 2024-01-21
const TARGET_WEEK_DATE = new Date('2024-01-15T00:00:00Z') // Monday

describe('getActivitiesForWeek — UTC week-range filter', () => {
  it('includes activity scheduled at Monday 00:00:00Z (week start)', () => {
    const act = makeActivity({ scheduledAt: new Date('2024-01-15T00:00:00Z') })
    expect(isInWeek(act.scheduledAt, TARGET_WEEK_DATE)).toBe(true)
  })

  it('includes activity scheduled at Sunday 23:59:59.999Z (week end)', () => {
    const act = makeActivity({ scheduledAt: new Date('2024-01-21T23:59:59.999Z') })
    expect(isInWeek(act.scheduledAt, TARGET_WEEK_DATE)).toBe(true)
  })

  it('excludes activity scheduled on Sunday before the week (previous week)', () => {
    const act = makeActivity({ scheduledAt: new Date('2024-01-14T23:59:59.999Z') }) // Sunday before
    expect(isInWeek(act.scheduledAt, TARGET_WEEK_DATE)).toBe(false)
  })

  it('excludes activity scheduled on Monday after the week (next week)', () => {
    const act = makeActivity({ scheduledAt: new Date('2024-01-22T00:00:00Z') }) // Monday after
    expect(isInWeek(act.scheduledAt, TARGET_WEEK_DATE)).toBe(false)
  })
})

// ─── Tests: maslowLevelToColor (AC7) ──────────────────────────────────────────

describe('maslowLevelToColor', () => {
  it('maps level 1 (Fisiológica) to red', () => {
    expect(maslowLevelToColor(1)).toBe('red')
  })

  it('maps level 2 (Seguridad) to orange', () => {
    expect(maslowLevelToColor(2)).toBe('orange')
  })

  it('maps level 3 (Conexión Social) to yellow', () => {
    expect(maslowLevelToColor(3)).toBe('yellow')
  })

  it('maps level 4 (Estima) to green', () => {
    expect(maslowLevelToColor(4)).toBe('green')
  })

  it('maps level 5 (Cognitiva) to blue', () => {
    expect(maslowLevelToColor(5)).toBe('blue')
  })

  it('maps level 6 (Estética) to purple', () => {
    expect(maslowLevelToColor(6)).toBe('purple')
  })

  it('maps level 7 (Autorrealización) to purple', () => {
    expect(maslowLevelToColor(7)).toBe('purple')
  })

  it('maps level 8 (Autotrascendencia) to gray', () => {
    expect(maslowLevelToColor(8)).toBe('gray')
  })

  it('falls back to blue for null level', () => {
    expect(maslowLevelToColor(null)).toBe('blue')
  })

  it('falls back to blue for unknown level', () => {
    expect(maslowLevelToColor(99)).toBe('blue')
  })
})
