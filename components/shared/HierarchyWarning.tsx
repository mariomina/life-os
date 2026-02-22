import type { BlockedArea } from '@/features/maslow/hierarchy-guard'

interface HierarchyWarningProps {
  blockedAreas: BlockedArea[]
}

/**
 * Renders a warning banner when D-Needs critical areas (level 1-2) are in crisis.
 * Returns null if no blocked areas.
 */
export function HierarchyWarning({ blockedAreas }: HierarchyWarningProps) {
  if (blockedAreas.length === 0) return null

  return (
    <div className="space-y-2">
      {blockedAreas.map((area) => (
        <div
          key={area.areaId}
          className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          <span className="mt-0.5 shrink-0">🚫</span>
          <p>
            Tu área <strong>{area.areaName}</strong> (nivel {area.maslowLevel}) tiene un score de{' '}
            <strong>{area.currentScore}%</strong> hace{' '}
            <strong>{area.consecutiveDaysBelow50} días</strong>. Resuelve esta crisis antes de crear
            OKRs de crecimiento avanzado.
          </p>
        </div>
      ))}
    </div>
  )
}
