// lib/db/queries/calendar.ts
// Calendar-specific queries for fetching activities by date range.
// Used by the Calendar Server Component (app/(app)/calendar/page.tsx).

import { eq, and, gte, lte, asc } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { areas } from '@/lib/db/schema/areas'
import { habits } from '@/lib/db/schema/habits'
import type { TEventColor } from '@/lib/calendar/calendar-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityForCalendar {
  id: string
  title: string
  scheduledAt: Date
  scheduledDurationMinutes: number | null
  status: string
  areaName: string | null
  areaColor: TEventColor
  habitTitle: string | null
  habitId: string | null
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
    })
    .from(stepsActivities)
    .leftJoin(areas, eq(stepsActivities.areaId, areas.id))
    .leftJoin(habits, eq(stepsActivities.habitId, habits.id))
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
    scheduledAt: row.activity.scheduledAt!,
    scheduledDurationMinutes: row.activity.scheduledDurationMinutes,
    status: row.activity.status,
    areaName: row.areaName ?? null,
    areaColor: maslowLevelToColor(row.areaLevel ?? null),
    habitTitle: row.habitTitle ?? null,
    habitId: row.activity.habitId,
  }))
}
