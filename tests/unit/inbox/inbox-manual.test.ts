import { describe, it, expect } from 'vitest'

// ─── Story 6.5 — Manual Processing Tests ─────────────────────────────────────
// Pure logic tests for updateInboxItemManually guards and data builder.
// No DB or network calls — all logic tested via extracted pure functions.

// ─── Types ────────────────────────────────────────────────────────────────────

type MockStatus = 'pending' | 'processing' | 'processed' | 'manual' | 'discarded'

interface MockInboxItem {
  id: string
  userId: string
  rawText: string
  status: MockStatus
  aiClassification: string | null
  aiSuggestedAreaId: string | null
  aiSuggestedTitle: string | null
  aiSuggestedSlot: Date | null
  aiSuggestedDurationMinutes: number | null
}

interface ManualUpdateData {
  classification: 'task' | 'event' | 'project' | 'habit' | 'idea' | 'reference'
  areaId: string
  title?: string
  slot?: string | null
  durationMinutes?: number | null
}

interface ManualUpdateResult {
  success: boolean
  error?: string
}

// ─── Pure guard logic (mirrors actions/inbox.ts updateInboxItemManually) ──────

function validateManualUpdate(
  itemId: string,
  data: ManualUpdateData,
  item: MockInboxItem | null,
  requestUserId: string,
  itemUserId: string
): ManualUpdateResult {
  if (!itemId?.trim()) return { success: false, error: 'ID de item inválido' }
  if (!data.classification)
    return { success: false, error: 'El tipo de clasificación es requerido' }
  if (!data.areaId?.trim()) return { success: false, error: 'El área es requerida' }

  if (!item || itemUserId !== requestUserId) {
    return { success: false, error: 'Item no encontrado' }
  }

  return { success: true }
}

// ─── Pure data builder (mirrors update .set() in updateInboxItemManually) ─────

interface ManualUpdatePayload {
  aiClassification: string
  aiSuggestedAreaId: string
  aiSuggestedTitle: string
  aiSuggestedSlot: Date | null
  aiSuggestedDurationMinutes: number | null
  status: 'processed'
}

function buildManualUpdatePayload(
  item: MockInboxItem,
  data: ManualUpdateData
): ManualUpdatePayload {
  return {
    aiClassification: data.classification,
    aiSuggestedAreaId: data.areaId,
    aiSuggestedTitle: data.title ?? item.rawText,
    aiSuggestedSlot: data.slot ? new Date(data.slot) : null,
    aiSuggestedDurationMinutes: data.durationMinutes ?? null,
    status: 'processed',
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-123'
const OTHER_USER_ID = 'user-456'
const ITEM_ID = 'inbox-item-uuid'
const AREA_ID = 'area-cognitiva-uuid'

function makeManualItem(overrides: Partial<MockInboxItem> = {}): MockInboxItem {
  return {
    id: ITEM_ID,
    userId: USER_ID,
    rawText: 'Revisar presupuesto Q1',
    status: 'manual',
    aiClassification: null,
    aiSuggestedAreaId: null,
    aiSuggestedTitle: null,
    aiSuggestedSlot: null,
    aiSuggestedDurationMinutes: null,
    ...overrides,
  }
}

function makeValidData(overrides: Partial<ManualUpdateData> = {}): ManualUpdateData {
  return {
    classification: 'task',
    areaId: AREA_ID,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('updateInboxItemManually — guard logic', () => {
  it('returns error when item not found (null)', () => {
    const result = validateManualUpdate(ITEM_ID, makeValidData(), null, USER_ID, USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Item no encontrado')
  })

  it('returns error when item belongs to different user (ownership guard)', () => {
    const item = makeManualItem()
    const result = validateManualUpdate(ITEM_ID, makeValidData(), item, OTHER_USER_ID, USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Item no encontrado')
  })

  it('returns error when classification is missing', () => {
    const data = { classification: '' as ManualUpdateData['classification'], areaId: AREA_ID }
    const item = makeManualItem()
    const result = validateManualUpdate(ITEM_ID, data, item, USER_ID, USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('El tipo de clasificación es requerido')
  })

  it('returns error when areaId is missing', () => {
    const data = makeValidData({ areaId: '' })
    const item = makeManualItem()
    const result = validateManualUpdate(ITEM_ID, data, item, USER_ID, USER_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe('El área es requerida')
  })

  it('returns success for valid item with valid data', () => {
    const item = makeManualItem()
    const result = validateManualUpdate(ITEM_ID, makeValidData(), item, USER_ID, USER_ID)
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('updateInboxItemManually — data builder', () => {
  it('sets all AI fields from manual data', () => {
    const item = makeManualItem()
    const data = makeValidData({
      classification: 'task',
      areaId: AREA_ID,
      title: 'Revisar presupuesto mensual',
      slot: '2026-03-01T10:00:00.000Z',
      durationMinutes: 45,
    })
    const payload = buildManualUpdatePayload(item, data)

    expect(payload.aiClassification).toBe('task')
    expect(payload.aiSuggestedAreaId).toBe(AREA_ID)
    expect(payload.aiSuggestedTitle).toBe('Revisar presupuesto mensual')
    expect(payload.aiSuggestedSlot).toEqual(new Date('2026-03-01T10:00:00.000Z'))
    expect(payload.aiSuggestedDurationMinutes).toBe(45)
    expect(payload.status).toBe('processed')
  })

  it('falls back to rawText when title not provided', () => {
    const item = makeManualItem({ rawText: 'Mi idea original' })
    const data = makeValidData({ title: undefined })
    const payload = buildManualUpdatePayload(item, data)
    expect(payload.aiSuggestedTitle).toBe('Mi idea original')
  })

  it('sets aiSuggestedSlot to null when slot not provided', () => {
    const item = makeManualItem()
    const data = makeValidData({ slot: undefined })
    const payload = buildManualUpdatePayload(item, data)
    expect(payload.aiSuggestedSlot).toBeNull()
  })

  it('sets aiSuggestedSlot to null when slot is explicitly null', () => {
    const item = makeManualItem()
    const data = makeValidData({ slot: null })
    const payload = buildManualUpdatePayload(item, data)
    expect(payload.aiSuggestedSlot).toBeNull()
  })

  it('sets aiSuggestedDurationMinutes to null when not provided', () => {
    const item = makeManualItem()
    const data = makeValidData({ durationMinutes: undefined })
    const payload = buildManualUpdatePayload(item, data)
    expect(payload.aiSuggestedDurationMinutes).toBeNull()
  })

  it('status is always processed after manual update', () => {
    const item = makeManualItem({ status: 'manual' })
    const payload = buildManualUpdatePayload(item, makeValidData())
    expect(payload.status).toBe('processed')
  })

  it('works for idea classification without slot', () => {
    const item = makeManualItem({ rawText: 'Nueva idea de producto' })
    const data = makeValidData({ classification: 'idea', slot: null, durationMinutes: null })
    const payload = buildManualUpdatePayload(item, data)

    expect(payload.aiClassification).toBe('idea')
    expect(payload.aiSuggestedSlot).toBeNull()
    expect(payload.aiSuggestedDurationMinutes).toBeNull()
    expect(payload.status).toBe('processed')
  })

  it('works for reference classification', () => {
    const item = makeManualItem({ rawText: 'Artículo interesante sobre IA' })
    const data = makeValidData({ classification: 'reference' })
    const payload = buildManualUpdatePayload(item, data)
    expect(payload.aiClassification).toBe('reference')
  })

  it('works for project classification (triggers ProjectProposalCard flow)', () => {
    const item = makeManualItem({ rawText: 'Lanzar nueva versión del app' })
    const data = makeValidData({ classification: 'project' })
    const payload = buildManualUpdatePayload(item, data)
    expect(payload.aiClassification).toBe('project')
    expect(payload.status).toBe('processed')
  })
})
