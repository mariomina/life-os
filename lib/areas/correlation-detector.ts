// lib/areas/correlation-detector.ts
// Detección de correlaciones significativas entre sub-áreas Maslow.
// Story 11.9 — Motor de Correlaciones.
//
// Consulta area_subarea_scores, aplica forward-fill, calcula Pearson
// y persiste resultados en la tabla `correlations` existente.
// [Source: docs/briefs/areas-redesign-brief.md#fase5]

import { eq, and, inArray, gte } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { areaSubareas, areaSubareaScores, correlations } from '@/lib/db/schema'
import type { CorrelationPair } from '@/lib/areas/correlation-pairs'
import {
  pearsonCorrelation,
  forwardFill,
  buildDateRange,
} from '@/features/correlation-engine/subarea-correlations'

// ─── Constants ────────────────────────────────────────────────────────────────

const SIGNIFICANCE_THRESHOLD = 0.3 // |r| > 0.3 to be significant
const MIN_DAYS_SIGNIFICANT = 21 // at least 21 data points
const HISTORY_DAYS = 90 // look back 90 days
const TIER_FULL_DAYS = 14 // ≥ 14 days → 'full' tier
const TIER_PROVISIONAL_DAYS = 7 // ≥ 7 days → 'provisional' tier

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubareaCorrelation {
  sourcePair: string // slug of source sub-area
  targetPair: string // slug of target sub-area
  coefficient: number // Pearson r in [-1, 1]
  isSignificant: boolean // |r| > 0.3 with ≥ 21 days of data
  direction: 'positive' | 'negative'
  insightMessage: string
  daysOfData: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInsightMessage(pair: CorrelationPair, r: number, daysOfData: number): string {
  const direction = r > 0 ? 'mejora' : 'baja'
  const [sourceName, targetName] = pair.label.split(' → ')
  if (r > 0) {
    return `Cuando ${sourceName} ${direction}, ${targetName} también mejora (r=${r.toFixed(2)}, ${daysOfData} días)`
  }
  return `Cuando ${sourceName} sube, ${targetName} tiende a ${direction} (r=${r.toFixed(2)}, ${daysOfData} días)`
}

function determineTier(daysOfData: number): 'gathering' | 'provisional' | 'full' {
  if (daysOfData >= TIER_FULL_DAYS) return 'full'
  if (daysOfData >= TIER_PROVISIONAL_DAYS) return 'provisional'
  return 'gathering'
}

// ─── detectSubareaCorrelations ────────────────────────────────────────────────

/**
 * Detects significant correlations between sub-area pairs for a user.
 *
 * Steps:
 * 1. Resolve pair slugs → subarea IDs for this user
 * 2. Fetch area_subarea_scores for last 90 days
 * 3. Forward-fill gaps per sub-area
 * 4. Calculate Pearson for each pair
 * 5. Persist results in `correlations` table (soft-replace previous run)
 *
 * @returns Array of SubareaCorrelation (all pairs, significant or not)
 */
export async function detectSubareaCorrelations(
  userId: string,
  pairs: CorrelationPair[]
): Promise<SubareaCorrelation[]> {
  if (pairs.length === 0) return []

  // 1. Collect all unique slugs referenced in pairs
  const allSlugs = [...new Set(pairs.flatMap((p) => [p.source, p.target]))]

  // 2. Resolve slugs → subarea rows for this user
  const subareaRows = await db
    .select({ id: areaSubareas.id, slug: areaSubareas.slug })
    .from(areaSubareas)
    .where(and(eq(areaSubareas.userId, userId), inArray(areaSubareas.slug, allSlugs)))

  const slugToId = new Map(subareaRows.map((r) => [r.slug, r.id]))

  // 3. Build date range (last 90 days)
  const dates = buildDateRange(HISTORY_DAYS)
  const cutoff = dates[0] // oldest date in range

  // 4. Fetch all scores for the involved sub-areas
  const subareaIds = subareaRows.map((r) => r.id)
  if (subareaIds.length === 0) return []

  const scores = await db
    .select({
      subareaId: areaSubareaScores.subareaId,
      score: areaSubareaScores.score,
      scoredAt: areaSubareaScores.scoredAt,
    })
    .from(areaSubareaScores)
    .where(
      and(
        eq(areaSubareaScores.userId, userId),
        inArray(areaSubareaScores.subareaId, subareaIds),
        gte(areaSubareaScores.scoredAt, cutoff)
      )
    )

  // 5. Group scores by subareaId → Map<date, score>
  const scoresBySubarea = new Map<string, Map<string, number>>()
  for (const row of scores) {
    if (!scoresBySubarea.has(row.subareaId)) {
      scoresBySubarea.set(row.subareaId, new Map())
    }
    scoresBySubarea.get(row.subareaId)!.set(row.scoredAt, row.score)
  }

  // 6. Soft-replace: mark previous run inactive BEFORE inserting new ones
  if (subareaIds.length > 0) {
    await db
      .update(correlations)
      .set({ isActive: false })
      .where(
        and(
          eq(correlations.userId, userId),
          eq(correlations.isActive, true),
          eq(correlations.entityAType, 'subarea')
        )
      )
  }

  // 7. Calculate correlations for each pair and insert results
  const results: SubareaCorrelation[] = []
  const now = new Date()

  for (const pair of pairs) {
    const sourceId = slugToId.get(pair.source)
    const targetId = slugToId.get(pair.target)

    // Skip if either sub-area doesn't exist for this user
    if (!sourceId || !targetId) continue

    const sourceMap = scoresBySubarea.get(sourceId) ?? new Map<string, number>()
    const targetMap = scoresBySubarea.get(targetId) ?? new Map<string, number>()

    // Count actual data points (days with real scores)
    const daysOfData = Math.max(sourceMap.size, targetMap.size)

    // Forward-fill both series
    const sourceFilled = forwardFill(sourceMap, dates)
    const targetFilled = forwardFill(targetMap, dates)

    const r = pearsonCorrelation(sourceFilled, targetFilled)
    const isSignificant = Math.abs(r) > SIGNIFICANCE_THRESHOLD && daysOfData >= MIN_DAYS_SIGNIFICANT
    const direction = r >= 0 ? 'positive' : 'negative'
    const tier = determineTier(daysOfData)

    const correlation: SubareaCorrelation = {
      sourcePair: pair.source,
      targetPair: pair.target,
      coefficient: r,
      isSignificant,
      direction,
      insightMessage: buildInsightMessage(pair, r, daysOfData),
      daysOfData,
    }
    results.push(correlation)

    // 7. Persist in correlations table
    // Only persist gathering/provisional/full with actual data
    if (daysOfData > 0) {
      await db.insert(correlations).values({
        userId,
        computedAt: now,
        tier,
        type: direction,
        confidence: isSignificant ? Math.abs(r).toFixed(3) : null,
        entityAType: 'subarea',
        entityAId: sourceId,
        entityBType: 'subarea',
        entityBId: targetId,
        correlationValue: r.toFixed(4),
        dataPointsCount: daysOfData,
        daysOfData,
        descriptionNl: isSignificant ? correlation.insightMessage : null,
        isActive: true,
      })
    }
  }

  return results
}

// ─── getSubareaCorrelationsForArea ────────────────────────────────────────────

/**
 * Fetches active correlations for a specific area's sub-areas.
 * Returns only significant correlations (isActive + confidence > threshold).
 * Used by /areas/[slug] detail page.
 */
export async function getSubareaCorrelationsForArea(
  userId: string,
  areaId: string
): Promise<SubareaCorrelation[]> {
  // Get sub-area IDs for this area
  const subareaRows = await db
    .select({ id: areaSubareas.id, slug: areaSubareas.slug })
    .from(areaSubareas)
    .where(and(eq(areaSubareas.userId, userId), eq(areaSubareas.areaId, areaId)))

  if (subareaRows.length === 0) return []

  const subareaIds = subareaRows.map((r) => r.id)
  const slugById = new Map(subareaRows.map((r) => [r.id, r.slug]))

  // Fetch active significant correlations involving this area's sub-areas
  const rows = await db
    .select()
    .from(correlations)
    .where(
      and(
        eq(correlations.userId, userId),
        eq(correlations.isActive, true),
        eq(correlations.entityAType, 'subarea')
      )
    )

  // Filter to correlations where source OR target is in this area's sub-areas
  const relevant = rows.filter(
    (r) =>
      (r.entityAId && subareaIds.includes(r.entityAId)) ||
      (r.entityBId && subareaIds.includes(r.entityBId))
  )

  // Reconstruct SubareaCorrelation shape for UI
  return relevant
    .filter((r) => r.confidence !== null && parseFloat(r.confidence) > SIGNIFICANCE_THRESHOLD)
    .map((r) => ({
      sourcePair: (r.entityAId && slugById.get(r.entityAId)) ?? r.entityAId ?? '',
      targetPair: (r.entityBId && slugById.get(r.entityBId)) ?? r.entityBId ?? '',
      coefficient: r.correlationValue ? parseFloat(r.correlationValue) : 0,
      isSignificant: true,
      direction: (r.type === 'positive' ? 'positive' : 'negative') as 'positive' | 'negative',
      insightMessage: r.descriptionNl ?? '',
      daysOfData: r.daysOfData,
    }))
}
