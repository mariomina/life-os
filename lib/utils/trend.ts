/**
 * Calculates the trend direction from an ordered array of scores (oldest → newest).
 * Returns '↑' if improving, '↓' if declining, '→' if stable or insufficient data.
 */
export function calculateTrend(scores: number[]): '↑' | '↓' | '→' {
  if (scores.length < 2) return '→'
  const last = scores[scores.length - 1]
  const prev = scores[scores.length - 2]
  if (last > prev) return '↑'
  if (last < prev) return '↓'
  return '→'
}

/** Returns a CSS color class based on score level */
export function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-blue-500'
  if (score >= 40) return 'text-yellow-500'
  return 'text-red-500'
}

/** Returns a CSS background color class based on score level */
export function scoreBgClass(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-blue-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}
