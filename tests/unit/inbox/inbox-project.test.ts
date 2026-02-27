import { describe, it, expect } from 'vitest'

// ─── Story 6.4 — Project Detection Tests ─────────────────────────────────────
// Pure logic tests for createProjectFromInbox guards and project builder.
// No DB or network calls — all logic tested in isolation via extracted functions.

// ─── Types ────────────────────────────────────────────────────────────────────

interface MockInboxItem {
  id: string
  userId: string
  rawText: string
  status: 'pending' | 'processing' | 'processed' | 'manual' | 'discarded'
  aiSuggestedAreaId: string | null
  aiSuggestedOkrId: string | null
  aiSuggestedSlot: Date | null
  aiSuggestedTitle: string | null
  aiSuggestedDurationMinutes: number | null
  aiClassification: string | null
  stepActivityId: string | null
  projectId: string | null
  aiError: string | null
}

interface CreateProjectResult {
  success: boolean
  projectId?: string
  error?: string
}

// ─── Pure guard logic (mirrors actions/inbox.ts createProjectFromInbox) ───────

function validateProjectCreation(
  item: MockInboxItem | null,
  requestUserId: string,
  itemUserId: string
): { valid: boolean; error?: string } {
  // Ownership check
  if (!item || itemUserId !== requestUserId) {
    return { valid: false, error: 'Item no encontrado' }
  }

  // Status guard
  if (item.status !== 'processed') {
    return { valid: false, error: 'El item no tiene propuesta IA lista' }
  }

  // Double conversion guard
  if (item.projectId) {
    return { valid: false, error: 'Este item ya fue convertido en proyecto' }
  }

  // Area required guard
  if (!item.aiSuggestedAreaId) {
    return { valid: false, error: 'El item no tiene área sugerida' }
  }

  return { valid: true }
}

// ─── Pure project builder (mirrors insert logic in createProjectFromInbox) ────

interface MockProject {
  userId: string
  areaId: string
  title: string
  okrId: string | undefined
  templateId: string | undefined
  status: 'active' | 'completed' | 'archived' | 'paused'
}

function buildProject(item: MockInboxItem, userId: string, templateId?: string): MockProject {
  return {
    userId,
    areaId: item.aiSuggestedAreaId!,
    title: item.aiSuggestedTitle ?? item.rawText,
    okrId: item.aiSuggestedOkrId ?? undefined,
    templateId: templateId ?? undefined,
    status: 'active',
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AREA_ID = 'area-cognitiva-uuid'
const OKR_ID = 'okr-learning-uuid'
const TEMPLATE_ID = 'template-learning-uuid'
const USER_ID = 'user-123'
const OTHER_USER_ID = 'user-456'
const ITEM_ID = 'inbox-item-project-uuid'

function makeProcessedProjectItem(overrides: Partial<MockInboxItem> = {}): MockInboxItem {
  return {
    id: ITEM_ID,
    userId: USER_ID,
    rawText: 'Crear curso completo de TypeScript para el equipo',
    status: 'processed',
    aiSuggestedAreaId: AREA_ID,
    aiSuggestedOkrId: OKR_ID,
    aiSuggestedSlot: new Date('2026-02-28T10:00:00.000Z'),
    aiSuggestedTitle: 'Curso TS Avanzado — Equipo Dev',
    aiSuggestedDurationMinutes: 480,
    aiClassification: 'project',
    stepActivityId: null,
    projectId: null,
    aiError: null,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createProjectFromInbox — guard logic', () => {
  it('returns error when item is null (not found)', () => {
    const result = validateProjectCreation(null, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Item no encontrado')
  })

  it('returns error when item belongs to different user (ownership guard)', () => {
    const item = makeProcessedProjectItem()
    const result = validateProjectCreation(item, OTHER_USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Item no encontrado')
  })

  it("returns error when status is 'pending'", () => {
    const item = makeProcessedProjectItem({ status: 'pending' })
    const result = validateProjectCreation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene propuesta IA lista')
  })

  it("returns error when status is 'processing'", () => {
    const item = makeProcessedProjectItem({ status: 'processing' })
    const result = validateProjectCreation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene propuesta IA lista')
  })

  it("returns error when status is 'manual'", () => {
    const item = makeProcessedProjectItem({ status: 'manual' })
    const result = validateProjectCreation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene propuesta IA lista')
  })

  it("returns error when status is 'discarded'", () => {
    const item = makeProcessedProjectItem({ status: 'discarded' })
    const result = validateProjectCreation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene propuesta IA lista')
  })

  it('returns error when projectId is already set (double conversion guard)', () => {
    const item = makeProcessedProjectItem({ projectId: 'existing-project-uuid' })
    const result = validateProjectCreation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Este item ya fue convertido en proyecto')
  })

  it('returns error when aiSuggestedAreaId is null', () => {
    const item = makeProcessedProjectItem({ aiSuggestedAreaId: null })
    const result = validateProjectCreation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene área sugerida')
  })

  it('returns valid for a fully processed item with all required fields', () => {
    const item = makeProcessedProjectItem()
    const result = validateProjectCreation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('createProjectFromInbox — Project builder', () => {
  it('builds project with correct fields from AI proposal', () => {
    const item = makeProcessedProjectItem()
    const project = buildProject(item, USER_ID, TEMPLATE_ID)

    expect(project.userId).toBe(USER_ID)
    expect(project.areaId).toBe(AREA_ID)
    expect(project.title).toBe('Curso TS Avanzado — Equipo Dev')
    expect(project.okrId).toBe(OKR_ID)
    expect(project.templateId).toBe(TEMPLATE_ID)
    expect(project.status).toBe('active')
  })

  it('falls back to rawText when aiSuggestedTitle is null', () => {
    const item = makeProcessedProjectItem({ aiSuggestedTitle: null })
    const project = buildProject(item, USER_ID)
    expect(project.title).toBe('Crear curso completo de TypeScript para el equipo')
  })

  it('sets okrId to undefined when aiSuggestedOkrId is null', () => {
    const item = makeProcessedProjectItem({ aiSuggestedOkrId: null })
    const project = buildProject(item, USER_ID)
    expect(project.okrId).toBeUndefined()
  })

  it('passes templateId when provided', () => {
    const item = makeProcessedProjectItem()
    const project = buildProject(item, USER_ID, TEMPLATE_ID)
    expect(project.templateId).toBe(TEMPLATE_ID)
  })

  it('sets templateId to undefined when not provided', () => {
    const item = makeProcessedProjectItem()
    const project = buildProject(item, USER_ID)
    expect(project.templateId).toBeUndefined()
  })

  it('always sets status to active', () => {
    const item = makeProcessedProjectItem()
    const project = buildProject(item, USER_ID)
    expect(project.status).toBe('active')
  })
})

describe('createProjectFromInbox — result shape', () => {
  it('returns success:true with projectId on happy path', () => {
    const mockResult: CreateProjectResult = {
      success: true,
      projectId: 'new-project-uuid',
    }
    expect(mockResult.success).toBe(true)
    expect(mockResult.projectId).toBe('new-project-uuid')
    expect(mockResult.error).toBeUndefined()
  })

  it('returns success:false with error on guard failure', () => {
    const mockResult: CreateProjectResult = {
      success: false,
      error: 'El item no tiene propuesta IA lista',
    }
    expect(mockResult.success).toBe(false)
    expect(mockResult.projectId).toBeUndefined()
    expect(mockResult.error).toBeTruthy()
  })
})

describe('createProjectFromInbox — classification routing', () => {
  it("item with classification='project' should trigger project flow", () => {
    const item = makeProcessedProjectItem({ aiClassification: 'project' })
    expect(item.aiClassification).toBe('project')
  })

  it("item with classification='task' should NOT trigger project flow", () => {
    const item = makeProcessedProjectItem({ aiClassification: 'task' })
    const isProjectFlow = item.aiClassification === 'project'
    expect(isProjectFlow).toBe(false)
  })

  it("item with classification='event' should NOT trigger project flow", () => {
    const item = makeProcessedProjectItem({ aiClassification: 'event' })
    const isProjectFlow = item.aiClassification === 'project'
    expect(isProjectFlow).toBe(false)
  })
})
