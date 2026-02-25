// lib/habits/streak-utils.ts
// Pure function — no DB, no browser dependencies.
// Calculates habit streak metrics from an array of completion dates.

import { RRule } from 'rrule'

export interface StreakResult {
  current: number
  best: number
}

/**
 * Calculates the current and best streak for a habit.
 *
 * A streak increments by 1 for each occurrence that is completed AND
 * whose immediately preceding occurrence (per rrule schedule) was also completed.
 * If an occurrence is skipped (not in completionDates), the current streak resets to 0.
 *
 * Algorithm:
 * 1. Parse rrule to get all expected occurrences up to today.
 * 2. Walk occurrences in chronological order.
 * 3. If an occurrence date appears in completionDates → streak++
 *    Otherwise → reset current streak to 0.
 * 4. Track best streak throughout.
 *
 * @param completionDates - UTC dates when occurrences were marked 'completed'
 * @param rruleStr        - RFC 5545 rrule string for the habit
 * @param referenceDate   - Upper bound for occurrence expansion (defaults to now)
 * @returns { current, best }
 */
export function calculateStreak(
  completionDates: Date[],
  rruleStr: string,
  referenceDate: Date = new Date()
): StreakResult {
  if (completionDates.length === 0) {
    return { current: 0, best: 0 }
  }

  let rule: RRule
  try {
    rule = RRule.fromString(rruleStr)
  } catch {
    return { current: 0, best: 0 }
  }

  // Get all expected occurrences from rrule's dtstart up to referenceDate
  const dtstart = rule.options.dtstart ?? new Date(0)
  const allOccurrences = rule.between(dtstart, referenceDate, true)

  if (allOccurrences.length === 0) {
    return { current: 0, best: 0 }
  }

  // Build a Set of completion timestamps (ms) for O(1) lookup
  const completedSet = new Set(completionDates.map((d) => normalizeToDay(d).getTime()))

  let current = 0
  let best = 0

  for (const occurrence of allOccurrences) {
    const dayTs = normalizeToDay(occurrence).getTime()
    if (completedSet.has(dayTs)) {
      current++
      if (current > best) {
        best = current
      }
    } else {
      current = 0
    }
  }

  return { current, best }
}

/**
 * Normalizes a date to midnight UTC for day-level comparison.
 * This prevents time-of-day differences from breaking streak matching.
 */
function normalizeToDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}
