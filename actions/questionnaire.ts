'use server'

import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { areas, areaScores } from '@/lib/db/schema'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { QUESTIONNAIRE } from '@/features/maslow/questionnaire'
import type { MaslowLevel } from '@/lib/utils/maslow-weights'

/**
 * Seeds the 8 Maslow areas for a user.
 * Uses upsert (onConflictDoNothing) — safe to call multiple times.
 */
export async function seedUserAreas(
  userId: string
): Promise<{ areaIds: Record<MaslowLevel, string> }> {
  const areasToInsert = QUESTIONNAIRE.map((q) => ({
    userId,
    maslowLevel: q.level,
    group: q.group,
    name: q.name,
    defaultName: q.defaultName,
    weightMultiplier: q.weightMultiplier,
    currentScore: 0,
  }))

  await db.insert(areas).values(areasToInsert).onConflictDoNothing()

  // Fetch the inserted/existing areas to get their IDs
  const userAreas = await db.select().from(areas).where(eq(areas.userId, userId))

  const areaIds = {} as Record<MaslowLevel, string>
  for (const area of userAreas) {
    areaIds[area.maslowLevel as MaslowLevel] = area.id
  }

  return { areaIds }
}

/**
 * Saves area scores from the diagnostic questionnaire.
 * Inserts area_scores snapshot and updates areas.current_score.
 */
export async function saveAreaScores(
  userId: string,
  areaIds: Record<MaslowLevel, string>,
  scores: Record<MaslowLevel, number>
): Promise<{ error: string | null }> {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const levels = Object.keys(scores).map(Number) as MaslowLevel[]

    // Insert area_scores snapshots
    const scoresToInsert = levels.map((level) => ({
      areaId: areaIds[level],
      userId,
      score: Math.round(scores[level]),
      scoredAt: today,
    }))

    await db.insert(areaScores).values(scoresToInsert).onConflictDoNothing()

    // Update areas.current_score for each area
    for (const level of levels) {
      await db
        .update(areas)
        .set({ currentScore: Math.round(scores[level]), updatedAt: new Date() })
        .where(and(eq(areas.id, areaIds[level]), eq(areas.userId, userId)))
    }

    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { error: message }
  }
}

/**
 * Marks onboarding as completed in Supabase Auth user_metadata.
 * Called after all scores are saved successfully.
 */
export async function completeOnboarding(): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({
    data: { onboarding_completed: true },
  })

  if (error) return { error: error.message }
  return { error: null }
}
