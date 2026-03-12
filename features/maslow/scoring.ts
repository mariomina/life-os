// features/maslow/scoring.ts
// Funciones puras de cálculo de score Maslow — sin side effects, sin dependencias externas
// Source: docs/prd/requirements.md#FR1 + docs/prd/technical-assumptions.md

import { MASLOW_WEIGHTS, MASLOW_TOTAL_WEIGHT, type MaslowLevel } from '@/lib/utils/maslow-weights'

/**
 * Aplica el multiplicador de nivel Maslow al score bruto de un área.
 * @param rawScore - Score del área (0-100)
 * @param maslowLevel - Nivel Maslow del área (1-8)
 * @returns Score ponderado (rawScore × multiplicador)
 */
export function calculateAreaScore(rawScore: number, maslowLevel: MaslowLevel): number {
  const clamped = Math.max(0, Math.min(100, rawScore))
  return clamped * MASLOW_WEIGHTS[maslowLevel]
}

/**
 * Calcula el score de un área como promedio ponderado de sus sub-áreas.
 * Cada sub-área contribuye con su internalWeight relativo al total.
 *
 * @param subareas - Array de sub-áreas activas con su currentScore e internalWeight
 * @returns Score del área (0-100), 0 si no hay sub-áreas
 * [Source: brief#4-subareas — Story 11.3]
 */
export function calculateAreaScoreFromSubareas(
  subareas: Array<{ currentScore: number; internalWeight: number }>
): number {
  const totalWeight = subareas.reduce((sum, s) => sum + Number(s.internalWeight), 0)
  if (totalWeight === 0) return 0
  const weightedSum = subareas.reduce(
    (sum, s) => sum + s.currentScore * Number(s.internalWeight),
    0
  )
  return Math.round((weightedSum / totalWeight) * 100) / 100
}

/**
 * Calcula el Life System Health Score global ponderado.
 * Fórmula: Σ(score_área × multiplicador_nivel) / MASLOW_TOTAL_WEIGHT
 * @param areaScores - Mapa de nivel Maslow → score del área (0-100)
 * @returns Score global (0-100)
 */
export function calculateGlobalScore(areaScores: Record<MaslowLevel, number>): number {
  const levels = Object.keys(MASLOW_WEIGHTS).map(Number) as MaslowLevel[]
  const weightedSum = levels.reduce((sum, level) => {
    const score = areaScores[level] ?? 0
    return sum + calculateAreaScore(score, level)
  }, 0)
  return weightedSum / MASLOW_TOTAL_WEIGHT
}
