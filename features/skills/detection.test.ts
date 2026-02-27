import { describe, it, expect } from 'vitest'
import { detectEmergingSkills } from './detection'

// ─── Story 7.3 — detectEmergingSkills Tests ───────────────────────────────────
// Pure logic tests for the emerging skill detection algorithm.
// Thresholds: MIN_ACTIVITIES = 5, MIN_SECONDS = 3600.

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates N activities all containing the given term in their title */
function makeActivities(term: string, count: number, secondsEach: number) {
  return Array.from({ length: count }, (_, i) => ({
    title: `${term} practice session ${i + 1}`,
    totalSeconds: secondsEach,
  }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('detectEmergingSkills — pure logic', () => {
  it('returns empty array when no activities', () => {
    expect(detectEmergingSkills([], [])).toEqual([])
  })

  it('returns empty when all activities are below activity threshold (< 5)', () => {
    // Only 4 activities with "typescript" — below MIN_ACTIVITIES=5
    const activities = makeActivities('typescript', 4, 1000)
    expect(detectEmergingSkills(activities, [])).toEqual([])
  })

  it('detects term appearing in ≥5 activities with ≥1h total', () => {
    // 5 activities × 900s = 4500s (≥ 3600s) — should appear
    const activities = makeActivities('typescript', 5, 900)
    const result = detectEmergingSkills(activities, [])
    expect(result.length).toBeGreaterThanOrEqual(1)
    const ts = result.find((s) => s.term === 'typescript')
    expect(ts).toBeDefined()
    expect(ts!.activityCount).toBe(5)
    expect(ts!.totalSeconds).toBe(4500)
  })

  it('excludes terms already in existingSkillNames (case-insensitive)', () => {
    const activities = makeActivities('typescript', 5, 900)
    // TypeScript already registered → not a suggestion
    const result = detectEmergingSkills(activities, ['TypeScript'])
    expect(result.find((s) => s.term === 'typescript')).toBeUndefined()
  })

  it('excludes stop words (meeting, review, etc.)', () => {
    // "meeting" is a stop word — should never appear as suggestion
    const activities = makeActivities('meeting', 10, 800)
    const result = detectEmergingSkills(activities, [])
    expect(result.find((s) => s.term === 'meeting')).toBeUndefined()
  })

  it('excludes terms with <5 activities despite high time', () => {
    // 4 activities × 5000s = 20000s — enough time but not enough activities
    const activities = makeActivities('python', 4, 5000)
    const result = detectEmergingSkills(activities, [])
    expect(result.find((s) => s.term === 'python')).toBeUndefined()
  })

  it('excludes terms with ≥5 activities but <1h total', () => {
    // 5 activities × 600s = 3000s — enough activities but not enough time
    const activities = makeActivities('python', 5, 600)
    const result = detectEmergingSkills(activities, [])
    expect(result.find((s) => s.term === 'python')).toBeUndefined()
  })

  it('sorts by totalSeconds descending', () => {
    const reactActivities = makeActivities('react', 5, 1000) // 5000s total
    const pythonActivities = makeActivities('python', 5, 2000) // 10000s total
    const vueActivities = makeActivities('vuejs', 5, 800) // 4000s total
    const activities = [...reactActivities, ...pythonActivities, ...vueActivities]
    const result = detectEmergingSkills(activities, [])
    const terms = result.map((s) => s.term)
    const pythonIdx = terms.indexOf('python')
    const reactIdx = terms.indexOf('react')
    const vueIdx = terms.indexOf('vuejs')
    expect(pythonIdx).toBeLessThan(reactIdx)
    expect(reactIdx).toBeLessThan(vueIdx)
  })

  it('handles activities with 0 seconds (excluded by time filter)', () => {
    // 10 activities × 0s = 0s — no time, excluded by MIN_SECONDS
    const activities = makeActivities('golang', 10, 0)
    const result = detectEmergingSkills(activities, [])
    expect(result.find((s) => s.term === 'golang')).toBeUndefined()
  })

  it('case-insensitive match with existingSkillNames', () => {
    // "RUST" skill exists → "rust" term should be excluded
    const activities = makeActivities('rust', 5, 900)
    const result = detectEmergingSkills(activities, ['RUST'])
    expect(result.find((s) => s.term === 'rust')).toBeUndefined()
  })

  it('does not double-count repeated word in same activity title', () => {
    // Title "typescript typescript advanced" — should count typescript only once per activity
    const activities = Array.from({ length: 5 }, () => ({
      title: 'typescript typescript advanced',
      totalSeconds: 800,
    }))
    const result = detectEmergingSkills(activities, [])
    const ts = result.find((s) => s.term === 'typescript')
    // Each activity should count once (activityCount=5, not 10)
    expect(ts?.activityCount).toBe(5)
  })
})
