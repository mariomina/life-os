// features/reports/metrics.ts
// Story 8.2 — Funciones puras para métricas de informes.

// ─── Habit Consistency ────────────────────────────────────────────────────────

export interface HabitConsistencyItem {
  habitId: string
  habitName: string
  planned: number
  completed: number
  rate: number
}

/**
 * Computes completion rate per habit.
 * rate = completed / planned (0-1). Returns 0 if planned = 0.
 */
export function computeHabitConsistency(
  habits: { habitId: string; habitName: string; planned: number; completed: number }[]
): HabitConsistencyItem[] {
  return habits.map((h) => ({
    ...h,
    rate: h.planned > 0 ? h.completed / h.planned : 0,
  }))
}

// ─── Calendar Commitment Rate (CCR) ──────────────────────────────────────────

export interface CCRResult {
  planned: number
  completed: number
  rate: number | null
}

/**
 * Calendar Commitment Rate.
 * rate = completed / planned (0-1). Returns null if planned = 0.
 */
export function computeCCR(planned: number, completed: number): CCRResult {
  return {
    planned,
    completed,
    rate: planned > 0 ? completed / planned : null,
  }
}

// ─── Area Health Trend ────────────────────────────────────────────────────────

export type AreaHealthTrend = 'improving' | 'declining' | 'stable'

/**
 * Classifies area health trend by comparing two score averages.
 * improving: delta > 5, declining: delta < -5, stable: |delta| <= 5.
 */
export function computeAreaHealthTrend(
  currentScore: number,
  previousScore: number
): AreaHealthTrend {
  const delta = currentScore - previousScore
  if (delta > 5) return 'improving'
  if (delta < -5) return 'declining'
  return 'stable'
}
