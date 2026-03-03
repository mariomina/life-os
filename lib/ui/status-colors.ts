/**
 * lib/ui/status-colors.ts
 * Design System — Única fuente de verdad para colores de estado.
 * Importar desde aquí en lugar de duplicar en cada componente.
 *
 * Paleta verde/emerald/amber actualizada en Story 9.3.
 */

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  archived: 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400',
  paused: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  pending: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
}
