// features/correlation-engine/subarea-correlations.ts
// Motor de correlación estadística entre sub-áreas Maslow.
// Story 11.9 — Motor de Correlaciones.
//
// Calcula el coeficiente de Pearson entre series temporales de scores de sub-áreas.
// Forward-fill para gaps (no interpola — propaga valor anterior).
// [Source: docs/briefs/areas-redesign-brief.md#fase5]

// ─── Pearson ──────────────────────────────────────────────────────────────────

/**
 * Calculates the Pearson correlation coefficient between two numeric series.
 * Returns 0 if either series has zero variance (avoids division by zero).
 *
 * @param x - First series (source sub-area scores)
 * @param y - Second series (target sub-area scores), must be same length as x
 * @returns Pearson r in [-1, 1]
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n === 0) return 0

  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n

  const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0)
  const denX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0))
  const denY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0))

  return denX * denY === 0 ? 0 : num / (denX * denY)
}

// ─── Forward Fill ─────────────────────────────────────────────────────────────

/**
 * Forward-fills gaps in a daily score series.
 * Missing days are filled with the last known value (not interpolated).
 * If no prior value exists, uses 0.
 *
 * @param dailyScores - Map of YYYY-MM-DD → score
 * @param dates - Ordered list of YYYY-MM-DD dates to fill
 * @returns Array of scores aligned to `dates`
 */
export function forwardFill(dailyScores: Map<string, number>, dates: string[]): number[] {
  let lastKnown = 0
  return dates.map((date) => {
    if (dailyScores.has(date)) {
      lastKnown = dailyScores.get(date)!
    }
    return lastKnown
  })
}

// ─── calculateSubareaCorrelation ─────────────────────────────────────────────

/**
 * Calculates the Pearson correlation between two sub-area score series.
 * Supports optional lag (shift target series by `lagDays`).
 *
 * @param sourceScores - Daily scores for source sub-area (indexed 0..n-1 = oldest..newest)
 * @param targetScores - Daily scores for target sub-area, same length
 * @param lagDays - Shift target by N days (e.g. sueño today → concentración tomorrow)
 * @returns Pearson r in [-1, 1]
 */
export function calculateSubareaCorrelation(
  sourceScores: number[],
  targetScores: number[],
  lagDays: number = 0
): number {
  if (sourceScores.length === 0 || targetScores.length === 0) return 0
  if (lagDays === 0) return pearsonCorrelation(sourceScores, targetScores)

  // Apply lag: shift target forward by lagDays
  const laggedTarget = targetScores.slice(lagDays)
  const trimmedSource = sourceScores.slice(0, sourceScores.length - lagDays)

  if (trimmedSource.length === 0) return 0
  return pearsonCorrelation(trimmedSource, laggedTarget)
}

// ─── buildDateRange ───────────────────────────────────────────────────────────

/**
 * Generates an ordered array of YYYY-MM-DD strings for the last `days` days.
 */
export function buildDateRange(days: number, referenceDate?: Date): string[] {
  const ref = referenceDate ?? new Date()
  const result: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(ref)
    d.setDate(d.getDate() - i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}
