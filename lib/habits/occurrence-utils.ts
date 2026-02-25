// lib/habits/occurrence-utils.ts
// Pure function — no DB, no browser dependencies.
// Expands a habit's rrule string into concrete Date occurrences
// within a given [windowStart, windowEnd] range.

import { RRule } from 'rrule'
import type { Habit } from '@/lib/db/schema/habits'

/**
 * Generates all occurrence dates for a habit within [windowStart, windowEnd].
 *
 * Uses the RFC 5545 rrule string stored in habit.rrule.
 * Returned dates are UTC — do NOT convert to local time in this function.
 *
 * @param habit  - Habit record (only .rrule is used)
 * @param windowStart - Start of the window (inclusive)
 * @param windowEnd   - End of the window (inclusive)
 * @returns Array of UTC Date objects, one per occurrence in the window
 * @throws Error if habit.rrule is not a valid RFC 5545 string
 */
export function generateHabitOccurrences(
  habit: Pick<Habit, 'rrule'>,
  windowStart: Date,
  windowEnd: Date
): Date[] {
  if (windowEnd < windowStart) {
    return []
  }

  let rule: RRule
  try {
    const parsed = RRule.fromString(habit.rrule)
    const options = { ...parsed.options }
    // rrule 2.x: when no DTSTART is in the string, it defaults to "now",
    // which breaks .between() for historical windows.
    // Always override dtstart to windowStart so expansion is anchored correctly.
    options.dtstart = windowStart
    rule = new RRule(options)
  } catch {
    throw new Error(`Invalid rrule: ${habit.rrule}`)
  }

  return rule.between(windowStart, windowEnd, true)
}

/**
 * Builds a valid RFC 5545 rrule string from common frequency presets.
 *
 * @param frequency - 'daily' | 'weekly'
 * @param hour      - Hour of day (0-23), default 7
 * @param days      - For weekly: array of weekday numbers (0=Mon, 6=Sun per rrule)
 * @returns RFC 5545 rrule string
 */
export function buildRruleString(frequency: 'daily' | 'weekly', hour = 7, days?: number[]): string {
  const byHourMinute = `BYHOUR=${hour};BYMINUTE=0;BYSECOND=0`

  if (frequency === 'daily') {
    return `FREQ=DAILY;${byHourMinute}`
  }

  const dayNames = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  const byDay =
    days && days.length > 0 ? `BYDAY=${days.map((d) => dayNames[d]).join(',')}` : 'BYDAY=MO,WE,FR'

  return `FREQ=WEEKLY;${byDay};${byHourMinute}`
}

/**
 * Validates a raw rrule string by attempting to parse it.
 *
 * @param rruleStr - RFC 5545 rrule string to validate
 * @returns true if valid, false otherwise
 */
export function isValidRrule(rruleStr: string): boolean {
  try {
    RRule.fromString(rruleStr)
    return true
  } catch {
    return false
  }
}

/**
 * Returns a human-readable description of an rrule string.
 * Example: "FREQ=DAILY;BYHOUR=7" → "Diario a las 07:00"
 *
 * @param rruleStr - RFC 5545 rrule string
 * @returns Human-readable string (Spanish)
 */
export function describeRrule(rruleStr: string): string {
  try {
    const rule = RRule.fromString(rruleStr)
    const options = rule.options

    const freq = options.freq
    const hour = options.byhour?.[0] ?? 7
    const minute = options.byminute?.[0] ?? 0
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

    if (freq === RRule.DAILY) {
      return `Diario a las ${timeStr}`
    }

    if (freq === RRule.WEEKLY) {
      const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      // rrule weekdays: MO=0, TU=1, ..., SU=6
      const days = options.byweekday
        ?.map((d: number | { weekday: number }) => {
          const idx = typeof d === 'number' ? d : d.weekday
          return dayNames[idx]
        })
        .join(', ')
      return days ? `Semanal (${days}) a las ${timeStr}` : `Semanal a las ${timeStr}`
    }

    return rruleStr
  } catch {
    return rruleStr
  }
}
