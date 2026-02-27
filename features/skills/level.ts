// features/skills/level.ts
// Pure functions for skill level computation and progress tracking.
// Story 7.4 — Vista Progreso por Skill.

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface SkillProgress {
  currentLevel: SkillLevel
  nextLevel: SkillLevel | null
  /** 0-100 within the current level range */
  progressPercent: number
  /** Hours remaining to reach next level (null if already expert) */
  hoursToNextLevel: number | null
  /** Total hours invested */
  totalHours: number
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** Seconds threshold for each level */
export const SKILL_THRESHOLDS_SECONDS = {
  beginner: 0,
  intermediate: 50 * 3600, // 180 000s
  advanced: 200 * 3600, // 720 000s
  expert: 500 * 3600, // 1 800 000s
} as const

export const LEVEL_ORDER: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']

// ─── computeSkillLevel ────────────────────────────────────────────────────────

/**
 * Returns the skill level corresponding to the given accumulated seconds.
 * Thresholds: beginner (0-50h), intermediate (50-200h), advanced (200-500h), expert (500h+)
 */
export function computeSkillLevel(seconds: number): SkillLevel {
  if (seconds >= SKILL_THRESHOLDS_SECONDS.expert) return 'expert'
  if (seconds >= SKILL_THRESHOLDS_SECONDS.advanced) return 'advanced'
  if (seconds >= SKILL_THRESHOLDS_SECONDS.intermediate) return 'intermediate'
  return 'beginner'
}

// ─── getSkillProgress ────────────────────────────────────────────────────────

/**
 * Computes the progress of a skill given its accumulated seconds.
 * Returns current level, next level, progress percent within current level,
 * hours to next level, and total hours invested.
 */
export function getSkillProgress(timeInvestedSeconds: number): SkillProgress {
  const totalHours = timeInvestedSeconds / 3600
  const currentLevel = computeSkillLevel(timeInvestedSeconds)
  const currentIdx = LEVEL_ORDER.indexOf(currentLevel)
  const nextLevel = currentIdx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[currentIdx + 1] : null

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressPercent: 100,
      hoursToNextLevel: null,
      totalHours,
    }
  }

  const levelStart = SKILL_THRESHOLDS_SECONDS[currentLevel]
  const levelEnd = SKILL_THRESHOLDS_SECONDS[nextLevel]
  const progressInLevel = timeInvestedSeconds - levelStart
  const levelRange = levelEnd - levelStart
  const progressPercent = Math.min(100, Math.floor((progressInLevel / levelRange) * 100))
  const secondsToNext = levelEnd - timeInvestedSeconds
  const hoursToNextLevel = Math.ceil(secondsToNext / 3600)

  return { currentLevel, nextLevel, progressPercent, hoursToNextLevel, totalHours }
}
