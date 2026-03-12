// features/maslow/alert-engine.ts
// Motor de reglas de alertas Maslow — función pura sin side effects.
// Story 11.8 — AlertBanner: Cascada, Balance, Crisis, Progresión.
// Source: docs/briefs/areas-redesign-brief.md#6-reglas

import type { Area } from '@/lib/db/schema/areas'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaslowAlert {
  id: string
  type: 'critical' | 'warning' | 'info'
  rule:
    | 'cascada'
    | 'balance'
    | 'crisis_sueno'
    | 'crisis_financiera'
    | 'crisis_social'
    | 'progresion'
  message: string
  /** Area slugs affected (for linking/highlighting) */
  affectedAreas: string[]
  /** CRITICAL = false (permanent until resolved), WARNING/INFO = true */
  canDismiss: boolean
}

export interface RecentActivityStats {
  /** Steps/activities completed in last 7 days, counted by subareaId */
  activitiesBySubarea: Record<string, number>
  /** Total completed activities last 7 days */
  totalActivities: number
  /** Daily scores for L1+L2 areas (last 90 days), keyed by areaId */
  l1l2ScoreHistory: Record<string, { score: number; date: string }[]>
  /** Sleep subarea behavioral scores (last 3 days) */
  sleepScores: { behavioralScore: number; scoredAt: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Score threshold for cascada/crisis alerts */
const CRITICAL_SCORE_THRESHOLD = 40
/** Days area must be below threshold to trigger cascada CRITICAL */
const CASCADA_DAYS = 14
/** Fraction of activities in top subareas to trigger balance WARNING */
const BALANCE_THRESHOLD = 0.8
/** Min activities needed to evaluate balance */
const BALANCE_MIN_ACTIVITIES = 5
/** Behavioral score threshold for sleep crisis (proxy for < 6h) */
const SLEEP_CRISIS_BEHAVIORAL = 30
/** Days of consecutive poor sleep to trigger crisis */
const SLEEP_CRISIS_DAYS = 3
/** Days of score history needed to evaluate progression */
const PROGRESSION_HISTORY_DAYS = 90
/** Score threshold for "solid base" in progression rule */
const PROGRESSION_SCORE_MIN = 80

// ─── Rule Evaluators ──────────────────────────────────────────────────────────

function evaluateCascada(areas: Area[], stats: RecentActivityStats): MaslowAlert[] {
  const alerts: MaslowAlert[] = []
  const l1l2Areas = areas.filter((a) => a.maslowLevel === 1 || a.maslowLevel === 2)

  for (const area of l1l2Areas) {
    if (area.currentScore >= CRITICAL_SCORE_THRESHOLD) continue

    const history = stats.l1l2ScoreHistory[area.id] ?? []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - CASCADA_DAYS)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const last14 = history.filter((h) => h.date >= cutoffStr)

    if (last14.length >= CASCADA_DAYS && last14.every((h) => h.score < CRITICAL_SCORE_THRESHOLD)) {
      const areaLabel = area.maslowLevel === 1 ? 'base fisiológica' : 'seguridad'
      alerts.push({
        id: `cascada-${area.id}`,
        type: 'critical',
        rule: 'cascada',
        message: `🚨 Tu ${areaLabel} está crítica. Prioriza estas áreas antes de objetivos de nivel 5-8.`,
        affectedAreas: [area.slug],
        canDismiss: false,
      })
    }
  }

  return alerts
}

function evaluateBalance(subareas: AreaSubarea[], stats: RecentActivityStats): MaslowAlert[] {
  if (stats.totalActivities < BALANCE_MIN_ACTIVITIES) return []

  const sorted = Object.entries(stats.activitiesBySubarea).sort(([, a], [, b]) => b - a)

  const top2Count = sorted.slice(0, 2).reduce((sum, [, n]) => sum + n, 0)
  const concentration = top2Count / stats.totalActivities

  if (concentration <= BALANCE_THRESHOLD) return []

  const topSubareaIds = sorted.slice(0, 2).map(([id]) => id)
  const topNames = topSubareaIds
    .map((id) => subareas.find((s) => s.id === id)?.name ?? id)
    .filter(Boolean)

  return [
    {
      id: 'balance',
      type: 'warning',
      rule: 'balance',
      message: `⚠ Desequilibrio: el ${Math.round(concentration * 100)}% de tu tiempo esta semana fue en ${topNames.join(' y ')}. ¿Qué área estás descuidando?`,
      affectedAreas: topSubareaIds.map((id) => subareas.find((s) => s.id === id)?.slug ?? id),
      canDismiss: true,
    },
  ]
}

function evaluateCrisisSueno(stats: RecentActivityStats): MaslowAlert[] {
  if (stats.sleepScores.length < SLEEP_CRISIS_DAYS) return []

  const recentSleepScores = stats.sleepScores.slice(-SLEEP_CRISIS_DAYS)
  const allLow = recentSleepScores.every((s) => s.behavioralScore < SLEEP_CRISIS_BEHAVIORAL)

  if (!allLow) return []

  return [
    {
      id: 'crisis_sueno',
      type: 'critical',
      rule: 'crisis_sueno',
      message:
        '🚨 Señales de sueño insuficiente detectadas los últimos 3 días. Pausa proyectos P2-P3 y prioriza recuperación.',
      affectedAreas: ['sueno'],
      canDismiss: false,
    },
  ]
}

function evaluateProgresion(areas: Area[], stats: RecentActivityStats): MaslowAlert[] {
  const l1l2Areas = areas.filter((a) => a.maslowLevel === 1 || a.maslowLevel === 2)
  if (l1l2Areas.length < 2) return []

  const allSolid = l1l2Areas.every((area) => {
    const history = stats.l1l2ScoreHistory[area.id] ?? []
    if (history.length < PROGRESSION_HISTORY_DAYS) return false
    const avg = history.reduce((sum, h) => sum + h.score, 0) / history.length
    return avg >= PROGRESSION_SCORE_MIN
  })

  if (!allSolid) return []

  return [
    {
      id: 'progresion',
      type: 'info',
      rule: 'progresion',
      message:
        '💡 Tu base está sólida. ¿Has pensado en un OKR de crecimiento personal o cognitivo?',
      affectedAreas: [],
      canDismiss: true,
    },
  ]
}

// ─── Main Evaluator ───────────────────────────────────────────────────────────

/**
 * Evaluates all Maslow alert rules against the user's current data.
 * Pure function — no DB access, no side effects.
 *
 * Rules implemented:
 *   1. Cascada (CRITICAL): L1/L2 score < 40 for 14+ days
 *   2. Balance (WARNING): >80% activities in ≤2 sub-areas this week
 *   5. Crisis sueño (CRITICAL): sleep behavioral score < 30 for 3 days
 *   6. Progresión (INFO): L1+L2 avg > 80 for 90 days → suggest growth OKR
 *
 * @returns Array of active alerts, ordered by severity (critical → warning → info)
 */
export function evaluateAlertRules(
  areas: Area[],
  subareas: AreaSubarea[],
  stats: RecentActivityStats
): MaslowAlert[] {
  const alerts: MaslowAlert[] = [
    ...evaluateCascada(areas, stats),
    ...evaluateCrisisSueno(stats),
    ...evaluateBalance(subareas, stats),
    ...evaluateProgresion(areas, stats),
  ]

  // Sort: critical → warning → info
  const order = { critical: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => order[a.type] - order[b.type])
}
