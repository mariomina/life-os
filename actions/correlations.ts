'use server'

// actions/correlations.ts
// Story 8.3 — Motor de correlaciones: runCorrelationEngine + getActiveCorrelations.

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db/client'
import { correlations } from '@/lib/db/schema/correlations'
import { areas } from '@/lib/db/schema/areas'
import { habits } from '@/lib/db/schema/habits'
import { areaScores } from '@/lib/db/schema/area-scores'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { eq, and, gte, desc, sql } from 'drizzle-orm'
import {
  computePearson,
  classifyCorrelation,
  buildCorrelationPairs,
  type MetricSeries,
} from '@/features/correlations/engine'
import type { Correlation } from '@/lib/db/schema/correlations'

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user.id
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a 90-slot daily time series starting from `startDate`.
 * `data` is a map of date string (YYYY-MM-DD) → value.
 */
function buildDailySeries(
  data: Map<string, number>,
  startDate: Date,
  slots = 90
): { series: number[]; daysOfData: number } {
  const series: number[] = []
  let nonZero = 0
  for (let i = 0; i < slots; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().split('T')[0]
    const v = data.get(key) ?? 0
    series.push(v)
    if (v > 0) nonZero++
  }
  return { series, daysOfData: nonZero }
}

// ─── runCorrelationEngine ─────────────────────────────────────────────────────

export interface CorrelationEngineResult {
  success: boolean
  correlationsComputed: number
  error?: string
}

/**
 * Runs the full correlation engine for the authenticated user.
 * - Reads last 90 days of data (area_scores + habit completions)
 * - Builds daily time series for each area and habit
 * - Computes Pearson correlation for all pairs
 * - Soft-replaces previous run (isActive=false) and inserts new rows
 */
export async function runCorrelationEngine(): Promise<CorrelationEngineResult> {
  try {
    const userId = await getAuthenticatedUserId()
    const now = new Date()
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const startDate = ninetyDaysAgo
    const startDateStr = startDate.toISOString().split('T')[0]

    // 1. Fetch all area score series (90 days)
    const areaRows = await db
      .select({ id: areas.id, name: areas.name })
      .from(areas)
      .where(eq(areas.userId, userId))

    const scoreRows = await db
      .select({ areaId: areaScores.areaId, scoredAt: areaScores.scoredAt, score: areaScores.score })
      .from(areaScores)
      .where(and(eq(areaScores.userId, userId), gte(areaScores.scoredAt, startDateStr)))

    // 2. Build area series
    const areaMetrics: MetricSeries[] = areaRows.map((a) => {
      const dataMap = new Map<string, number>()
      scoreRows.filter((s) => s.areaId === a.id).forEach((s) => dataMap.set(s.scoredAt, s.score))
      const { series, daysOfData } = buildDailySeries(dataMap, startDate)
      return { id: a.id, type: 'area', label: a.name, series }
    })

    // 3. Fetch habit completion series (90 days)
    const habitRows = await db
      .select({ id: habits.id, title: habits.title })
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.isActive, true)))

    const completionRows = await db
      .select({
        habitId: stepsActivities.habitId,
        day: sql<string>`DATE(${stepsActivities.scheduledAt})`,
        completions: sql<number>`COUNT(*) FILTER (WHERE ${stepsActivities.status} = 'completed')`,
      })
      .from(stepsActivities)
      .where(
        and(
          eq(stepsActivities.userId, userId),
          gte(stepsActivities.scheduledAt, ninetyDaysAgo),
          sql`${stepsActivities.habitId} IS NOT NULL`
        )
      )
      .groupBy(stepsActivities.habitId, sql`DATE(${stepsActivities.scheduledAt})`)

    // 4. Build habit series
    const habitMetrics: MetricSeries[] = habitRows.map((h) => {
      const dataMap = new Map<string, number>()
      completionRows
        .filter((c) => c.habitId === h.id)
        .forEach((c) => dataMap.set(c.day, Number(c.completions)))
      const { series, daysOfData } = buildDailySeries(dataMap, startDate)
      return { id: h.id, type: 'habit', label: h.title, series }
    })

    // 5. Build all pairs and compute correlations
    const allMetrics = [...areaMetrics, ...habitMetrics]
    const pairs = buildCorrelationPairs(allMetrics)

    if (pairs.length === 0) {
      return { success: true, correlationsComputed: 0 }
    }

    const newCorrelations: (typeof correlations.$inferInsert)[] = []

    for (const pair of pairs) {
      const daysA = pair.entityA.series.filter((v) => v > 0).length
      const daysB = pair.entityB.series.filter((v) => v > 0).length
      const daysOfData = Math.min(daysA, daysB)

      const coefficient =
        daysOfData >= 14 ? computePearson(pair.entityA.series, pair.entityB.series) : null
      const { type, tier } = classifyCorrelation(coefficient, daysOfData)

      newCorrelations.push({
        userId,
        computedAt: now,
        tier,
        type,
        confidence: coefficient !== null ? String(Math.abs(coefficient).toFixed(3)) : null,
        entityAType: pair.entityA.type,
        entityAId: pair.entityA.id,
        entityBType: pair.entityB.type,
        entityBId: pair.entityB.id,
        correlationValue: coefficient !== null ? String(coefficient.toFixed(4)) : null,
        dataPointsCount: daysOfData,
        daysOfData,
        descriptionNl: null,
        isActive: true,
      })
    }

    // 6. Soft-replace previous run
    await db
      .update(correlations)
      .set({ isActive: false })
      .where(and(eq(correlations.userId, userId), eq(correlations.isActive, true)))

    // 7. Insert new correlations in batches of 50
    for (let i = 0; i < newCorrelations.length; i += 50) {
      await db.insert(correlations).values(newCorrelations.slice(i, i + 50))
    }

    return { success: true, correlationsComputed: newCorrelations.length }
  } catch (error) {
    return {
      success: false,
      correlationsComputed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ─── getActiveCorrelations ────────────────────────────────────────────────────

export type CorrelationRow = Pick<
  Correlation,
  | 'id'
  | 'tier'
  | 'type'
  | 'correlationValue'
  | 'confidence'
  | 'entityAType'
  | 'entityAId'
  | 'entityBType'
  | 'entityBId'
  | 'daysOfData'
  | 'dataPointsCount'
  | 'descriptionNl'
  | 'computedAt'
>

/**
 * Returns the latest active correlations for the user,
 * ordered by |correlationValue| descending.
 */
export async function getActiveCorrelations(): Promise<CorrelationRow[]> {
  const userId = await getAuthenticatedUserId()

  const rows = await db
    .select({
      id: correlations.id,
      tier: correlations.tier,
      type: correlations.type,
      correlationValue: correlations.correlationValue,
      confidence: correlations.confidence,
      entityAType: correlations.entityAType,
      entityAId: correlations.entityAId,
      entityBType: correlations.entityBType,
      entityBId: correlations.entityBId,
      daysOfData: correlations.daysOfData,
      dataPointsCount: correlations.dataPointsCount,
      descriptionNl: correlations.descriptionNl,
      computedAt: correlations.computedAt,
    })
    .from(correlations)
    .where(and(eq(correlations.userId, userId), eq(correlations.isActive, true)))
    .orderBy(desc(sql`ABS(${correlations.correlationValue})`))

  return rows
}
