// features/habits/unconscious-detection.ts
// Story 8.5 — Detección de hábitos inconscientes desde patrones de activities.
// Reuses the same tokenization + term-frequency algorithm as Story 7.3 (detectEmergingSkills).

const STOP_WORDS = new Set([
  'de',
  'la',
  'el',
  'en',
  'y',
  'a',
  'los',
  'del',
  'se',
  'las',
  'por',
  'con',
  'para',
  'una',
  'un',
  'su',
  'al',
  'lo',
  'como',
  'más',
  'pero',
  'sus',
  'le',
  'ya',
  'o',
  'este',
  'sí',
  'porque',
  'esta',
  'entre',
  'cuando',
  'muy',
  'sin',
  'sobre',
  'también',
  'me',
  'hasta',
  'hay',
  'donde',
  'quien',
  'desde',
  'todo',
  'nos',
  'durante',
  'todos',
  'uno',
  'les',
  'ni',
  'contra',
  'otros',
  'ese',
  'eso',
  'the',
  'and',
  'for',
  'are',
  'with',
  'this',
  'that',
  'have',
  'from',
  'call',
  'check',
  'review',
  'follow',
  'update',
  'send',
  'meet',
])

const HABIT_MIN_OCCURRENCES = 7
const HABIT_MAX_INTERVAL_DAYS = 14
const HABIT_MIN_CONSISTENCY = 0.5

export interface UnconsciousHabitSuggestion {
  term: string
  occurrences: number
  avgIntervalDays: number
  consistency: number
}

interface ActivityInput {
  title: string
  scheduledAt: Date | string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
}

function toDayStamp(date: Date | string | null): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  return Math.floor(d.getTime() / (1000 * 60 * 60 * 24))
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Detects unconscious habits from activity patterns.
 *
 * @param activities - Activities with title + scheduledAt from last 90 days
 * @param existingHabitNames - Habit names already registered (to exclude)
 * @returns Suggestions sorted by occurrences desc
 */
export function detectUnconsciousHabits(
  activities: ActivityInput[],
  existingHabitNames: string[]
): UnconsciousHabitSuggestion[] {
  const existingNamesLower = new Set(existingHabitNames.map((n) => n.toLowerCase()))

  // Build term → sorted list of day-stamps
  const termDays = new Map<string, number[]>()

  for (const activity of activities) {
    const dayStamp = toDayStamp(activity.scheduledAt)
    if (dayStamp === null) continue
    const terms = tokenize(activity.title)
    for (const term of terms) {
      if (!termDays.has(term)) termDays.set(term, [])
      const days = termDays.get(term)!
      if (!days.includes(dayStamp)) days.push(dayStamp)
    }
  }

  const suggestions: UnconsciousHabitSuggestion[] = []

  for (const [term, days] of termDays) {
    // Exclude existing habit names
    if (existingNamesLower.has(term)) continue

    const occurrences = days.length

    if (occurrences < HABIT_MIN_OCCURRENCES) continue

    // Sort days to compute intervals
    const sorted = [...days].sort((a, b) => a - b)
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(sorted[i] - sorted[i - 1])
    }

    if (intervals.length === 0) continue

    const avgIntervalDays = intervals.reduce((s, v) => s + v, 0) / intervals.length
    if (avgIntervalDays > HABIT_MAX_INTERVAL_DAYS) continue

    // Consistency: 1 - (stdDev / mean), clamped 0-1
    const consistency = Math.max(
      0,
      Math.min(1, 1 - stdDev(intervals) / Math.max(avgIntervalDays, 0.001))
    )
    if (consistency < HABIT_MIN_CONSISTENCY) continue

    suggestions.push({
      term,
      occurrences,
      avgIntervalDays: Math.round(avgIntervalDays * 10) / 10,
      consistency: Math.round(consistency * 100) / 100,
    })
  }

  return suggestions.sort((a, b) => b.occurrences - a.occurrences)
}
