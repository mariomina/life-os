// lib/db/queries/checkin.ts
// Read queries for daily check-in accountability.
// Returns pending activities from the previous day that have not yet been answered.

import { eq, and, gte, lte, desc, asc, isNotNull, notExists } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { checkinResponses } from '@/lib/db/schema/checkin-responses'
import { areas } from '@/lib/db/schema/areas'
import { habits } from '@/lib/db/schema/habits'
import type { StepActivity } from '@/lib/db/schema/steps-activities'

export interface ActivityForCheckin extends StepActivity {
  areaName: string | null
  areaLevel: number | null
  habitTitle: string | null
}

/**
 * Returns all pending activities scheduled on `date` that have not yet received
 * a check-in response for that date.
 *
 * Activities are ordered: habits first (habitId IS NOT NULL), then by scheduledAt ASC.
 *
 * Deduplication: uses a notExists subquery against checkin_responses
 * to exclude activities that already have a response for the given date.
 *
 * @param userId - The authenticated user's UUID
 * @param date   - The date to check (typically yesterday at UTC midnight)
 */
export async function getUncheckedActivities(
  userId: string,
  date: Date
): Promise<ActivityForCheckin[]> {
  assertDatabaseUrl()

  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)

  const dayEnd = new Date(date)
  dayEnd.setUTCHours(23, 59, 59, 999)

  // checkin_responses.checkin_date is a Postgres `date` column (stored as YYYY-MM-DD string)
  const checkinDateStr = date.toISOString().slice(0, 10)

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
        eq(stepsActivities.status, 'pending'),
        gte(stepsActivities.scheduledAt, dayStart),
        lte(stepsActivities.scheduledAt, dayEnd),
        notExists(
          db
            .select({ id: checkinResponses.id })
            .from(checkinResponses)
            .where(
              and(
                eq(checkinResponses.stepActivityId, stepsActivities.id),
                eq(checkinResponses.checkinDate, checkinDateStr)
              )
            )
        )
      )
    )
    .orderBy(desc(isNotNull(stepsActivities.habitId)), asc(stepsActivities.scheduledAt))

  return rows.map((row) => ({
    ...row.activity,
    areaName: row.areaName ?? null,
    areaLevel: row.areaLevel ?? null,
    habitTitle: row.habitTitle ?? null,
  }))
}
