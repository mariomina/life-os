import { eq, sum } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { timeEntries, stepsActivities } from '@/lib/db/schema'

/**
 * Returns total time invested per area (in seconds) for a user.
 * Uses a single JOIN + GROUP BY — no N+1.
 * Areas with no time entries are not included (caller should default to 0).
 */
export async function getTimeInvestedByArea(userId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({
      areaId: stepsActivities.areaId,
      totalSeconds: sum(timeEntries.durationSeconds).mapWith(Number),
    })
    .from(timeEntries)
    .innerJoin(stepsActivities, eq(timeEntries.stepActivityId, stepsActivities.id))
    .where(eq(timeEntries.userId, userId))
    .groupBy(stepsActivities.areaId)

  const map: Record<string, number> = {}
  for (const row of rows) {
    if (row.areaId) map[row.areaId] = row.totalSeconds ?? 0
  }
  return map
}
