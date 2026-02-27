// features/skills/time.ts
// Pure functions for skill time tracking.
// Story 7.2 — Tiempo Invertido Automático.

// ─── formatSkillTime ──────────────────────────────────────────────────────────

/**
 * Formats skill time in seconds to human-readable string.
 * Used in SkillsClient (list) and CalendarClient (tag badges).
 *
 * Examples:
 *   0       → "0h"
 *   3600    → "1h"
 *   5400    → "1h 30min"
 *   1800    → "0h 30min"
 *   512100  → "142h 30min"
 */
export function formatSkillTime(seconds: number): string {
  if (seconds === 0) return '0h'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

// ─── buildSkillTimeUpdate ────────────────────────────────────────────────────

export interface SkillTimeUpdate {
  skillId: string
  incrementSeconds: number
}

/**
 * Builds skill time update payloads from a list of tagged skill IDs.
 * Used by stopTimer to propagate time atomically to each tagged skill.
 * Returns empty array when there are no tags or durationSeconds is 0.
 */
export function buildSkillTimeUpdate(
  tagSkillIds: string[],
  durationSeconds: number
): SkillTimeUpdate[] {
  if (tagSkillIds.length === 0 || durationSeconds <= 0) return []
  return tagSkillIds.map((skillId) => ({ skillId, incrementSeconds: durationSeconds }))
}

// ─── Ownership validation ─────────────────────────────────────────────────────

interface EntityWithUser {
  userId: string
}

type ValidationResult = { valid: true } | { valid: false; error: string }

/**
 * Validates ownership for tagActivityWithSkill.
 * Both the activity and the skill must belong to the requesting user.
 */
export function validateTagOwnership(
  activity: EntityWithUser | null,
  skill: EntityWithUser | null,
  requestUserId: string
): ValidationResult {
  if (!activity) return { valid: false, error: 'Actividad no encontrada' }
  if (activity.userId !== requestUserId) return { valid: false, error: 'No autorizado' }
  if (!skill) return { valid: false, error: 'Skill no encontrada' }
  if (skill.userId !== requestUserId) return { valid: false, error: 'No autorizado' }
  return { valid: true }
}

/**
 * Validates ownership for removeSkillTag.
 * The tag's userId must match the requesting user.
 */
export function validateTagRemoval(
  tag: EntityWithUser | null,
  requestUserId: string
): ValidationResult {
  if (!tag) return { valid: false, error: 'Tag no encontrado' }
  if (tag.userId !== requestUserId) return { valid: false, error: 'No autorizado' }
  return { valid: true }
}
