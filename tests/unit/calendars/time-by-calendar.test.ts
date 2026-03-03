import { describe, it, expect } from 'vitest'

// ─── Pure helpers extracted from getTimeByCalendar logic ─────────────────────
// Tests verify aggregation, percentage calculation, sorting, and filtering
// without hitting the database.

interface RawRow {
  calendarId: string | null
  calendarName: string
  calendarColor: string
  totalSeconds: number
}

interface CalendarTimeData extends RawRow {
  percentage: number
}

/**
 * Mirrors the percentage + sort logic from lib/db/queries/calendars.ts:getTimeByCalendar
 */
function buildCalendarTimeData(rows: RawRow[]): CalendarTimeData[] {
  // Filter out zero-second entries (same as "if grandTotal === 0, return []")
  const nonZero = rows.filter((r) => r.totalSeconds > 0)
  if (nonZero.length === 0) return []

  const grandTotal = nonZero.reduce((acc, r) => acc + r.totalSeconds, 0)

  return nonZero
    .map((r) => ({
      ...r,
      percentage: Math.round((r.totalSeconds / grandTotal) * 100),
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CAL_TRABAJO = { calendarId: 'cal-1', calendarName: 'Trabajo', calendarColor: '#4285F4' }
const CAL_PERSONAL = { calendarId: 'cal-2', calendarName: 'Personal', calendarColor: '#34A853' }
const CAL_NONE = { calendarId: null, calendarName: 'Sin categoría', calendarColor: '#9CA3AF' }

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getTimeByCalendar — aggregation logic', () => {
  it('returns empty array when all totalSeconds are 0', () => {
    const rows: RawRow[] = [
      { ...CAL_TRABAJO, totalSeconds: 0 },
      { ...CAL_PERSONAL, totalSeconds: 0 },
    ]
    expect(buildCalendarTimeData(rows)).toHaveLength(0)
  })

  it('returns empty array when input is empty', () => {
    expect(buildCalendarTimeData([])).toHaveLength(0)
  })

  it('calculates correct percentage for each calendar', () => {
    const rows: RawRow[] = [
      { ...CAL_TRABAJO, totalSeconds: 3600 }, // 1h → 75%
      { ...CAL_PERSONAL, totalSeconds: 1200 }, // 20min → 25%
    ]
    const result = buildCalendarTimeData(rows)
    expect(result[0].calendarName).toBe('Trabajo')
    expect(result[0].percentage).toBe(75)
    expect(result[1].calendarName).toBe('Personal')
    expect(result[1].percentage).toBe(25)
  })

  it('percentages sum to approximately 100 (rounding allowed)', () => {
    const rows: RawRow[] = [
      { ...CAL_TRABAJO, totalSeconds: 3600 },
      { ...CAL_PERSONAL, totalSeconds: 1800 },
      { ...CAL_NONE, totalSeconds: 900 },
    ]
    const result = buildCalendarTimeData(rows)
    const total = result.reduce((acc, r) => acc + r.percentage, 0)
    // Rounding may cause 99 or 100
    expect(total).toBeGreaterThanOrEqual(99)
    expect(total).toBeLessThanOrEqual(100)
  })

  it('includes null-calendar bucket (Sin categoría)', () => {
    const rows: RawRow[] = [
      { ...CAL_TRABAJO, totalSeconds: 7200 },
      { ...CAL_NONE, totalSeconds: 3600 },
    ]
    const result = buildCalendarTimeData(rows)
    const noneRow = result.find((r) => r.calendarId === null)
    expect(noneRow).toBeDefined()
    expect(noneRow?.calendarName).toBe('Sin categoría')
    expect(noneRow?.calendarColor).toBe('#9CA3AF')
  })

  it('orders results by totalSeconds DESC', () => {
    const rows: RawRow[] = [
      { ...CAL_PERSONAL, totalSeconds: 900 },
      { ...CAL_TRABAJO, totalSeconds: 7200 },
      { ...CAL_NONE, totalSeconds: 1800 },
    ]
    const result = buildCalendarTimeData(rows)
    expect(result[0].calendarName).toBe('Trabajo') // 7200
    expect(result[1].calendarName).toBe('Sin categoría') // 1800
    expect(result[2].calendarName).toBe('Personal') // 900
  })

  it('excludes calendars with 0 totalSeconds from results', () => {
    const rows: RawRow[] = [
      { ...CAL_TRABAJO, totalSeconds: 3600 },
      { ...CAL_PERSONAL, totalSeconds: 0 },
    ]
    const result = buildCalendarTimeData(rows)
    expect(result).toHaveLength(1)
    expect(result[0].calendarName).toBe('Trabajo')
  })

  it('handles a single calendar — percentage is 100', () => {
    const rows: RawRow[] = [{ ...CAL_TRABAJO, totalSeconds: 5400 }]
    const result = buildCalendarTimeData(rows)
    expect(result).toHaveLength(1)
    expect(result[0].percentage).toBe(100)
  })
})
