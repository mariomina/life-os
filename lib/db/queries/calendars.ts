// lib/db/queries/calendars.ts
// Queries para la tabla calendars — Epic 10: Calendarios Personalizados.

import { eq, and, count, gte, lte, isNull, sql } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { calendars } from '@/lib/db/schema/calendars'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { timeEntries } from '@/lib/db/schema/time-entries'
import type { Calendar, NewCalendar } from '@/lib/db/schema/calendars'

export type { Calendar, NewCalendar }

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Returns all calendars for a user, ordered by created_at ASC.
 */
export async function getCalendarsForUser(userId: string): Promise<Calendar[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(calendars)
    .where(eq(calendars.userId, userId))
    .orderBy(calendars.createdAt)
}

/**
 * Returns a single calendar by id, verifying ownership.
 * Returns null if not found or not owned by userId.
 */
export async function getCalendarById(
  userId: string,
  calendarId: string
): Promise<Calendar | null> {
  assertDatabaseUrl()
  const rows = await db
    .select()
    .from(calendars)
    .where(and(eq(calendars.id, calendarId), eq(calendars.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

// ─── Write ───────────────────────────────────────────────────────────────────

/**
 * Creates a new calendar for the user.
 */
export async function createCalendar(
  userId: string,
  data: { name: string; color: string; isDefault?: boolean }
): Promise<Calendar> {
  assertDatabaseUrl()
  const rows = await db
    .insert(calendars)
    .values({
      userId,
      name: data.name,
      color: data.color,
      isDefault: data.isDefault ?? false,
    })
    .returning()
  return rows[0]
}

/**
 * Updates name and/or color of a calendar.
 * Verifies ownership via userId.
 */
export async function updateCalendar(
  userId: string,
  calendarId: string,
  data: { name?: string; color?: string }
): Promise<Calendar> {
  assertDatabaseUrl()
  const rows = await db
    .update(calendars)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.color !== undefined && { color: data.color }),
      updatedAt: new Date(),
    })
    .where(and(eq(calendars.id, calendarId), eq(calendars.userId, userId)))
    .returning()
  if (!rows[0]) throw new Error('Calendar not found or not owned by user')
  return rows[0]
}

/**
 * Deletes a calendar. Rejects if:
 * - calendar is default (is_default = true)
 * - calendar has associated activities
 */
export async function deleteCalendar(userId: string, calendarId: string): Promise<void> {
  assertDatabaseUrl()

  const cal = await getCalendarById(userId, calendarId)
  if (!cal) throw new Error('Calendar not found')
  if (cal.isDefault) throw new Error('No se puede eliminar el calendario por defecto')

  const [{ value: activityCount }] = await db
    .select({ value: count() })
    .from(stepsActivities)
    .where(eq(stepsActivities.calendarId, calendarId))

  if (Number(activityCount) > 0) {
    throw new Error(
      `Este calendario tiene ${activityCount} actividades asociadas. Reasígnalas antes de eliminarlo.`
    )
  }

  await db.delete(calendars).where(and(eq(calendars.id, calendarId), eq(calendars.userId, userId)))
}

// ─── Reporting ───────────────────────────────────────────────────────────────

export interface CalendarTimeData {
  calendarId: string | null
  calendarName: string
  calendarColor: string
  totalSeconds: number
  percentage: number
}

/**
 * Returns time spent per calendar within a date range, based on completed time_entries.
 * Includes a "Sin categoría" bucket for activities without a calendar.
 * Ordered by totalSeconds DESC.
 */
export async function getTimeByCalendar(
  userId: string,
  from: Date,
  to: Date
): Promise<CalendarTimeData[]> {
  assertDatabaseUrl()

  // Actividades con calendario
  const withCalendar = await db
    .select({
      calendarId: calendars.id,
      calendarName: calendars.name,
      calendarColor: calendars.color,
      totalSeconds: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`.as(
        'total_seconds'
      ),
    })
    .from(timeEntries)
    .innerJoin(stepsActivities, eq(timeEntries.stepActivityId, stepsActivities.id))
    .innerJoin(calendars, eq(stepsActivities.calendarId, calendars.id))
    .where(
      and(
        eq(timeEntries.userId, userId),
        eq(timeEntries.isActive, false),
        gte(timeEntries.startedAt, from),
        lte(timeEntries.startedAt, to)
      )
    )
    .groupBy(calendars.id, calendars.name, calendars.color)

  // Actividades sin calendario
  const [withoutCalendar] = await db
    .select({
      totalSeconds: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`.as(
        'total_seconds'
      ),
    })
    .from(timeEntries)
    .innerJoin(stepsActivities, eq(timeEntries.stepActivityId, stepsActivities.id))
    .where(
      and(
        eq(timeEntries.userId, userId),
        eq(timeEntries.isActive, false),
        isNull(stepsActivities.calendarId),
        gte(timeEntries.startedAt, from),
        lte(timeEntries.startedAt, to)
      )
    )

  const rows: CalendarTimeData[] = [
    ...withCalendar.map((r) => ({
      calendarId: r.calendarId,
      calendarName: r.calendarName,
      calendarColor: r.calendarColor,
      totalSeconds: Number(r.totalSeconds),
      percentage: 0,
    })),
    ...(Number(withoutCalendar?.totalSeconds ?? 0) > 0
      ? [
          {
            calendarId: null,
            calendarName: 'Sin categoría',
            calendarColor: '#9CA3AF',
            totalSeconds: Number(withoutCalendar.totalSeconds),
            percentage: 0,
          },
        ]
      : []),
  ]

  const grandTotal = rows.reduce((acc, r) => acc + r.totalSeconds, 0)
  if (grandTotal === 0) return []

  return rows
    .map((r) => ({
      ...r,
      percentage: Math.round((r.totalSeconds / grandTotal) * 100),
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
}
