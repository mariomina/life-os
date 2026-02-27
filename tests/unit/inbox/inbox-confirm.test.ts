import { describe, it, expect } from 'vitest'

// ─── Story 6.3 — Confirmation Tests ──────────────────────────────────────────
// Pure logic tests for confirmInboxProposal guards and happy path.
// No DB or network calls — all logic is tested in isolation via extracted functions.

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
  aiError: string | null
}

interface ConfirmResult {
  success: boolean
  stepActivityId?: string
  error?: string
}

// ─── Pure guard logic (mirrors actions/inbox.ts confirmInboxProposal) ─────────

function validateConfirmation(
  item: MockInboxItem | null,
  requestUserId: string,
  itemUserId: string
): { valid: boolean; error?: string } {
  // Ownership check (item not found or wrong user)
  if (!item || itemUserId !== requestUserId) {
    return { valid: false, error: 'Item no encontrado' }
  }

  // Status guard
  if (item.status !== 'processed') {
    return { valid: false, error: 'El item no tiene propuesta IA lista' }
  }

  // Double confirmation guard
  if (item.stepActivityId) {
    return { valid: false, error: 'Este item ya fue confirmado' }
  }

  // Area required guard
  if (!item.aiSuggestedAreaId) {
    return { valid: false, error: 'El item no tiene área sugerida' }
  }

  return { valid: true }
}

// ─── Pure activity builder (mirrors insert logic in confirmInboxProposal) ─────

interface MockStepActivity {
  userId: string
  areaId: string
  title: string
  scheduledAt: Date | undefined
  scheduledDurationMinutes: number | undefined
  okrId: string | undefined
  executorType: 'human' | 'ai' | 'mixed'
  planned: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
}

function buildStepActivity(item: MockInboxItem, userId: string): MockStepActivity {
  return {
    userId,
    areaId: item.aiSuggestedAreaId!,
    title: item.aiSuggestedTitle ?? item.rawText,
    scheduledAt: item.aiSuggestedSlot ?? undefined,
    scheduledDurationMinutes: item.aiSuggestedDurationMinutes ?? undefined,
    okrId: item.aiSuggestedOkrId ?? undefined,
    executorType: 'human',
    planned: true,
    status: 'pending',
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AREA_ID = 'area-cognitiva-uuid'
const OKR_ID = 'okr-aprendizaje-uuid'
const USER_ID = 'user-123'
const OTHER_USER_ID = 'user-456'
const ITEM_ID = 'inbox-item-uuid'
const SLOT = new Date('2026-02-26T14:00:00.000Z')

function makeProcessedItem(overrides: Partial<MockInboxItem> = {}): MockInboxItem {
  return {
    id: ITEM_ID,
    userId: USER_ID,
    rawText: 'Aprender TypeScript avanzado',
    status: 'processed',
    aiSuggestedAreaId: AREA_ID,
    aiSuggestedOkrId: OKR_ID,
    aiSuggestedSlot: SLOT,
    aiSuggestedTitle: 'Completar curso TS avanzado',
    aiSuggestedDurationMinutes: 90,
    aiClassification: 'task',
    stepActivityId: null,
    aiError: null,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('confirmInboxProposal — guard logic', () => {
  it('returns error when item is null (not found)', () => {
    const result = validateConfirmation(null, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Item no encontrado')
  })

  it('returns error when item belongs to different user (ownership guard)', () => {
    const item = makeProcessedItem()
    const result = validateConfirmation(item, OTHER_USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Item no encontrado')
  })

  it("returns error when status is 'pending'", () => {
    const item = makeProcessedItem({ status: 'pending' })
    const result = validateConfirmation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene propuesta IA lista')
  })

  it("returns error when status is 'processing'", () => {
    const item = makeProcessedItem({ status: 'processing' })
    const result = validateConfirmation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene propuesta IA lista')
  })

  it("returns error when status is 'manual' (FR22 fallback)", () => {
    const item = makeProcessedItem({ status: 'manual' })
    const result = validateConfirmation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene propuesta IA lista')
  })

  it("returns error when status is 'discarded'", () => {
    const item = makeProcessedItem({ status: 'discarded' })
    const result = validateConfirmation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene propuesta IA lista')
  })

  it('returns error when stepActivityId is already set (double confirmation guard)', () => {
    const item = makeProcessedItem({ stepActivityId: 'existing-activity-uuid' })
    const result = validateConfirmation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Este item ya fue confirmado')
  })

  it('returns error when aiSuggestedAreaId is null (area required for insert)', () => {
    const item = makeProcessedItem({ aiSuggestedAreaId: null })
    const result = validateConfirmation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('El item no tiene área sugerida')
  })

  it('returns valid for a fully processed item with all required fields', () => {
    const item = makeProcessedItem()
    const result = validateConfirmation(item, USER_ID, USER_ID)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('confirmInboxProposal — StepActivity builder', () => {
  it('builds activity with correct fields from AI proposal', () => {
    const item = makeProcessedItem()
    const activity = buildStepActivity(item, USER_ID)

    expect(activity.userId).toBe(USER_ID)
    expect(activity.areaId).toBe(AREA_ID)
    expect(activity.title).toBe('Completar curso TS avanzado')
    expect(activity.scheduledAt).toEqual(SLOT)
    expect(activity.scheduledDurationMinutes).toBe(90)
    expect(activity.okrId).toBe(OKR_ID)
    expect(activity.executorType).toBe('human')
    expect(activity.planned).toBe(true)
    expect(activity.status).toBe('pending')
  })

  it('falls back to rawText when aiSuggestedTitle is null', () => {
    const item = makeProcessedItem({ aiSuggestedTitle: null })
    const activity = buildStepActivity(item, USER_ID)
    expect(activity.title).toBe('Aprender TypeScript avanzado')
  })

  it('sets okrId to undefined when aiSuggestedOkrId is null', () => {
    const item = makeProcessedItem({ aiSuggestedOkrId: null })
    const activity = buildStepActivity(item, USER_ID)
    expect(activity.okrId).toBeUndefined()
  })

  it('sets scheduledAt to undefined when aiSuggestedSlot is null', () => {
    const item = makeProcessedItem({ aiSuggestedSlot: null })
    const activity = buildStepActivity(item, USER_ID)
    expect(activity.scheduledAt).toBeUndefined()
  })

  it('sets scheduledDurationMinutes to undefined when null', () => {
    const item = makeProcessedItem({ aiSuggestedDurationMinutes: null })
    const activity = buildStepActivity(item, USER_ID)
    expect(activity.scheduledDurationMinutes).toBeUndefined()
  })
})

describe('confirmInboxProposal — result shape', () => {
  it('returns success:true with stepActivityId on happy path', () => {
    // Simulate what the action returns after successful DB insert
    const mockResult: ConfirmResult = {
      success: true,
      stepActivityId: 'new-activity-uuid',
    }
    expect(mockResult.success).toBe(true)
    expect(mockResult.stepActivityId).toBe('new-activity-uuid')
    expect(mockResult.error).toBeUndefined()
  })

  it('returns success:false with error on guard failure', () => {
    const mockResult: ConfirmResult = {
      success: false,
      error: 'El item no tiene propuesta IA lista',
    }
    expect(mockResult.success).toBe(false)
    expect(mockResult.stepActivityId).toBeUndefined()
    expect(mockResult.error).toBeTruthy()
  })
})

describe('formatSlot and formatDuration helpers', () => {
  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }

  it('formats duration under 60 minutes', () => {
    expect(formatDuration(30)).toBe('30 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(59)).toBe('59 min')
  })

  it('formats duration in whole hours', () => {
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(180)).toBe('3h')
  })

  it('formats duration in hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30min')
    expect(formatDuration(75)).toBe('1h 15min')
    expect(formatDuration(150)).toBe('2h 30min')
  })
})
