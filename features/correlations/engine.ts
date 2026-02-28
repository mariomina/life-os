// features/correlations/engine.ts
// Story 8.3 — Motor de correlaciones: Pearson, Spearman, clasificación.

// ─── Pearson ──────────────────────────────────────────────────────────────────

/**
 * Pearson correlation coefficient.
 * Returns null if arrays are too short or have zero variance.
 */
export function computePearson(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 3) return null
  const n = a.length
  const meanA = a.reduce((s, x) => s + x, 0) / n
  const meanB = b.reduce((s, x) => s + x, 0) / n
  const num = a.reduce((s, x, i) => s + (x - meanA) * (b[i] - meanB), 0)
  const denA = Math.sqrt(a.reduce((s, x) => s + (x - meanA) ** 2, 0))
  const denB = Math.sqrt(b.reduce((s, x) => s + (x - meanB) ** 2, 0))
  if (denA === 0 || denB === 0) return null
  return num / (denA * denB)
}

// ─── Spearman ─────────────────────────────────────────────────────────────────

/**
 * Ranks an array (1-based, handles ties by using first occurrence index).
 */
function rankArray(arr: number[]): number[] {
  const sorted = [...arr].sort((x, y) => x - y)
  return arr.map((v) => sorted.indexOf(v) + 1)
}

/**
 * Spearman rank correlation coefficient.
 * Returns null if arrays are too short.
 */
export function computeSpearman(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 3) return null
  return computePearson(rankArray(a), rankArray(b))
}

// ─── Classification ───────────────────────────────────────────────────────────

export type CorrelationType = 'positive' | 'negative' | 'neutral'
export type CorrelationTier = 'gathering' | 'provisional' | 'full'

export interface ClassificationResult {
  type: CorrelationType
  tier: CorrelationTier
}

/**
 * Classifies a correlation coefficient by type and data tier.
 * - tier: gathering (<7d), provisional (7-13d), full (≥14d)
 * - type: positive (≥0.3), negative (≤-0.3), neutral (|r|<0.3)
 *   Only assigned for tier='full'; otherwise always neutral.
 */
export function classifyCorrelation(
  coefficient: number | null,
  daysOfData: number
): ClassificationResult {
  const tier: CorrelationTier =
    daysOfData < 7 ? 'gathering' : daysOfData < 14 ? 'provisional' : 'full'

  if (coefficient === null || tier !== 'full') return { type: 'neutral', tier }
  if (coefficient >= 0.3) return { type: 'positive', tier }
  if (coefficient <= -0.3) return { type: 'negative', tier }
  return { type: 'neutral', tier }
}

// ─── Correlation Pairs ────────────────────────────────────────────────────────

export interface MetricSeries {
  id: string
  type: 'area' | 'habit'
  label: string
  series: number[] // 90-slot daily array
}

export interface CorrelationPair {
  entityA: MetricSeries
  entityB: MetricSeries
}

/**
 * Builds all unique pairs of metric series to correlate.
 * Cross-product, deduped (no self-pairs, each pair appears once).
 */
export function buildCorrelationPairs(metrics: MetricSeries[]): CorrelationPair[] {
  const pairs: CorrelationPair[] = []
  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      pairs.push({ entityA: metrics[i], entityB: metrics[j] })
    }
  }
  return pairs
}
