import { eq, asc, and, gte, desc } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import {
  areas,
  areaSubareas,
  habits,
  stepsActivities,
  projects,
  okrs,
  areaSubareaScores,
} from '@/lib/db/schema'
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

// ─── Story 11.7 — Area Detail with Sources ────────────────────────────────────

export interface AreaSource {
  id: string
  type: 'habit' | 'activity' | 'project'
  title: string
  /** Habit: current streak days */
  streak?: number
  /** Habit: last completed date (YYYY-MM-DD) */
  lastCompletedAt?: string | null
  /** Activity: when it was completed */
  completedAt?: Date | null
  /** Project: KR progress 0-100 */
  progress?: number
  /** Direct link to the entity in its native view */
  href: string
}

export interface SubareaDetail extends AreaSubarea {
  sources: AreaSource[]
}

export interface AreaDetailWithSources extends Area {
  subareas: SubareaDetail[]
  /** Active projects linked to this area (proxy — projects have no subareaId) */
  areaProjects: AreaSource[]
  /** Daily score history for the area chart */
  scoreHistory: GLSHSPoint[]
}

/**
 * Returns full area detail with sub-areas and all sources (habits, activities, projects)
 * that cover each sub-area or the parent area.
 * Used by /areas/[slug] detail page.
 */
export async function getAreaDetailWithSources(
  userId: string,
  slug: string
): Promise<AreaDetailWithSources | null> {
  assertDatabaseUrl()

  // Step 1: Find area by slug
  const [area] = await db
    .select()
    .from(areas)
    .where(and(eq(areas.userId, userId), eq(areas.slug, slug)))
    .limit(1)

  if (!area) return null

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffScore = new Date()
  cutoffScore.setDate(cutoffScore.getDate() - 365)
  const cutoffScoreStr = cutoffScore.toISOString().slice(0, 10)

  // Step 2: Parallel queries for all sources
  const [subareas, habitRows, activityRows, projectRows, scoreRows] = await Promise.all([
    // All active sub-areas ordered by display order
    db
      .select()
      .from(areaSubareas)
      .where(and(eq(areaSubareas.areaId, area.id), eq(areaSubareas.isActive, true)))
      .orderBy(asc(areaSubareas.displayOrder)),

    // Active habits for this area
    db
      .select({
        id: habits.id,
        subareaId: habits.subareaId,
        title: habits.title,
        streakCurrent: habits.streakCurrent,
        lastCompletedAt: habits.lastCompletedAt,
      })
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.areaId, area.id), eq(habits.isActive, true))),

    // Completed activities in last 30d for this area
    db
      .select({
        id: stepsActivities.id,
        subareaId: stepsActivities.subareaId,
        title: stepsActivities.title,
        completedAt: stepsActivities.completedAt,
      })
      .from(stepsActivities)
      .where(
        and(
          eq(stepsActivities.userId, userId),
          eq(stepsActivities.areaId, area.id),
          eq(stepsActivities.status, 'completed'),
          gte(stepsActivities.completedAt, cutoff)
        )
      )
      .orderBy(desc(stepsActivities.completedAt))
      .limit(50),

    // Active projects linked to this area (via areaId or linked OKR's areaId)
    db
      .select({
        id: projects.id,
        title: projects.title,
        progress: okrs.progress,
      })
      .from(projects)
      .leftJoin(okrs, eq(projects.okrId, okrs.id))
      .where(
        and(
          eq(projects.userId, userId),
          eq(projects.areaId, area.id),
          eq(projects.status, 'active')
        )
      )
      .limit(10),

    // Area score history for chart (last 365 days)
    db
      .select({ score: areaScores.score, scoredAt: areaScores.scoredAt })
      .from(areaScores)
      .where(and(eq(areaScores.areaId, area.id), gte(areaScores.scoredAt, cutoffScoreStr)))
      .orderBy(asc(areaScores.scoredAt)),
  ])

  // Step 3: Group habits and activities by subareaId
  const habitsBySubarea = new Map<string, typeof habitRows>()
  for (const h of habitRows) {
    const sid = h.subareaId ?? '__area__'
    habitsBySubarea.set(sid, [...(habitsBySubarea.get(sid) ?? []), h])
  }

  const activitiesBySubarea = new Map<string, typeof activityRows>()
  for (const a of activityRows) {
    const sid = a.subareaId ?? '__area__'
    activitiesBySubarea.set(sid, [...(activitiesBySubarea.get(sid) ?? []), a])
  }

  // Step 4: Build SubareaDetail list
  const subareaDetails: SubareaDetail[] = subareas.map((sub) => {
    const subHabits = habitsBySubarea.get(sub.id) ?? []
    const subActivities = activitiesBySubarea.get(sub.id) ?? []

    const sources: AreaSource[] = [
      ...subHabits.map(
        (h): AreaSource => ({
          id: h.id,
          type: 'habit',
          title: h.title,
          streak: h.streakCurrent,
          lastCompletedAt: h.lastCompletedAt,
          href: '/habits',
        })
      ),
      ...subActivities.map(
        (a): AreaSource => ({
          id: a.id,
          type: 'activity',
          title: a.title,
          completedAt: a.completedAt,
          href: '/calendar',
        })
      ),
    ]

    return { ...sub, sources }
  })

  // Step 5: Area-level projects (proxy — no subareaId)
  const areaProjects: AreaSource[] = projectRows.map(
    (p): AreaSource => ({
      id: p.id,
      type: 'project',
      title: p.title,
      progress: p.progress ?? 0,
      href: `/projects/${p.id}`,
    })
  )

  // Step 6: Score history
  const scoreHistory: GLSHSPoint[] = scoreRows.map((r) => ({
    date: r.scoredAt,
    score: r.score,
  }))

  return { ...area, subareas: subareaDetails, areaProjects, scoreHistory }
}

// ─── Story 11.8 — Alert Engine Data ───────────────────────────────────────────

export interface AlertEngineData {
  /** Completed activities last 7 days, counted by subareaId */
  activitiesBySubarea: Record<string, number>
  /** Total completed activities last 7 days */
  totalActivities: number
  /** Daily scores for L1+L2 areas (last 90 days), keyed by areaId */
  l1l2ScoreHistory: Record<string, { score: number; date: string }[]>
  /** Sleep subarea behavioral scores (last 3 days) */
  sleepScores: { behavioralScore: number; scoredAt: string }[]
}

/**
 * Returns all data needed by the alert engine pure function.
 * Used by /areas page to evaluate Maslow alert rules server-side.
 */
export async function getAlertEngineData(userId: string): Promise<AlertEngineData> {
  assertDatabaseUrl()

  const now = new Date()

  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysStr = ninetyDaysAgo.toISOString().slice(0, 10)

  const threeDaysAgo = new Date(now)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const threeDaysStr = threeDaysAgo.toISOString().slice(0, 10)

  // Find the L1 area to locate the sleep subarea
  const [l1Area] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.userId, userId), eq(areas.maslowLevel, 1)))
    .limit(1)

  let sleepSubareaId: string | null = null
  if (l1Area) {
    const [sleepSub] = await db
      .select({ id: areaSubareas.id })
      .from(areaSubareas)
      .where(and(eq(areaSubareas.areaId, l1Area.id), eq(areaSubareas.slug, 'sueno')))
      .limit(1)
    sleepSubareaId = sleepSub?.id ?? null
  }

  const [activityRows, scoreRows, sleepScoreRows] = await Promise.all([
    // Activities by subarea (last 7 days)
    db
      .select({ subareaId: stepsActivities.subareaId })
      .from(stepsActivities)
      .where(
        and(
          eq(stepsActivities.userId, userId),
          eq(stepsActivities.status, 'completed'),
          gte(stepsActivities.completedAt, sevenDaysAgo)
        )
      ),

    // L1+L2 area score history (last 90 days)
    db
      .select({
        areaId: areaScores.areaId,
        score: areaScores.score,
        scoredAt: areaScores.scoredAt,
      })
      .from(areaScores)
      .innerJoin(areas, eq(areaScores.areaId, areas.id))
      .where(and(eq(areaScores.userId, userId), gte(areaScores.scoredAt, ninetyDaysStr)))
      .orderBy(asc(areaScores.scoredAt)),

    // Sleep subarea behavioral scores (last 3 days)
    sleepSubareaId
      ? db
          .select({
            behavioralScore: areaSubareaScores.behavioralScore,
            scoredAt: areaSubareaScores.scoredAt,
          })
          .from(areaSubareaScores)
          .where(
            and(
              eq(areaSubareaScores.subareaId, sleepSubareaId),
              gte(areaSubareaScores.scoredAt, threeDaysStr)
            )
          )
          .orderBy(asc(areaSubareaScores.scoredAt))
      : Promise.resolve([]),
  ])

  // Group activities by subareaId
  const activitiesBySubarea: Record<string, number> = {}
  for (const row of activityRows) {
    const sid = row.subareaId ?? '__no_subarea__'
    activitiesBySubarea[sid] = (activitiesBySubarea[sid] ?? 0) + 1
  }

  // Group score history by areaId
  const l1l2ScoreHistory: Record<string, { score: number; date: string }[]> = {}
  for (const row of scoreRows) {
    const existing = l1l2ScoreHistory[row.areaId] ?? []
    existing.push({ score: row.score, date: row.scoredAt })
    l1l2ScoreHistory[row.areaId] = existing
  }

  return {
    activitiesBySubarea,
    totalActivities: activityRows.length,
    l1l2ScoreHistory,
    sleepScores: sleepScoreRows.map((r) => ({
      behavioralScore: r.behavioralScore ?? 0,
      scoredAt: r.scoredAt,
    })),
  }
}
