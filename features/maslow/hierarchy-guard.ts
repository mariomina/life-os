import type { Area } from '@/lib/db/schema/areas'
import type { AreaScore } from '@/lib/db/schema/area-scores'

export interface BlockedArea {
  areaId: string
  areaName: string
  maslowLevel: number
  currentScore: number
  consecutiveDaysBelow50: number
}

export interface HierarchyBlockResult {
  isBlocked: boolean
  blockedAreas: BlockedArea[]
}

const CRISIS_SCORE_THRESHOLD = 50
const CRISIS_DAYS_THRESHOLD = 14
const BLOCKING_LEVELS = new Set([1, 2])

/**
 * Groups AreaScore[] by areaId, sorted descending by scoredAt (most recent first).
 * scoredAt is a date string (YYYY-MM-DD) from Drizzle `date` column.
 */
function groupScoresByArea(scoreHistory: AreaScore[]): Map<string, AreaScore[]> {
  const map = new Map<string, AreaScore[]>()
  for (const s of scoreHistory) {
    if (!map.has(s.areaId)) map.set(s.areaId, [])
    map.get(s.areaId)!.push(s)
  }
  // Sort each group desc (most recent first)
  for (const [, scores] of map) {
    scores.sort((a, b) => (a.scoredAt > b.scoredAt ? -1 : 1))
  }
  return map
}

/**
 * Counts the number of consecutive days (from the most recent score backwards)
 * where score < CRISIS_SCORE_THRESHOLD.
 *
 * We treat entries as "consecutive days" by checking that each entry is
 * exactly 1 day before the previous one. Gaps in the history break the streak.
 */
function countConsecutiveDaysBelow50(scores: AreaScore[]): number {
  if (scores.length === 0) return 0

  let count = 0
  let prevDate: string | null = null

  for (const entry of scores) {
    if (entry.score >= CRISIS_SCORE_THRESHOLD) break

    if (prevDate !== null) {
      // Check that this entry is exactly the previous calendar day
      const prev = new Date(prevDate)
      const curr = new Date(entry.scoredAt)
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays !== 1) break // gap in history → streak broken
    }

    count++
    prevDate = entry.scoredAt
  }

  return count
}

/**
 * Checks whether any D-Needs critical area (maslow level 1-2) has been
 * in crisis (score < 50%) for more than 14 consecutive days.
 *
 * If the score history has fewer than 14 days of data → NO block
 * (benefit of the doubt for new users).
 *
 * @param areas - All user areas (from getUserAreas)
 * @param scoreHistory - Recent area score records (from getRecentAreaScores, days ≥ 30)
 */
export function checkHierarchyBlock(
  areas: Area[],
  scoreHistory: AreaScore[]
): HierarchyBlockResult {
  const blockedAreas: BlockedArea[] = []
  const scoresByArea = groupScoresByArea(scoreHistory)

  for (const area of areas) {
    if (!BLOCKING_LEVELS.has(area.maslowLevel)) continue

    const history = scoresByArea.get(area.id) ?? []
    if (history.length === 0) continue // no history → benefit of doubt

    const consecutiveDays = countConsecutiveDaysBelow50(history)

    if (consecutiveDays >= CRISIS_DAYS_THRESHOLD) {
      blockedAreas.push({
        areaId: area.id,
        areaName: area.name,
        maslowLevel: area.maslowLevel,
        currentScore: history[0].score, // most recent score
        consecutiveDaysBelow50: consecutiveDays,
      })
    }
  }

  return {
    isBlocked: blockedAreas.length > 0,
    blockedAreas,
  }
}
