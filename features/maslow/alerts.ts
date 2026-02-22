// features/maslow/alerts.ts
// Lógica pura de detección de alertas Maslow — sin side effects, sin dependencias externas
// Source: docs/prd/requirements.md#FR18

import type { Area } from '@/lib/db/schema/areas'

export type AlertType = 'critical' | 'warning'

export interface Alert {
  type: AlertType
  message: string
  areaName?: string
  maslowLevel?: number
}

/** Levels considered critical D-Needs (FR18a) */
const CRITICAL_LEVELS = new Set([1, 2])

/** Days without activity before emitting a critical alert */
const CRITICAL_INACTIVITY_DAYS = 7

/** Fraction of total time in ≤2 areas to trigger imbalance warning */
const IMBALANCE_THRESHOLD = 0.8

/** Minimum total seconds required to evaluate imbalance (60 min) */
const MIN_TOTAL_SECONDS_FOR_IMBALANCE = 3600

/**
 * Returns the number of days since the given date.
 * Returns Infinity for null (treated as "never active").
 */
export function daysSince(date: Date | string | null): number {
  if (!date) return Infinity
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Evaluates alert conditions for a user's areas and time investment map.
 *
 * Alert A — Critical abandonment (FR18a):
 *   Area level 1-2 with last_activity_at null or >7 days ago.
 *
 * Alert B — Systemic imbalance (FR18b):
 *   >80% of total time invested concentrated in ≤2 areas (min 60 min total).
 *
 * @param areas     User areas ordered by maslow_level asc
 * @param timeMap   Map of area_id → total seconds invested
 * @returns         Array of active alerts (empty if none)
 */
export function getAlerts(areas: Area[], timeMap: Record<string, number>): Alert[] {
  const alerts: Alert[] = []

  // --- Alert A: Critical inactivity (levels 1-2) ---
  for (const area of areas) {
    if (!CRITICAL_LEVELS.has(area.maslowLevel)) continue
    const days = daysSince(area.lastActivityAt)
    if (days > CRITICAL_INACTIVITY_DAYS) {
      const daysLabel = days === Infinity ? 'nunca' : `${days} días`
      alerts.push({
        type: 'critical',
        areaName: area.name,
        maslowLevel: area.maslowLevel,
        message: `${area.name} (nivel ${area.maslowLevel}) lleva ${daysLabel} sin actividad registrada.`,
      })
    }
  }

  // --- Alert B: Systemic imbalance (>80% in ≤2 areas) ---
  const totalSeconds = Object.values(timeMap).reduce((sum, s) => sum + s, 0)

  if (totalSeconds >= MIN_TOTAL_SECONDS_FOR_IMBALANCE) {
    const sorted = areas
      .map((a) => ({ areaId: a.id, seconds: timeMap[a.id] ?? 0 }))
      .sort((a, b) => b.seconds - a.seconds)

    const top2Seconds = sorted.slice(0, 2).reduce((sum, a) => sum + a.seconds, 0)
    const concentration = top2Seconds / totalSeconds

    if (concentration > IMBALANCE_THRESHOLD) {
      alerts.push({
        type: 'warning',
        message: `Más del ${Math.round(concentration * 100)}% de tu tiempo está concentrado en 1-2 áreas. Considera diversificar tu actividad.`,
      })
    }
  }

  return alerts
}
