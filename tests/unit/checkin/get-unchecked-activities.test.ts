import { describe, it, expect } from 'vitest'
import type { ActivityForCheckin } from '@/lib/db/queries/checkin'

// ─── Pure helpers extracted from getUncheckedActivities logic ────────────────

/** Mimics the day-range filter applied in the query */
function isScheduledOnDate(scheduledAt: Date | null, date: Date): boolean {
  if (!scheduledAt) return false
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setUTCHours(23, 59, 59, 999)
  return scheduledAt >= dayStart && scheduledAt <= dayEnd
}

/** Mimics the notExists dedup filter */
function hasCheckinResponse(
  activityId: string,
  checkinDateStr: string,
  responses: Array<{ stepActivityId: string; checkinDate: string }>
): boolean {
  return responses.some((r) => r.stepActivityId === activityId && r.checkinDate === checkinDateStr)
}

/** Mimics the ORDER BY: habits first, then scheduledAt ASC */
function sortActivities(activities: ActivityForCheckin[]): ActivityForCheckin[] {
  return [...activities].sort((a, b) => {
    const aIsHabit = a.habitId !== null ? 1 : 0
    const bIsHabit = b.habitId !== null ? 1 : 0
    if (bIsHabit !== aIsHabit) return bIsHabit - aIsHabit // habits first (desc)
    const aTime = a.scheduledAt?.getTime() ?? 0
    const bTime = b.scheduledAt?.getTime() ?? 0
    return aTime - bTime // then scheduledAt asc
  })
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const YESTERDAY = new Date('2024-01-14T00:00:00Z')
const YESTERDAY_STR = '2024-01-14'

function makeActivity(overrides: Partial<ActivityForCheckin>): ActivityForCheckin {
  return {
    id: 'act-1',
    userId: 'user-1',
    taskId: null,
    areaId: null,
    subareaId: null,
    habitId: null,
    title: 'Test activity',
    description: null,
    executorType: 'human',
    planned: true,
    aiAgent: null,
    verificationCriteria: null,
    status: 'pending',
    scheduledAt: new Date('2024-01-14T08:00:00Z'),
    scheduledDurationMinutes: null,
    completedAt: null,
    order: null,
    okrId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    areaName: null,
    areaLevel: null,
    habitTitle: null,
    calendarId: null,
    recurrenceGroupId: null,
    recurrenceType: null,
    ...overrides,
  }
}

// ─── Tests: day-range filter ─────────────────────────────────────────────────

describe('getUncheckedActivities — day-range filter', () => {
  it('includes activities scheduled within the given date (UTC)', () => {
    const act = makeActivity({ scheduledAt: new Date('2024-01-14T07:00:00Z') })
    expect(isScheduledOnDate(act.scheduledAt, YESTERDAY)).toBe(true)
  })

  it('excludes activities scheduled on a different date', () => {
    const actToday = makeActivity({ scheduledAt: new Date('2024-01-15T00:00:00Z') })
    const actTwoDaysAgo = makeActivity({ scheduledAt: new Date('2024-01-13T23:59:59Z') })
    expect(isScheduledOnDate(actToday.scheduledAt, YESTERDAY)).toBe(false)
    expect(isScheduledOnDate(actTwoDaysAgo.scheduledAt, YESTERDAY)).toBe(false)
  })

  it('returns false for activities with no scheduledAt', () => {
    expect(isScheduledOnDate(null, YESTERDAY)).toBe(false)
  })
})

// ─── Tests: deduplication via checkin_responses ───────────────────────────────

describe('getUncheckedActivities — checkin_responses deduplication', () => {
  it('excludes activities that already have a checkin_response for that date', () => {
    const responses = [{ stepActivityId: 'act-1', checkinDate: YESTERDAY_STR }]
    expect(hasCheckinResponse('act-1', YESTERDAY_STR, responses)).toBe(true)
  })

  it('includes activities with no matching checkin_response', () => {
    const responses = [{ stepActivityId: 'act-2', checkinDate: YESTERDAY_STR }]
    expect(hasCheckinResponse('act-1', YESTERDAY_STR, responses)).toBe(false)
  })

  it('excludes based on exact date match — different date does not count', () => {
    const responses = [{ stepActivityId: 'act-1', checkinDate: '2024-01-13' }]
    expect(hasCheckinResponse('act-1', YESTERDAY_STR, responses)).toBe(false)
  })
})

// ─── Tests: ordering ─────────────────────────────────────────────────────────

describe('getUncheckedActivities — ordering: habits first, then scheduledAt ASC', () => {
  it('places habit activities before non-habit activities', () => {
    const habit = makeActivity({
      id: 'act-habit',
      habitId: 'habit-1',
      scheduledAt: new Date('2024-01-14T20:00:00Z'), // late time
    })
    const nonHabit = makeActivity({
      id: 'act-plain',
      habitId: null,
      scheduledAt: new Date('2024-01-14T06:00:00Z'), // early time
    })

    const sorted = sortActivities([nonHabit, habit])
    expect(sorted[0].id).toBe('act-habit')
    expect(sorted[1].id).toBe('act-plain')
  })

  it('within habit group, sorts by scheduledAt ASC', () => {
    const habit1 = makeActivity({
      id: 'habit-morning',
      habitId: 'h-1',
      scheduledAt: new Date('2024-01-14T07:00:00Z'),
    })
    const habit2 = makeActivity({
      id: 'habit-evening',
      habitId: 'h-2',
      scheduledAt: new Date('2024-01-14T19:00:00Z'),
    })

    const sorted = sortActivities([habit2, habit1])
    expect(sorted[0].id).toBe('habit-morning')
    expect(sorted[1].id).toBe('habit-evening')
  })

  it('within non-habit group, sorts by scheduledAt ASC', () => {
    const act1 = makeActivity({
      id: 'act-early',
      habitId: null,
      scheduledAt: new Date('2024-01-14T09:00:00Z'),
    })
    const act2 = makeActivity({
      id: 'act-late',
      habitId: null,
      scheduledAt: new Date('2024-01-14T17:00:00Z'),
    })

    const sorted = sortActivities([act2, act1])
    expect(sorted[0].id).toBe('act-early')
    expect(sorted[1].id).toBe('act-late')
  })
})
