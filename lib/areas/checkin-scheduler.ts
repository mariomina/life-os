// lib/areas/checkin-scheduler.ts
// Lógica de detección de checkins subjetivos pendientes.
// Story 11.5 — Checkin Periódico por Sub-área.

import type { AreaSubarea } from '@/lib/db/schema/area-subareas'
import type { AreaSubareaScore } from '@/lib/db/schema/area-subarea-scores'
import { CHECKIN_QUESTIONS } from './checkin-questions'

type CycleType = 'daily' | 'weekly' | 'monthly' | 'quarterly'

/**
 * Returns the start-of-period Date for a given cycleType relative to `now`.
 * Used to determine if a score is stale (before the current period).
 */
export function getPeriodStart(cycleType: CycleType, now: Date): Date {
  const d = new Date(now)
  d.setUTCHours(0, 0, 0, 0)

  if (cycleType === 'daily') {
    // start of today UTC
    return d
  }

  if (cycleType === 'weekly') {
    // start of current week (Monday UTC)
    const day = d.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
    const diff = day === 0 ? -6 : 1 - day // days back to Monday
    d.setUTCDate(d.getUTCDate() + diff)
    return d
  }

  if (cycleType === 'monthly') {
    // start of current month UTC
    d.setUTCDate(1)
    return d
  }

  // quarterly: start of current quarter (Jan 1, Apr 1, Jul 1, Oct 1)
  const month = d.getUTCMonth() // 0-11
  const quarterStartMonth = Math.floor(month / 3) * 3
  d.setUTCMonth(quarterStartMonth, 1)
  return d
}

/**
 * Returns sub-areas whose subjective checkin is overdue for the current period.
 *
 * A checkin is considered overdue when:
 *   - The sub-area has a checkin question defined (via CHECKIN_QUESTIONS)
 *   - AND there is no score entry with scoredAt >= start of current cycle period
 *
 * @param subareas   - All active sub-areas for the user
 * @param lastScores - Most recent score entry per subarea (scoredAt as Date or string)
 * @param now        - Reference date (typically new Date())
 */
export function getPendingCheckins(
  subareas: AreaSubarea[],
  lastScores: Pick<AreaSubareaScore, 'subareaId' | 'scoredAt'>[],
  now: Date
): AreaSubarea[] {
  // Build a map: subareaId → most recent scoredAt Date
  const lastScoreMap = new Map<string, Date>()
  for (const score of lastScores) {
    const d = new Date(score.scoredAt)
    const existing = lastScoreMap.get(score.subareaId)
    if (!existing || d > existing) {
      lastScoreMap.set(score.subareaId, d)
    }
  }

  return subareas.filter((subarea) => {
    const question = CHECKIN_QUESTIONS.find((q) => q.subareaSlug === subarea.slug)
    if (!question) return false // no question defined → not required

    const periodStart = getPeriodStart(question.cycleType, now)
    const lastScored = lastScoreMap.get(subarea.id)

    if (!lastScored) return true // never answered → overdue

    // scoredAt from DB is a date string (YYYY-MM-DD), normalize to UTC midnight
    const lastScoredUtc = new Date(lastScored)
    lastScoredUtc.setUTCHours(0, 0, 0, 0)

    return lastScoredUtc < periodStart // scored before current period → overdue
  })
}

/**
 * Normalizes a 1-10 score to a 0-100 range.
 * Formula: (score - 1) / 9 * 100, rounded to nearest integer.
 *
 * Boundary values: 1 → 0, 5 → 44, 10 → 100
 */
export function normalizeScore(score: number): number {
  if (score < 1 || score > 10) {
    throw new RangeError(`Score must be between 1 and 10, got ${score}`)
  }
  return Math.round(((score - 1) / 9) * 100)
}
