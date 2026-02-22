import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { areaScores } from '@/lib/db/schema'
import type { AreaScore } from '@/lib/db/schema/area-scores'

/**
 * Returns the most recent area score records for a user.
 * Fetches up to `limit` days × 8 areas in a single query.
 */
export async function getRecentAreaScores(userId: string, days = 7): Promise<AreaScore[]> {
  return db
    .select()
    .from(areaScores)
    .where(eq(areaScores.userId, userId))
    .orderBy(desc(areaScores.scoredAt))
    .limit(days * 8)
}
