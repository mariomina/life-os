'use client'

import type { OKRImpactResult } from '@/features/maslow/okr-impact'

interface OKRImpactBadgeProps {
  result: OKRImpactResult
}

/**
 * Muestra el delta del Life System Health Score proyectado si el OKR
 * se completa al 100%.
 *
 * Colores:
 *   deltaPoints > 2  → verde   (impacto significativo)
 *   deltaPoints 0-2  → amarillo (impacto bajo)
 *   deltaPoints = 0  → oculto  (área ya optimizada o sin área)
 */
export function OKRImpactBadge({ result }: OKRImpactBadgeProps) {
  const { deltaPoints } = result

  // No renderizar si el impacto es 0
  if (deltaPoints <= 0) return null

  const isHigh = deltaPoints > 2

  const colorClass = isHigh
    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
    : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'

  const formatted = `+${deltaPoints.toFixed(1)} pts`

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
      title={`Si alcanzas este OKR, tu Health Score subirá aproximadamente ${formatted} globalmente`}
    >
      {formatted}
    </span>
  )
}
