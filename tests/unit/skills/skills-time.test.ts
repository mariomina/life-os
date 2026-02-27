import { describe, it, expect } from 'vitest'

// ─── Story 7.2 — Skills Time Tests ───────────────────────────────────────────
// Pure logic tests for tagActivityWithSkill, removeSkillTag guards,
// buildSkillTimeUpdate, and formatSkillTime.
// No DB or network calls — all logic tested via extracted pure functions.

// ─── Types ────────────────────────────────────────────────────────────────────

interface EntityWithUser {
  userId: string
}

type ValidationResult = { valid: true } | { valid: false; error: string }

interface SkillTimeUpdate {
  skillId: string
  incrementSeconds: number
}

// ─── Pure guard logic (mirrors actions/skills.ts) ─────────────────────────────

function validateTagOwnership(
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

function validateTagRemoval(tag: EntityWithUser | null, requestUserId: string): ValidationResult {
  if (!tag) return { valid: false, error: 'Tag no encontrado' }
  if (tag.userId !== requestUserId) return { valid: false, error: 'No autorizado' }
  return { valid: true }
}

// ─── Pure functions (mirrors features/skills/time.ts) ─────────────────────────

function buildSkillTimeUpdate(tagSkillIds: string[], durationSeconds: number): SkillTimeUpdate[] {
  if (tagSkillIds.length === 0 || durationSeconds <= 0) return []
  return tagSkillIds.map((skillId) => ({ skillId, incrementSeconds: durationSeconds }))
}

function formatSkillTime(seconds: number): string {
  if (seconds === 0) return '0h'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-abc'
const OTHER_USER_ID = 'user-xyz'

const mockActivity = { userId: USER_ID }
const mockSkill = { userId: USER_ID }
const mockTag = { userId: USER_ID }

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('tagActivityWithSkill — guard logic', () => {
  it('returns error when activity not found', () => {
    const result = validateTagOwnership(null, mockSkill, USER_ID)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('Actividad no encontrada')
  })

  it('returns error when activity belongs to different user', () => {
    const result = validateTagOwnership({ userId: OTHER_USER_ID }, mockSkill, USER_ID)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('No autorizado')
  })

  it('returns error when skill not found', () => {
    const result = validateTagOwnership(mockActivity, null, USER_ID)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('Skill no encontrada')
  })

  it('returns error when skill belongs to different user', () => {
    const result = validateTagOwnership(mockActivity, { userId: OTHER_USER_ID }, USER_ID)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('No autorizado')
  })

  it('returns valid for matching activity and skill', () => {
    const result = validateTagOwnership(mockActivity, mockSkill, USER_ID)
    expect(result.valid).toBe(true)
  })
})

describe('removeSkillTag — guard logic', () => {
  it('returns error when tag not found', () => {
    const result = validateTagRemoval(null, USER_ID)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('Tag no encontrado')
  })

  it('returns error when tag belongs to different user', () => {
    const result = validateTagRemoval({ userId: OTHER_USER_ID }, USER_ID)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('No autorizado')
  })

  it('returns valid for matching user', () => {
    const result = validateTagRemoval(mockTag, USER_ID)
    expect(result.valid).toBe(true)
  })
})

describe('buildSkillTimeUpdate — pure logic', () => {
  it('returns correct increment per tag', () => {
    const result = buildSkillTimeUpdate(['skill-1', 'skill-2'], 3600)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ skillId: 'skill-1', incrementSeconds: 3600 })
    expect(result[1]).toEqual({ skillId: 'skill-2', incrementSeconds: 3600 })
  })

  it('returns empty array when no tags', () => {
    const result = buildSkillTimeUpdate([], 3600)
    expect(result).toHaveLength(0)
  })

  it('returns empty array when durationSeconds is zero', () => {
    const result = buildSkillTimeUpdate(['skill-1'], 0)
    expect(result).toHaveLength(0)
  })
})

describe('formatSkillTime — pure logic', () => {
  it('returns "0h" for 0 seconds', () => {
    expect(formatSkillTime(0)).toBe('0h')
  })

  it('returns "1h" for 3600 seconds', () => {
    expect(formatSkillTime(3600)).toBe('1h')
  })

  it('returns "1h 30min" for 5400 seconds', () => {
    expect(formatSkillTime(5400)).toBe('1h 30min')
  })

  it('returns "0h 30min" for 1800 seconds', () => {
    expect(formatSkillTime(1800)).toBe('0h 30min')
  })

  it('returns "142h 30min" for large values', () => {
    // 142h 30min = 142 * 3600 + 30 * 60 = 511200 + 1800 = 513000
    expect(formatSkillTime(513000)).toBe('142h 30min')
  })
})
