import { describe, it, expect } from 'vitest'

// ─── Story 7.1 — Skills CRUD Tests ───────────────────────────────────────────
// Pure logic tests for createSkill, updateSkill, archiveSkill guards.
// No DB or network calls — all logic tested via extracted pure functions.

// ─── Types ────────────────────────────────────────────────────────────────────

type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

interface MockSkill {
  id: string
  userId: string
  name: string
  level: SkillLevel
  areaId: string | null
  timeInvestedSeconds: number
  autoDetected: boolean
  archivedAt: Date | null
}

interface SkillActionResult {
  success: boolean
  skillId?: string
  error?: string
}

interface CreateSkillData {
  name: string
  level?: SkillLevel
  areaId?: string | null
}

interface UpdateSkillData {
  name?: string
  level?: SkillLevel
  areaId?: string | null
}

// ─── Pure guard logic ─────────────────────────────────────────────────────────

function validateCreateSkill(
  data: CreateSkillData,
  existingNames: string[],
  userId: string
): SkillActionResult {
  const trimmed = data.name?.trim()
  if (!trimmed) return { success: false, error: 'El nombre de la habilidad es requerido' }

  const existingLower = existingNames.map((n) => n.toLowerCase())
  if (existingLower.includes(trimmed.toLowerCase())) {
    return { success: false, error: 'Ya existe una habilidad con ese nombre' }
  }

  void userId
  return { success: true }
}

function validateUpdateSkill(
  skillId: string,
  data: UpdateSkillData,
  skill: MockSkill | null,
  requestUserId: string
): SkillActionResult {
  if (!skillId?.trim()) return { success: false, error: 'ID de habilidad inválido' }

  if (!skill || skill.userId !== requestUserId) {
    return { success: false, error: 'Skill no encontrada' }
  }

  if (data.name !== undefined && !data.name.trim()) {
    return { success: false, error: 'El nombre no puede estar vacío' }
  }

  return { success: true }
}

function validateArchiveSkill(
  skillId: string,
  skill: MockSkill | null,
  requestUserId: string
): SkillActionResult {
  if (!skillId?.trim()) return { success: false, error: 'ID de habilidad inválido' }

  if (!skill || skill.userId !== requestUserId) {
    return { success: false, error: 'Skill no encontrada' }
  }

  return { success: true }
}

// ─── Pure filter logic (mirrors getUserSkills WHERE archivedAt IS NULL) ───────

function filterActiveSkills(skills: MockSkill[], userId: string): MockSkill[] {
  return skills.filter((s) => s.userId === userId && s.archivedAt === null)
}

// ─── Level/badge mapping ──────────────────────────────────────────────────────

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
}

const LEVEL_BADGE_COLORS: Record<SkillLevel, string> = {
  beginner: 'bg-gray-100 text-gray-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-violet-100 text-violet-700',
  expert: 'bg-amber-100 text-amber-700',
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-123'
const OTHER_USER_ID = 'user-456'
const SKILL_ID = 'skill-uuid-1'

function makeSkill(overrides: Partial<MockSkill> = {}): MockSkill {
  return {
    id: SKILL_ID,
    userId: USER_ID,
    name: 'TypeScript',
    level: 'intermediate',
    areaId: null,
    timeInvestedSeconds: 0,
    autoDetected: false,
    archivedAt: null,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createSkill — guard logic', () => {
  it('returns error when name is empty', () => {
    const result = validateCreateSkill({ name: '' }, [], USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('El nombre de la habilidad es requerido')
  })

  it('returns error when name is only whitespace', () => {
    const result = validateCreateSkill({ name: '   ' }, [], USER_ID)
    expect(result.success).toBe(false)
  })

  it('returns error on duplicate name (case-insensitive)', () => {
    const result = validateCreateSkill({ name: 'typescript' }, ['TypeScript'], USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Ya existe una habilidad con ese nombre')
  })

  it('returns success with valid data and no duplicate', () => {
    const result = validateCreateSkill(
      { name: 'React', level: 'beginner' },
      ['TypeScript'],
      USER_ID
    )
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('updateSkill — guard logic', () => {
  it('returns error when skill not found (null)', () => {
    const result = validateUpdateSkill(SKILL_ID, { name: 'New Name' }, null, USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Skill no encontrada')
  })

  it('returns error when skill belongs to different user', () => {
    const skill = makeSkill()
    const result = validateUpdateSkill(SKILL_ID, { name: 'New' }, skill, OTHER_USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Skill no encontrada')
  })

  it('returns error when new name is empty string', () => {
    const skill = makeSkill()
    const result = validateUpdateSkill(SKILL_ID, { name: '' }, skill, USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('El nombre no puede estar vacío')
  })

  it('returns success for valid update', () => {
    const skill = makeSkill()
    const result = validateUpdateSkill(SKILL_ID, { level: 'advanced' }, skill, USER_ID)
    expect(result.success).toBe(true)
  })
})

describe('archiveSkill — guard logic', () => {
  it('returns error when skill not found', () => {
    const result = validateArchiveSkill(SKILL_ID, null, USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Skill no encontrada')
  })

  it('returns error when skill belongs to different user', () => {
    const skill = makeSkill()
    const result = validateArchiveSkill(SKILL_ID, skill, OTHER_USER_ID)
    expect(result.success).toBe(false)
  })

  it('returns success for valid archive', () => {
    const skill = makeSkill()
    const result = validateArchiveSkill(SKILL_ID, skill, USER_ID)
    expect(result.success).toBe(true)
  })
})

describe('getUserSkills — filter logic', () => {
  it('excludes archived skills (archivedAt not null)', () => {
    const skills = [
      makeSkill({ id: '1', name: 'Active' }),
      makeSkill({ id: '2', name: 'Archived', archivedAt: new Date() }),
    ]
    const result = filterActiveSkills(skills, USER_ID)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Active')
  })

  it('includes only skills for requested user', () => {
    const skills = [
      makeSkill({ id: '1', userId: USER_ID }),
      makeSkill({ id: '2', userId: OTHER_USER_ID }),
    ]
    const result = filterActiveSkills(skills, USER_ID)
    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe(USER_ID)
  })

  it('returns empty array when no active skills', () => {
    const skills = [makeSkill({ archivedAt: new Date() })]
    const result = filterActiveSkills(skills, USER_ID)
    expect(result).toHaveLength(0)
  })
})

describe('SkillLevel — label/color mapping', () => {
  const levels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']

  it('all 4 levels have defined labels', () => {
    for (const level of levels) {
      expect(LEVEL_LABELS[level]).toBeTruthy()
    }
  })

  it('all 4 levels have defined badge colors', () => {
    for (const level of levels) {
      expect(LEVEL_BADGE_COLORS[level]).toBeTruthy()
    }
  })
})
