// features/reports/weekly.ts
// Story 8.8 — Función pura aggregateWeeklyMetrics para Weekly Review.

export interface WeeklyMetrics {
  ccrRate: number | null
  habitConsistencyAvg: number // 0-1
  okrProgressAvg: number // 0-100
  timeByAreaTop3: { areaName: string; totalSeconds: number }[]
  areaHealthTrends: { areaName: string; trend: 'improving' | 'declining' | 'stable' }[]
}

/**
 * Aggregates raw data sources into a single WeeklyMetrics object.
 * Handles empty arrays gracefully (returns 0 averages).
 */
export function aggregateWeeklyMetrics(
  ccr: { planned: number; completed: number; rate: number | null },
  habits: { rate: number }[],
  okrs: { avgProgress: number }[],
  timeByArea: { areaName: string; totalSeconds: number }[],
  areaHealthTrends: { areaName: string; trend: 'improving' | 'declining' | 'stable' }[]
): WeeklyMetrics {
  const habitConsistencyAvg =
    habits.length > 0 ? habits.reduce((s, h) => s + h.rate, 0) / habits.length : 0

  const okrProgressAvg =
    okrs.length > 0 ? okrs.reduce((s, o) => s + o.avgProgress, 0) / okrs.length : 0

  return {
    ccrRate: ccr.rate,
    habitConsistencyAvg: Math.round(habitConsistencyAvg * 100) / 100,
    okrProgressAvg: Math.round(okrProgressAvg * 10) / 10,
    timeByAreaTop3: timeByArea.slice(0, 3),
    areaHealthTrends,
  }
}
