/**
 * Formats a duration in seconds into a human-readable string.
 * Examples: 0 → "0h", 2700 → "45m", 5400 → "1h 30m", 7200 → "2h", 3661 → "1h 1m"
 */
export function formatTimeInvested(seconds: number): string {
  if (seconds <= 0) return '0h'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Formats a Date (or null) as a relative "hace X días" string.
 * Returns "Sin actividad" when null.
 */
export function formatLastActivity(lastActivityAt: Date | string | null): string {
  if (!lastActivityAt) return 'Sin actividad'
  const diffMs = Date.now() - new Date(lastActivityAt).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  return `hace ${diffDays} días`
}
