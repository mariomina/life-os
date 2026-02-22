// features/maslow/okr-impact.ts
// Cálculo de impacto de OKR candidato en el Life System Health Score global.
// Lógica pura — sin side effects, sin dependencias externas.
// Source: docs/stories/3.4.story.md

import { MASLOW_WEIGHTS, type MaslowLevel } from '@/lib/utils/maslow-weights'
import { calculateGlobalScore } from '@/features/maslow/scoring'
import type { Area } from '@/lib/db/schema/areas'

export interface OKRCandidate {
  /** ID del área vinculada al OKR. null si no hay área seleccionada. */
  areaId: string | null
  /** Score objetivo simulado si el OKR se completa al 100%. Default: 100. */
  targetScore?: number
}

export interface OKRImpactResult {
  /** Delta en Health Score global (globalSimulado − globalActual). Puede ser 0. */
  deltaPoints: number
  /** Score actual del área vinculada. */
  currentAreaScore: number
  /** Score objetivo simulado. */
  targetAreaScore: number
  /** Multiplicador Maslow del área vinculada. */
  areaWeight: number
}

/**
 * Construye el scoreMap requerido por calculateGlobalScore a partir de la lista de áreas.
 * Mapea maslowLevel → currentScore para cada área.
 * Si un nivel no tiene área, su score es 0.
 */
function buildScoreMap(areas: Area[]): Record<MaslowLevel, number> {
  const levels = Object.keys(MASLOW_WEIGHTS).map(Number) as MaslowLevel[]
  const map = Object.fromEntries(levels.map((l) => [l, 0])) as Record<MaslowLevel, number>
  for (const area of areas) {
    const level = area.maslowLevel as MaslowLevel
    if (level in MASLOW_WEIGHTS) {
      map[level] = area.currentScore
    }
  }
  return map
}

/**
 * Calcula el impacto que tendría un OKR candidato en el Life System Health Score global.
 *
 * Algoritmo:
 * 1. Si areaId es null o el área no se encuentra → impacto = 0.
 * 2. targetScore = okrCandidate.targetScore ?? 100
 * 3. Si el área ya tiene score >= targetScore → impacto = 0 (área ya optimizada).
 * 4. Calcular globalActual con calculateGlobalScore(scoreMap).
 * 5. Crear scoreMapSimulado reemplazando el nivel del área con targetScore.
 * 6. Calcular globalSimulado con calculateGlobalScore(scoreMapSimulado).
 * 7. deltaPoints = globalSimulado − globalActual.
 *
 * @param okrCandidate - OKR a evaluar (areaId + targetScore opcional)
 * @param areas - Lista completa de áreas del usuario
 * @param scoreMap - Mapa precomputado de MaslowLevel → score (opcional; se computa si no se provee)
 */
export function calculateOKRImpact(
  okrCandidate: OKRCandidate,
  areas: Area[],
  scoreMap?: Record<MaslowLevel, number>
): OKRImpactResult {
  const zeroResult: OKRImpactResult = {
    deltaPoints: 0,
    currentAreaScore: 0,
    targetAreaScore: okrCandidate.targetScore ?? 100,
    areaWeight: 0,
  }

  // Guard: sin área vinculada
  if (!okrCandidate.areaId) return zeroResult

  const area = areas.find((a) => a.id === okrCandidate.areaId)
  if (!area) return zeroResult

  const level = area.maslowLevel as MaslowLevel
  if (!(level in MASLOW_WEIGHTS)) return zeroResult

  const targetScore = okrCandidate.targetScore ?? 100
  const currentAreaScore = area.currentScore
  const areaWeight = MASLOW_WEIGHTS[level]

  // Si el área ya alcanzó el targetScore → sin impacto
  if (currentAreaScore >= targetScore) {
    return {
      deltaPoints: 0,
      currentAreaScore,
      targetAreaScore: targetScore,
      areaWeight,
    }
  }

  const map = scoreMap ?? buildScoreMap(areas)

  const globalActual = calculateGlobalScore(map)

  const scoreMapSimulado: Record<MaslowLevel, number> = { ...map, [level]: targetScore }
  const globalSimulado = calculateGlobalScore(scoreMapSimulado)

  const deltaPoints = globalSimulado - globalActual

  return {
    deltaPoints,
    currentAreaScore,
    targetAreaScore: targetScore,
    areaWeight,
  }
}

/**
 * Construye el scoreMap desde la lista de áreas del usuario.
 * Exportado para reutilización en componentes (OKRForm, etc.).
 */
export { buildScoreMap }
