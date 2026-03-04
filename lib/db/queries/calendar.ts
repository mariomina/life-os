// lib/db/queries/calendar.ts
// Calendar-specific queries for fetching activities by date range.
// Used by the Calendar Server Component (app/(app)/calendar/page.tsx).

import { eq, and, gte, lte, asc } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { areas } from '@/lib/db/schema/areas'
import { habits } from '@/lib/db/schema/habits'
import { calendars } from '@/lib/db/schema/calendars'
import type { TEventColor } from '@/lib/calendar/calendar-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityForCalendar {
  id: string
  title: string
  description: string | null
  scheduledAt: Date
  scheduledDurationMinutes: number | null
  status: string
  planned: boolean
  areaName: string | null
  areaColor: TEventColor
  habitTitle: string | null
  habitId: string | null
  calendarId: string | null
  calendarColor: string | null // hex — tiene precedencia sobre areaColor en la UI
  calendarName: string | null
}

// ─── Color mapping ────────────────────────────────────────────────────────────

/**
 * Derives a TEventColor from a Maslow area level (1–8).
 * D-Needs (1-4): physiological/security needs → warm colors
 * B-Needs (5-8): growth needs → cool colors
 */
export function maslowLevelToColor(level: number | null): TEventColor {
  switch (level) {
    case 1:
      return 'red' // Fisiológica — critical survival
    case 2:
      return 'orange' // Seguridad — safety needs
    case 3:
      return 'yellow' // Conexión Social — belonging
    case 4:
      return 'green' // Estima — esteem
    case 5:
      return 'blue' // Cognitiva — intellectual
    case 6:
      return 'purple' // Estética — aesthetic
    case 7:
      return 'purple' // Autorrealización — self-actualization
    case 8:
      return 'gray' // Autotrascendencia — transcendence
    default:
      return 'blue' // fallback
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all steps_activities for a user scheduled within the given day (UTC boundaries).
 * Joins areas (for name + maslow color) and habits (for title).
 * Orders by scheduledAt ASC.
 *
 * @param userId - The authenticated user's UUID
 * @param date   - Any moment within the target day (UTC day boundaries are used)
 */
export async function getActivitiesForDay(
  userId: string,
  date: Date
): Promise<ActivityForCalendar[]> {
  assertDatabaseUrl()

  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)

  const dayEnd = new Date(date)
  dayEnd.setUTCHours(23, 59, 59, 999)

  const rows = await db
    .select({
      activity: stepsActivities,
      areaName: areas.name,
      areaLevel: areas.maslowLevel,
      habitTitle: habits.title,
      calendarId: calendars.id,
      calendarColor: calendars.color,
      calendarName: calendars.name,
    })
    .from(stepsActivities)
    .leftJoin(areas, eq(stepsActivities.areaId, areas.id))
    .leftJoin(habits, eq(stepsActivities.habitId, habits.id))
    .leftJoin(calendars, eq(stepsActivities.calendarId, calendars.id))
    .where(
      and(
        eq(stepsActivities.userId, userId),
        gte(stepsActivities.scheduledAt, dayStart),
        lte(stepsActivities.scheduledAt, dayEnd)
      )
    )
    .orderBy(asc(stepsActivities.scheduledAt))

  return rows.map((row) => ({
    id: row.activity.id,
    title: row.activity.title,
    description: row.activity.description ?? null,
    scheduledAt: row.activity.scheduledAt!,
    scheduledDurationMinutes: row.activity.scheduledDurationMinutes,
    status: row.activity.status,
    planned: row.activity.planned,
    areaName: row.areaName ?? null,
    areaColor: maslowLevelToColor(row.areaLevel ?? null),
    habitTitle: row.habitTitle ?? null,
    habitId: row.activity.habitId,
    calendarId: row.calendarId ?? null,
    calendarColor: row.calendarColor ?? null,
    calendarName: row.calendarName ?? null,
  }))
}

/**
 * Returns all steps_activities for a user scheduled within the ISO week (Mon–Sun, UTC boundaries)
 * that contains the given date. Shares the same interface as getActivitiesForDay.
 * Joins areas (for name + maslow color) and habits (for title).
 * Orders by scheduledAt ASC.
 *
 * @param userId - The authenticated user's UUID
 * @param date   - Any moment within the target week (ISO week boundaries are used)
 */
export async function getActivitiesForWeek(
  userId: string,
  date: Date
): Promise<ActivityForCalendar[]> {
  assertDatabaseUrl()

  // Compute ISO week boundaries in UTC (Mon 00:00:00Z – Sun 23:59:59.999Z).
  // Using UTC arithmetic directly avoids server-timezone drift from date-fns local helpers.
  const utcDay = date.getUTCDay() // 0=Sun, 1=Mon... 6=Sat
  const daysFromMonday = (utcDay + 6) % 7 // ISO: Mon=0 ... Sun=6
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

  const rows = await db
    .select({
      activity: stepsActivities,
      areaName: areas.name,
      areaLevel: areas.maslowLevel,
      habitTitle: habits.title,
      calendarId: calendars.id,
      calendarColor: calendars.color,
      calendarName: calendars.name,
    })
    .from(stepsActivities)
    .leftJoin(areas, eq(stepsActivities.areaId, areas.id))
    .leftJoin(habits, eq(stepsActivities.habitId, habits.id))
    .leftJoin(calendars, eq(stepsActivities.calendarId, calendars.id))
    .where(
      and(
        eq(stepsActivities.userId, userId),
        gte(stepsActivities.scheduledAt, rangeStart),
        lte(stepsActivities.scheduledAt, rangeEnd)
      )
    )
    .orderBy(asc(stepsActivities.scheduledAt))

  return rows.map((row) => ({
    id: row.activity.id,
    title: row.activity.title,
    description: row.activity.description ?? null,
    scheduledAt: row.activity.scheduledAt!,
    scheduledDurationMinutes: row.activity.scheduledDurationMinutes,
    status: row.activity.status,
    planned: row.activity.planned,
    areaName: row.areaName ?? null,
    areaColor: maslowLevelToColor(row.areaLevel ?? null),
    habitTitle: row.habitTitle ?? null,
    habitId: row.activity.habitId,
    calendarId: row.calendarId ?? null,
    calendarColor: row.calendarColor ?? null,
    calendarName: row.calendarName ?? null,
  }))
}

/**
 * Returns all steps_activities for a user scheduled within the calendar month (UTC boundaries)
 * that contains the given date. Shares the same interface as getActivitiesForDay/Week.
 * Joins areas (for name + maslow color) and habits (for title).
 * Orders by scheduledAt ASC.
 *
 * Uses Date.UTC() arithmetic directly — avoids date-fns local timezone drift (Story 5.3 gotcha).
 * Date.UTC(year, month+1, 0) resolves to the last day of `month` (standard JS trick).
 *
 * @param userId - The authenticated user's UUID
 * @param date   - Any moment within the target month (UTC month boundaries are used)
 */
export async function getActivitiesForMonth(
  userId: string,
  date: Date
): Promise<ActivityForCalendar[]> {
  assertDatabaseUrl()

  // Compute month boundaries in UTC.
  // Month: day 1 00:00:00.000Z – last day 23:59:59.999Z
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() // 0-indexed

  const rangeStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
  // Date.UTC(year, month+1, 0) = last day of `month` (day 0 of next month rolls back)
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const rangeEnd = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999))

  const rows = await db
    .select({
      activity: stepsActivities,
      areaName: areas.name,
      areaLevel: areas.maslowLevel,
      habitTitle: habits.title,
      calendarId: calendars.id,
      calendarColor: calendars.color,
      calendarName: calendars.name,
    })
    .from(stepsActivities)
    .leftJoin(areas, eq(stepsActivities.areaId, areas.id))
    .leftJoin(habits, eq(stepsActivities.habitId, habits.id))
    .leftJoin(calendars, eq(stepsActivities.calendarId, calendars.id))
    .where(
      and(
        eq(stepsActivities.userId, userId),
        gte(stepsActivities.scheduledAt, rangeStart),
        lte(stepsActivities.scheduledAt, rangeEnd)
      )
    )
    .orderBy(asc(stepsActivities.scheduledAt))

  return rows.map((row) => ({
    id: row.activity.id,
    title: row.activity.title,
    description: row.activity.description ?? null,
    scheduledAt: row.activity.scheduledAt!,
    scheduledDurationMinutes: row.activity.scheduledDurationMinutes,
    status: row.activity.status,
    planned: row.activity.planned,
    areaName: row.areaName ?? null,
    areaColor: maslowLevelToColor(row.areaLevel ?? null),
    habitTitle: row.habitTitle ?? null,
    habitId: row.activity.habitId,
    calendarId: row.calendarId ?? null,
    calendarColor: row.calendarColor ?? null,
    calendarName: row.calendarName ?? null,
  }))
}

// ─── Free Slot Types ──────────────────────────────────────────────────────────

export interface FreeSlot {
  start: Date
  end: Date
  durationMinutes: number
}

/**
 * Returns all steps_activities for a user scheduled within an explicit date range.
 * Used by getFreeSlots to detect calendar gaps. Orders by scheduledAt ASC.
 *
 * @param userId    - The authenticated user's UUID
 * @param startDate - Range start (inclusive)
 * @param endDate   - Range end (inclusive)
 */
export async function getActivitiesForRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ActivityForCalendar[]> {
  assertDatabaseUrl()

  const rows = await db
    .select({
      activity: stepsActivities,
      areaName: areas.name,
      areaLevel: areas.maslowLevel,
      habitTitle: habits.title,
      calendarId: calendars.id,
      calendarColor: calendars.color,
      calendarName: calendars.name,
    })
    .from(stepsActivities)
    .leftJoin(areas, eq(stepsActivities.areaId, areas.id))
    .leftJoin(habits, eq(stepsActivities.habitId, habits.id))
    .leftJoin(calendars, eq(stepsActivities.calendarId, calendars.id))
    .where(
      and(
        eq(stepsActivities.userId, userId),
        gte(stepsActivities.scheduledAt, startDate),
        lte(stepsActivities.scheduledAt, endDate)
      )
    )
    .orderBy(asc(stepsActivities.scheduledAt))

  return rows.map((row) => ({
    id: row.activity.id,
    title: row.activity.title,
    description: row.activity.description ?? null,
    scheduledAt: row.activity.scheduledAt!,
    scheduledDurationMinutes: row.activity.scheduledDurationMinutes,
    status: row.activity.status,
    planned: row.activity.planned,
    areaName: row.areaName ?? null,
    areaColor: maslowLevelToColor(row.areaLevel ?? null),
    habitTitle: row.habitTitle ?? null,
    habitId: row.activity.habitId,
    calendarId: row.calendarId ?? null,
    calendarColor: row.calendarColor ?? null,
    calendarName: row.calendarName ?? null,
  }))
}

/**
 * Calculates free time slots in the user's calendar within the given date range.
 * Works day by day within a 08:00–22:00 UTC window, finding gaps between activities.
 *
 * @param userId              - The authenticated user's UUID
 * @param startDate           - Range start (uses UTC date)
 * @param endDate             - Range end (uses UTC date)
 * @param minDurationMinutes  - Minimum gap size to consider (default: 30 min)
 * @returns Sorted array of free slots with start, end and duration
 */
export async function getFreeSlots(
  userId: string,
  startDate: Date,
  endDate: Date,
  minDurationMinutes = 30
): Promise<FreeSlot[]> {
  const activities = await getActivitiesForRange(userId, startDate, endDate)
  const freeSlots: FreeSlot[] = []

  // Iterate day by day over the range (UTC dates)
  const rangeStart = new Date(startDate)
  rangeStart.setUTCHours(0, 0, 0, 0)
  const rangeEnd = new Date(endDate)
  rangeEnd.setUTCHours(23, 59, 59, 999)

  const current = new Date(rangeStart)
  while (current <= rangeEnd) {
    const dayStr = current.toISOString().slice(0, 10) // 'YYYY-MM-DD'
    const year = parseInt(dayStr.slice(0, 4))
    const month = parseInt(dayStr.slice(5, 7)) - 1
    const day = parseInt(dayStr.slice(8, 10))

    // Day window: 08:00–22:00 UTC
    const windowStart = new Date(Date.UTC(year, month, day, 8, 0, 0, 0))
    const windowEnd = new Date(Date.UTC(year, month, day, 22, 0, 0, 0))

    // Activities that overlap this day's window
    const dayActivities = activities.filter((a) => {
      const aStart = a.scheduledAt
      const aDuration = a.scheduledDurationMinutes ?? 30
      const aEnd = new Date(aStart.getTime() + aDuration * 60_000)
      return aStart < windowEnd && aEnd > windowStart
    })

    // Build sorted list of busy intervals clipped to the day window
    const busyIntervals = dayActivities
      .map((a) => {
        const aStart = a.scheduledAt
        const aDuration = a.scheduledDurationMinutes ?? 30
        const aEnd = new Date(aStart.getTime() + aDuration * 60_000)
        return {
          start: aStart < windowStart ? windowStart : aStart,
          end: aEnd > windowEnd ? windowEnd : aEnd,
        }
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    // Find gaps between busy intervals
    let cursor = windowStart
    for (const busy of busyIntervals) {
      if (busy.start > cursor) {
        const durationMs = busy.start.getTime() - cursor.getTime()
        const durationMin = Math.floor(durationMs / 60_000)
        if (durationMin >= minDurationMinutes) {
          freeSlots.push({
            start: new Date(cursor),
            end: new Date(busy.start),
            durationMinutes: durationMin,
          })
        }
      }
      if (busy.end > cursor) cursor = busy.end
    }
    // Gap after last activity to window end
    if (cursor < windowEnd) {
      const durationMs = windowEnd.getTime() - cursor.getTime()
      const durationMin = Math.floor(durationMs / 60_000)
      if (durationMin >= minDurationMinutes) {
        freeSlots.push({
          start: new Date(cursor),
          end: new Date(windowEnd),
          durationMinutes: durationMin,
        })
      }
    }

    // Advance to next day
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return freeSlots
}

/**
 * Returns all steps_activities for a user scheduled within the calendar year (UTC boundaries)
 * that contains the given date. Shares the same interface as getActivitiesForDay/Week/Month.
 * Joins areas (for name + maslow color) and habits (for title).
 * Orders by scheduledAt ASC.
 *
 * Uses Date.UTC() arithmetic directly — avoids date-fns local timezone drift (Story 5.3 gotcha).
 *
 * @param userId - The authenticated user's UUID
 * @param date   - Any moment within the target year (UTC year boundaries are used)
 */
export async function getActivitiesForYear(
  userId: string,
  date: Date
): Promise<ActivityForCalendar[]> {
  assertDatabaseUrl()

  // Compute year boundaries in UTC.
  // Year: Jan 1 00:00:00.000Z – Dec 31 23:59:59.999Z
  const year = date.getUTCFullYear()

  const rangeStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)) // Jan 1
  const rangeEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) // Dec 31

  const rows = await db
    .select({
      activity: stepsActivities,
      areaName: areas.name,
      areaLevel: areas.maslowLevel,
      habitTitle: habits.title,
      calendarId: calendars.id,
      calendarColor: calendars.color,
      calendarName: calendars.name,
    })
    .from(stepsActivities)
    .leftJoin(areas, eq(stepsActivities.areaId, areas.id))
    .leftJoin(habits, eq(stepsActivities.habitId, habits.id))
    .leftJoin(calendars, eq(stepsActivities.calendarId, calendars.id))
    .where(
      and(
        eq(stepsActivities.userId, userId),
        gte(stepsActivities.scheduledAt, rangeStart),
        lte(stepsActivities.scheduledAt, rangeEnd)
      )
    )
    .orderBy(asc(stepsActivities.scheduledAt))

  return rows.map((row) => ({
    id: row.activity.id,
    title: row.activity.title,
    description: row.activity.description ?? null,
    scheduledAt: row.activity.scheduledAt!,
    scheduledDurationMinutes: row.activity.scheduledDurationMinutes,
    status: row.activity.status,
    planned: row.activity.planned,
    areaName: row.areaName ?? null,
    areaColor: maslowLevelToColor(row.areaLevel ?? null),
    habitTitle: row.habitTitle ?? null,
    habitId: row.activity.habitId,
    calendarId: row.calendarId ?? null,
    calendarColor: row.calendarColor ?? null,
    calendarName: row.calendarName ?? null,
  }))
}
