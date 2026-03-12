import { describe, it, expect } from 'vitest'
import { checkHierarchyBlock } from '@/features/maslow/hierarchy-guard'
import type { Area } from '@/lib/db/schema/areas'
import type { AreaScore } from '@/lib/db/schema/area-scores'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeArea(maslowLevel: number, name: string): Area {
  return {
    id: `area-${maslowLevel}`,
    userId: 'user-1',
    maslowLevel,
    group: maslowLevel <= 4 ? 'd_needs' : 'b_needs',
    name,
    defaultName: name,
    weightMultiplier: '1.0',
    currentScore: 70,
    lastActivityAt: null,
    scoreUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Builds a consecutive score history for a given area.
 * Scores are listed from MOST RECENT to OLDEST (desc order, as getRecentAreaScores returns).
 * @param areaId
 * @param scores - array of score values, index 0 = today, index 1 = yesterday, etc.
 * @param baseDate - reference "today" (default: 2026-01-30)
 */
function makeHistory(areaId: string, scores: number[], baseDate = '2026-01-30'): AreaScore[] {
  const base = new Date(baseDate)
  return scores.map((score, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    const scoredAt = d.toISOString().slice(0, 10) // YYYY-MM-DD
    return {
      id: `score-${areaId}-${i}`,
      areaId,
      userId: 'user-1',
      score,
      scoredAt,
      createdAt: new Date(),
    }
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('checkHierarchyBlock', () => {
  it('returns isBlocked=false and empty array when no areas', () => {
    const result = checkHierarchyBlock([], [])
    expect(result.isBlocked).toBe(false)
    expect(result.blockedAreas).toHaveLength(0)
  })

  it('returns isBlocked=false when no score history exists for level 1 area', () => {
    const area = makeArea(1, 'Fisiológica')
    const result = checkHierarchyBlock([area], [])
    expect(result.isBlocked).toBe(false)
  })

  it('returns isBlocked=false when level 1 area has <14 days with score <50', () => {
    const area = makeArea(1, 'Fisiológica')
    // Only 10 consecutive days below 50
    const history = makeHistory(area.id, Array(10).fill(40))
    const result = checkHierarchyBlock([area], history)
    expect(result.isBlocked).toBe(false)
  })

  it('returns isBlocked=true when level 1 area has exactly 14 consecutive days <50', () => {
    const area = makeArea(1, 'Fisiológica')
    const history = makeHistory(area.id, Array(14).fill(45))
    const result = checkHierarchyBlock([area], history)
    expect(result.isBlocked).toBe(true)
    expect(result.blockedAreas).toHaveLength(1)
    expect(result.blockedAreas[0].areaId).toBe(area.id)
    expect(result.blockedAreas[0].consecutiveDaysBelow50).toBe(14)
  })

  it('returns isBlocked=true when level 2 area has >14 consecutive days <50', () => {
    const area = makeArea(2, 'Seguridad')
    const history = makeHistory(area.id, Array(20).fill(30))
    const result = checkHierarchyBlock([area], history)
    expect(result.isBlocked).toBe(true)
    expect(result.blockedAreas[0].maslowLevel).toBe(2)
    expect(result.blockedAreas[0].consecutiveDaysBelow50).toBe(20)
  })

  it('returns isBlocked=false when level 1 area score >= 50 (even for >14 days)', () => {
    const area = makeArea(1, 'Fisiológica')
    const history = makeHistory(area.id, Array(20).fill(50)) // exactly 50 — NOT below threshold
    const result = checkHierarchyBlock([area], history)
    expect(result.isBlocked).toBe(false)
  })

  it('returns isBlocked=false when level 1 area has score 51 for 20 days', () => {
    const area = makeArea(1, 'Fisiológica')
    const history = makeHistory(area.id, Array(20).fill(51))
    const result = checkHierarchyBlock([area], history)
    expect(result.isBlocked).toBe(false)
  })

  it('returns isBlocked=false for level 3-8 areas with low scores', () => {
    const areas = [3, 4, 5, 6, 7, 8].map((l) => makeArea(l, `Área ${l}`))
    const history = areas.flatMap((a) => makeHistory(a.id, Array(20).fill(10)))
    const result = checkHierarchyBlock(areas, history)
    expect(result.isBlocked).toBe(false)
  })

  it('breaks streak when there is a gap in the history', () => {
    const area = makeArea(1, 'Fisiológica')
    // 10 days below 50, then a gap, then more days below 50
    // Gap: skip day index 10 (not included), so consecutive streak = 10
    const scores = makeHistory(area.id, Array(10).fill(40))
    // Skip day 10 → start again from day 11 (non-consecutive)
    const older = makeHistory(area.id, Array(10).fill(40), '2026-01-15')
    const result = checkHierarchyBlock([area], [...scores, ...older])
    expect(result.isBlocked).toBe(false) // streak broken at gap
  })

  it('breaks streak when a day above threshold appears in the middle', () => {
    const area = makeArea(1, 'Fisiológica')
    // 15 days: first 7 below 50, then 1 day above, then 7 more below
    const scores = [
      ...makeHistory(area.id, Array(7).fill(40)), // today → 7 days ago: <50
    ]
    // Insert a day with score 60 (above threshold) at day index 7
    const mid = new Date('2026-01-30')
    mid.setDate(mid.getDate() - 7)
    scores.push({
      id: 'score-mid',
      areaId: area.id,
      userId: 'user-1',
      score: 60,
      scoredAt: mid.toISOString().slice(0, 10),
      createdAt: new Date(),
    })
    const result = checkHierarchyBlock([area], scores)
    expect(result.isBlocked).toBe(false) // only 7 consecutive, not 14
  })

  it('returns correct currentScore (most recent entry)', () => {
    const area = makeArea(1, 'Fisiológica')
    // 14 consecutive days below 50: most recent (today) = score 35, rest = 40
    const scoreValues = [35, ...Array(13).fill(40)] // 14 entries
    const history = makeHistory(area.id, scoreValues)
    const result = checkHierarchyBlock([area], history)
    expect(result.isBlocked).toBe(true)
    expect(result.blockedAreas[0].currentScore).toBe(35)
  })

  it('returns multiple blocked areas when both level 1 and level 2 are in crisis', () => {
    const area1 = makeArea(1, 'Fisiológica')
    const area2 = makeArea(2, 'Seguridad')
    const history = [
      ...makeHistory(area1.id, Array(15).fill(30)),
      ...makeHistory(area2.id, Array(15).fill(20)),
    ]
    const result = checkHierarchyBlock([area1, area2], history)
    expect(result.isBlocked).toBe(true)
    expect(result.blockedAreas).toHaveLength(2)
  })

  it('correctly ignores level 3+ areas even when mixed with level 1-2', () => {
    const area1 = makeArea(1, 'Fisiológica') // level 1 — in crisis
    const area3 = makeArea(3, 'Social') // level 3 — should be ignored
    const history = [
      ...makeHistory(area1.id, Array(15).fill(30)),
      ...makeHistory(area3.id, Array(15).fill(10)), // even lower score — but not blocking
    ]
    const result = checkHierarchyBlock([area1, area3], history)
    expect(result.isBlocked).toBe(true)
    expect(result.blockedAreas).toHaveLength(1)
    expect(result.blockedAreas[0].areaId).toBe(area1.id)
  })
})
