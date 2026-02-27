// features/reports/periods.ts
// Story 8.1 — Lógica de períodos para informes.

export type ReportPeriod = 'week' | 'month' | 'quarter'

/**
 * Returns the `from` and `to` dates for the given period.
 * - week: last 7 days
 * - month: last 30 days
 * - quarter: last 90 days
 */
export function getPeriodRange(period: ReportPeriod, now = new Date()): { from: Date; to: Date } {
  const to = now
  const from = new Date(now)
  if (period === 'week') from.setDate(from.getDate() - 7)
  else if (period === 'month') from.setDate(from.getDate() - 30)
  else from.setDate(from.getDate() - 90)
  return { from, to }
}
