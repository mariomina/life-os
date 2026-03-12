import { eq, asc, and, gte, desc } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { areas, areaSubareas } from '@/lib/db/schema'
import { areaScores } from '@/lib/db/schema/area-scores'
import { MASLOW_WEIGHTS, MASLOW_TOTAL_WEIGHT, type MaslowLevel } from '@/lib/utils/maslow-weights'
import type { Area } from '@/lib/db/schema/areas'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'

export async function getUserAreas(userId: string): Promise<Area[]> {
  assertDatabaseUrl()
  return db.select().from(areas).where(eq(areas.userId, userId)).orderBy(asc(areas.maslowLevel))
}

/** Returns active sub-areas for a specific area, ordered by display (impact) order. */
export async function getSubareasByArea(areaId: string): Promise<AreaSubarea[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(areaSubareas)
    .where(and(eq(areaSubareas.areaId, areaId), eq(areaSubareas.isActive, true)))
    .orderBy(asc(areaSubareas.displayOrder))
}

/** Returns all active sub-areas for a user across all Maslow levels. */
export async function getSubareasByUser(userId: string): Promise<AreaSubarea[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(areaSubareas)
    .where(and(eq(areaSubareas.userId, userId), eq(areaSubareas.isActive, true)))
    .orderBy(asc(areaSubareas.maslowLevel), asc(areaSubareas.displayOrder))
}

// ─── Story 11.6 — UI /areas queries ───────────────────────────────────────────

export interface AreaWithSubareas extends Area {
  /** Top 3 sub-areas by internalWeight (highest first) */
  topSubareas: AreaSubarea[]
  /** Total active subareas count */
  subareaCount: number
}

/**
 * Returns all areas for a user with their top 3 sub-areas by internal weight.
 * Used by the /areas page grid.
 */
export async function getAreasWithSubareas(userId: string): Promise<AreaWithSubareas[]> {
  assertDatabaseUrl()

  const [userAreas, allSubareas] = await Promise.all([
    db.select().from(areas).where(eq(areas.userId, userId)).orderBy(asc(areas.maslowLevel)),
    db
      .select()
      .from(areaSubareas)
      .where(and(eq(areaSubareas.userId, userId), eq(areaSubareas.isActive, true)))
      .orderBy(desc(areaSubareas.internalWeight)),
  ])

  const subareasByArea = new Map<string, AreaSubarea[]>()
  for (const sub of allSubareas) {
    const existing = subareasByArea.get(sub.areaId) ?? []
    existing.push(sub)
    subareasByArea.set(sub.areaId, existing)
  }

  return userAreas.map((area) => {
    const subs = subareasByArea.get(area.id) ?? []
    return {
      ...area,
      topSubareas: subs.slice(0, 3),
      subareaCount: subs.length,
    }
  })
}

export interface GLSHSPoint {
  /** YYYY-MM-DD */
  date: string
  /** Weighted GLSHS 0-100 */
  score: number
}

/**
 * Returns daily GLSHS history for the last `days` calendar days.
 * GLSHS = Σ(area_score × maslow_weight) / MASLOW_TOTAL_WEIGHT
 *
 * Only dates with scores for all areas present are included (partial days excluded).
 * If no data, returns [].
 */
export async function getGLSHSHistory(userId: string, days = 30): Promise<GLSHSPoint[]> {
  assertDatabaseUrl()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [userAreas, scores] = await Promise.all([
    db
      .select({ id: areas.id, maslowLevel: areas.maslowLevel })
      .from(areas)
      .where(eq(areas.userId, userId)),
    db
      .select({ areaId: areaScores.areaId, score: areaScores.score, scoredAt: areaScores.scoredAt })
      .from(areaScores)
      .where(and(eq(areaScores.userId, userId), gte(areaScores.scoredAt, cutoffStr)))
      .orderBy(asc(areaScores.scoredAt)),
  ])

  if (userAreas.length === 0 || scores.length === 0) return []

  const areaLevelMap = new Map(userAreas.map((a) => [a.id, a.maslowLevel as MaslowLevel]))

  // Group scores by date
  const byDate = new Map<string, Map<string, number>>()
  for (const s of scores) {
    const dateStr = s.scoredAt
    if (!byDate.has(dateStr)) byDate.set(dateStr, new Map())
    byDate.get(dateStr)!.set(s.areaId, s.score)
  }

  const result: GLSHSPoint[] = []
  for (const [date, scoreMap] of byDate) {
    let weightedSum = 0
    let totalWeight = 0
    for (const [areaId, score] of scoreMap) {
      const level = areaLevelMap.get(areaId)
      if (!level) continue
      const weight = MASLOW_WEIGHTS[level]
      weightedSum += score * weight
      totalWeight += weight
    }
    if (totalWeight === 0) continue
    // Use actual areas present for the day (not full MASLOW_TOTAL_WEIGHT if partial data)
    const glshs = Math.round(
      (weightedSum / MASLOW_TOTAL_WEIGHT) * (MASLOW_TOTAL_WEIGHT / totalWeight)
    )
    result.push({ date, score: Math.min(100, Math.max(0, glshs)) })
  }

  return result
}
