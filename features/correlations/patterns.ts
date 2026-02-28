// features/correlations/patterns.ts
// Story 8.4 — Detección avanzada de patrones: bucles, leverage, bottlenecks.

import type { Correlation } from '@/lib/db/schema/correlations'

// ─── Input type (subset of Correlation used by pattern detection) ─────────────

export interface CorrelationInput {
  entityAId: string | null
  entityBId: string | null
  entityAType: string
  entityBType: string
  type: string
  tier: string
  correlationValue: string | null
}

// ─── detectDestructiveLoops ───────────────────────────────────────────────────

/**
 * Returns correlations that are strong negative pairs (tier=full, coefficient ≤ -0.4).
 * These are candidates for destructive loops.
 */
export function detectDestructiveLoops<T extends CorrelationInput>(correlations: T[]): T[] {
  return correlations.filter(
    (c) =>
      c.tier === 'full' &&
      c.type === 'negative' &&
      c.correlationValue !== null &&
      Number(c.correlationValue) <= -0.4
  )
}

// ─── detectLeveragePoints ─────────────────────────────────────────────────────

/**
 * Returns correlations where entityA has strong positive impact (≥ 0.6) on 2+ areas.
 * These entities are leverage points in the system.
 */
export function detectLeveragePoints<T extends CorrelationInput>(correlations: T[]): T[] {
  const entityImpactCount = new Map<string, number>()

  for (const c of correlations) {
    if (
      c.tier === 'full' &&
      c.type === 'positive' &&
      c.correlationValue !== null &&
      Number(c.correlationValue) >= 0.6 &&
      c.entityAId
    ) {
      entityImpactCount.set(c.entityAId, (entityImpactCount.get(c.entityAId) ?? 0) + 1)
    }
  }

  return correlations.filter(
    (c) =>
      c.entityAId !== null &&
      c.tier === 'full' &&
      c.type === 'positive' &&
      c.correlationValue !== null &&
      Number(c.correlationValue) >= 0.6 &&
      (entityImpactCount.get(c.entityAId!) ?? 0) >= 2
  )
}

// ─── detectBottlenecks ────────────────────────────────────────────────────────

/**
 * Returns correlations where entityA has negative impact (≤ -0.3, tier=full) on 2+ areas.
 * These entities are bottlenecks blocking progress across multiple areas.
 */
export function detectBottlenecks<T extends CorrelationInput>(correlations: T[]): T[] {
  const entityNegativeCount = new Map<string, number>()

  for (const c of correlations) {
    if (
      c.tier === 'full' &&
      c.type === 'negative' &&
      c.correlationValue !== null &&
      Number(c.correlationValue) <= -0.3 &&
      c.entityAId
    ) {
      entityNegativeCount.set(c.entityAId, (entityNegativeCount.get(c.entityAId) ?? 0) + 1)
    }
  }

  return correlations.filter(
    (c) =>
      c.entityAId !== null &&
      c.tier === 'full' &&
      c.type === 'negative' &&
      (entityNegativeCount.get(c.entityAId!) ?? 0) >= 2
  )
}
