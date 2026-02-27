// features/skills/detection.ts
// Pure function for detecting emerging skills from activity patterns.
// Story 7.3 — Detección Emergente de Habilidades.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmergingSkillSuggestion {
  term: string
  totalSeconds: number
  activityCount: number
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** Terms that are too generic to be considered skills */
const STOP_WORDS = new Set([
  'meeting',
  'call',
  'check',
  'review',
  'daily',
  'weekly',
  'session',
  'work',
  'task',
  'item',
  'todo',
  'misc',
  'with',
  'from',
  'that',
  'this',
  'para',
  'with',
])

/** Minimum number of distinct activities a term must appear in */
const MIN_ACTIVITIES = 5

/** Minimum total seconds invested for a term to be suggested */
const MIN_SECONDS = 3600

// ─── detectEmergingSkills ─────────────────────────────────────────────────────

/**
 * Detects recurring skill-like terms from activity titles.
 *
 * Algorithm:
 *  1. Tokenize all activity titles into words (length > 3, no stop words)
 *  2. Aggregate per word: total seconds + distinct activity count
 *  3. Filter: >= MIN_ACTIVITIES AND >= MIN_SECONDS AND not already a skill
 *  4. Sort by totalSeconds descending
 *
 * @param activities - Array of { title, totalSeconds } from the user's recent activities
 * @param existingSkillNames - Names of skills the user already has (to avoid duplicates)
 */
export function detectEmergingSkills(
  activities: { title: string; totalSeconds: number }[],
  existingSkillNames: string[]
): EmergingSkillSuggestion[] {
  const existingLower = new Set(existingSkillNames.map((n) => n.toLowerCase()))
  const termMap = new Map<string, { totalSeconds: number; activityCount: number }>()

  for (const activity of activities) {
    // Tokenize title: lowercase, strip non-alphanumeric, split on whitespace
    const words = activity.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))

    // Deduplicate words within the same activity to avoid double-counting
    const seenInActivity = new Set<string>()
    for (const word of words) {
      if (seenInActivity.has(word)) continue
      seenInActivity.add(word)

      const prev = termMap.get(word) ?? { totalSeconds: 0, activityCount: 0 }
      termMap.set(word, {
        totalSeconds: prev.totalSeconds + activity.totalSeconds,
        activityCount: prev.activityCount + 1,
      })
    }
  }

  return Array.from(termMap.entries())
    .filter(
      ([term, data]) =>
        data.activityCount >= MIN_ACTIVITIES &&
        data.totalSeconds >= MIN_SECONDS &&
        !existingLower.has(term)
    )
    .map(([term, data]) => ({ term, ...data }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
}
