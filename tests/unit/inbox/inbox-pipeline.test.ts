import { describe, it, expect } from 'vitest'

// ─── Story 6.2 — Pipeline IA Tests ────────────────────────────────────────────
// Pure function tests for the inbox AI pipeline.
// No DB or network calls — all logic is tested in isolation.

// ─── getFreeSlots pure logic (extracted for unit testing) ─────────────────────

interface MockActivity {
  scheduledAt: Date
  scheduledDurationMinutes: number | null
}

interface FreeSlot {
  start: Date
  end: Date
  durationMinutes: number
}

/**
 * Pure implementation of free slot calculation (mirrors lib/db/queries/calendar.ts).
 * Extracted here for unit testing without DB dependency.
 */
function calculateFreeSlots(
  activities: MockActivity[],
  dayStart: Date, // 08:00 UTC of that day
  dayEnd: Date, // 22:00 UTC of that day
  minDurationMinutes = 30
): FreeSlot[] {
  const freeSlots: FreeSlot[] = []
  const windowStart = dayStart
  const windowEnd = dayEnd

  const busyIntervals = activities
    .filter((a) => {
      const aStart = a.scheduledAt
      const aDuration = a.scheduledDurationMinutes ?? 30
      const aEnd = new Date(aStart.getTime() + aDuration * 60_000)
      return aStart < windowEnd && aEnd > windowStart
    })
    .map((a) => {
      const aStart = a.scheduledAt
      const aDuration = a.scheduledDurationMinutes ?? 30
      const aEnd = new Date(aStart.getTime() + aDuration * 60_000)
      return {
        start: aStart < windowStart ? windowStart : aStart,
        end: aEnd > windowEnd ? windowEnd : aEnd,
      }
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  let cursor = windowStart
  for (const busy of busyIntervals) {
    if (busy.start > cursor) {
      const durationMs = busy.start.getTime() - cursor.getTime()
      const durationMin = Math.floor(durationMs / 60_000)
      if (durationMin >= minDurationMinutes) {
        freeSlots.push({
          start: new Date(cursor),
          end: new Date(busy.start),
          durationMinutes: durationMin,
        })
      }
    }
    if (busy.end > cursor) cursor = busy.end
  }
  if (cursor < windowEnd) {
    const durationMs = windowEnd.getTime() - cursor.getTime()
    const durationMin = Math.floor(durationMs / 60_000)
    if (durationMin >= minDurationMinutes) {
      freeSlots.push({
        start: new Date(cursor),
        end: new Date(windowEnd),
        durationMinutes: durationMin,
      })
    }
  }
  return freeSlots
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY_08 = new Date('2026-02-26T08:00:00.000Z')
const TODAY_22 = new Date('2026-02-26T22:00:00.000Z')

// ─── getFreeSlots — pure algorithm ────────────────────────────────────────────

describe('getFreeSlots — pure algorithm', () => {
  it('returns full window when no activities exist', () => {
    const slots = calculateFreeSlots([], TODAY_08, TODAY_22)
    expect(slots).toHaveLength(1)
    expect(slots[0].durationMinutes).toBe(14 * 60) // 08:00–22:00 = 840 min
  })

  it('returns one gap after a morning activity', () => {
    const activities: MockActivity[] = [
      { scheduledAt: new Date('2026-02-26T09:00:00.000Z'), scheduledDurationMinutes: 60 },
    ]
    const slots = calculateFreeSlots(activities, TODAY_08, TODAY_22)
    // Gap before: 08:00–09:00 (60 min) + Gap after: 10:00–22:00 (720 min)
    expect(slots).toHaveLength(2)
    expect(slots[0].durationMinutes).toBe(60)
    expect(slots[1].durationMinutes).toBe(720)
  })

  it('excludes gaps smaller than minDurationMinutes', () => {
    const activities: MockActivity[] = [
      { scheduledAt: new Date('2026-02-26T08:00:00.000Z'), scheduledDurationMinutes: 50 },
      { scheduledAt: new Date('2026-02-26T09:10:00.000Z'), scheduledDurationMinutes: 60 },
    ]
    // Gap between: 08:50–09:10 = 20 min → excluded (< 30 min default)
    const slots = calculateFreeSlots(activities, TODAY_08, TODAY_22)
    const shortSlot = slots.find((s) => s.durationMinutes === 20)
    expect(shortSlot).toBeUndefined()
  })

  it('returns no slots when activities fill the entire window', () => {
    const activities: MockActivity[] = [
      { scheduledAt: new Date('2026-02-26T08:00:00.000Z'), scheduledDurationMinutes: 840 }, // fills 08:00–22:00
    ]
    const slots = calculateFreeSlots(activities, TODAY_08, TODAY_22)
    expect(slots).toHaveLength(0)
  })

  it('handles activities outside the window (before 08:00)', () => {
    const activities: MockActivity[] = [
      { scheduledAt: new Date('2026-02-26T06:00:00.000Z'), scheduledDurationMinutes: 60 }, // before window
    ]
    const slots = calculateFreeSlots(activities, TODAY_08, TODAY_22)
    expect(slots).toHaveLength(1)
    expect(slots[0].durationMinutes).toBe(840) // full window free
  })

  it('respects custom minDurationMinutes', () => {
    const activities: MockActivity[] = [
      { scheduledAt: new Date('2026-02-26T08:00:00.000Z'), scheduledDurationMinutes: 45 },
      { scheduledAt: new Date('2026-02-26T09:00:00.000Z'), scheduledDurationMinutes: 60 },
    ]
    // Gap: 08:45–09:00 = 15 min
    // With minDuration=15, it should be included
    const slots15 = calculateFreeSlots(activities, TODAY_08, TODAY_22, 15)
    const slot15 = slots15.find((s) => s.durationMinutes === 15)
    expect(slot15).toBeDefined()

    // With minDuration=30, it should be excluded
    const slots30 = calculateFreeSlots(activities, TODAY_08, TODAY_22, 30)
    const slot30 = slots30.find((s) => s.durationMinutes === 15)
    expect(slot30).toBeUndefined()
  })

  it('handles multiple adjacent activities correctly', () => {
    const activities: MockActivity[] = [
      { scheduledAt: new Date('2026-02-26T09:00:00.000Z'), scheduledDurationMinutes: 60 },
      { scheduledAt: new Date('2026-02-26T10:00:00.000Z'), scheduledDurationMinutes: 60 },
      { scheduledAt: new Date('2026-02-26T11:00:00.000Z'), scheduledDurationMinutes: 60 },
    ]
    const slots = calculateFreeSlots(activities, TODAY_08, TODAY_22)
    // Gap before: 08:00–09:00 = 60 min
    // No gaps between adjacent activities (they touch exactly)
    // Gap after: 12:00–22:00 = 600 min
    expect(slots).toHaveLength(2)
    expect(slots[0].durationMinutes).toBe(60)
    expect(slots[1].durationMinutes).toBe(600)
  })
})

// ─── getActiveOKRsForUser — filter logic ──────────────────────────────────────

type OKRType = 'vision' | 'annual' | 'key_result'
type OKRStatus = 'active' | 'completed' | 'cancelled' | 'paused'
type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

interface MockOKR {
  id: string
  type: OKRType
  status: OKRStatus
  year: number | null
  quarter: Quarter | null
  title: string
  areaId: string | null
}

function filterActiveOKRs(
  allOkrs: MockOKR[],
  currentYear: number,
  currentQuarter: Quarter
): Array<{ id: string; title: string; type: string; areaId: string | null }> {
  return allOkrs
    .filter(
      (o) =>
        o.status === 'active' &&
        ((o.type === 'annual' && o.year === currentYear) ||
          (o.type === 'key_result' && o.year === currentYear && o.quarter === currentQuarter))
    )
    .map((o) => ({ id: o.id, title: o.title, type: o.type, areaId: o.areaId }))
}

describe('getActiveOKRsForUser — filter logic', () => {
  const mockOKRs: MockOKR[] = [
    {
      id: 'annual-1',
      type: 'annual',
      status: 'active',
      year: 2026,
      quarter: null,
      title: 'OKR Anual 2026',
      areaId: 'area-1',
    },
    {
      id: 'annual-2',
      type: 'annual',
      status: 'completed',
      year: 2026,
      quarter: null,
      title: 'OKR Anual completado',
      areaId: 'area-2',
    },
    {
      id: 'annual-past',
      type: 'annual',
      status: 'active',
      year: 2025,
      quarter: null,
      title: 'OKR Anual 2025',
      areaId: 'area-1',
    },
    {
      id: 'kr-q1',
      type: 'key_result',
      status: 'active',
      year: 2026,
      quarter: 'Q1',
      title: 'KR Q1 2026',
      areaId: 'area-1',
    },
    {
      id: 'kr-q2',
      type: 'key_result',
      status: 'active',
      year: 2026,
      quarter: 'Q2',
      title: 'KR Q2 2026',
      areaId: 'area-1',
    },
    {
      id: 'kr-paused',
      type: 'key_result',
      status: 'paused',
      year: 2026,
      quarter: 'Q1',
      title: 'KR pausado',
      areaId: 'area-1',
    },
    {
      id: 'vision-1',
      type: 'vision',
      status: 'active',
      year: null,
      quarter: null,
      title: 'Visión 5 años',
      areaId: null,
    },
  ]

  it('returns active annual OKRs for current year', () => {
    const result = filterActiveOKRs(mockOKRs, 2026, 'Q1')
    const annuals = result.filter((o) => o.type === 'annual')
    expect(annuals).toHaveLength(1)
    expect(annuals[0].id).toBe('annual-1')
  })

  it('excludes completed annual OKRs', () => {
    const result = filterActiveOKRs(mockOKRs, 2026, 'Q1')
    const ids = result.map((o) => o.id)
    expect(ids).not.toContain('annual-2')
  })

  it('excludes annual OKRs from previous year', () => {
    const result = filterActiveOKRs(mockOKRs, 2026, 'Q1')
    const ids = result.map((o) => o.id)
    expect(ids).not.toContain('annual-past')
  })

  it('returns active KRs for current quarter', () => {
    const result = filterActiveOKRs(mockOKRs, 2026, 'Q1')
    const krs = result.filter((o) => o.type === 'key_result')
    expect(krs).toHaveLength(1)
    expect(krs[0].id).toBe('kr-q1')
  })

  it('excludes KRs from other quarters', () => {
    const result = filterActiveOKRs(mockOKRs, 2026, 'Q1')
    const ids = result.map((o) => o.id)
    expect(ids).not.toContain('kr-q2')
  })

  it('excludes paused KRs', () => {
    const result = filterActiveOKRs(mockOKRs, 2026, 'Q1')
    const ids = result.map((o) => o.id)
    expect(ids).not.toContain('kr-paused')
  })

  it('excludes vision OKRs (not annual or key_result)', () => {
    const result = filterActiveOKRs(mockOKRs, 2026, 'Q1')
    const ids = result.map((o) => o.id)
    expect(ids).not.toContain('vision-1')
  })

  it('returns empty array when no active OKRs match', () => {
    const result = filterActiveOKRs(mockOKRs, 2024, 'Q4')
    expect(result).toHaveLength(0)
  })
})

// ─── processInboxItem — pipeline logic ────────────────────────────────────────

interface ClassifyInboxResult {
  classification: 'task' | 'event' | 'project' | 'habit' | 'idea' | 'reference'
  suggestedAreaId: string
  suggestedOkrId?: string
  suggestedSlot: string
  suggestedTitle: string
  estimatedDurationMinutes: number
}

interface MockProvider {
  classifyInboxItem: (rawText: string, context: unknown) => Promise<ClassifyInboxResult>
}

type InboxStatus = 'pending' | 'processing' | 'processed' | 'manual' | 'discarded'

interface MockInboxItem {
  id: string
  userId: string
  rawText: string
  status: InboxStatus
  aiClassification: string | null
  aiSuggestedAreaId: string | null
  aiSuggestedOkrId: string | null
  aiError: string | null
  processedAt: Date | null
}

async function simulateProcessInboxItem(
  item: MockInboxItem,
  provider: MockProvider
): Promise<{
  success: boolean
  manual?: boolean
  status: InboxStatus
  aiError: string | null
  aiClassification: string | null
}> {
  // Mark as processing
  item.status = 'processing'

  try {
    const result = await provider.classifyInboxItem(item.rawText, {})
    item.status = 'processed'
    item.aiClassification = result.classification
    item.aiSuggestedAreaId = result.suggestedAreaId
    item.aiSuggestedOkrId = result.suggestedOkrId ?? null
    item.aiError = null
    item.processedAt = new Date()
    return {
      success: true,
      manual: false,
      status: item.status,
      aiError: item.aiError,
      aiClassification: item.aiClassification,
    }
  } catch (err) {
    item.status = 'manual'
    item.aiError = err instanceof Error ? err.message : 'Error desconocido'
    item.processedAt = new Date()
    return {
      success: true,
      manual: true,
      status: item.status,
      aiError: item.aiError,
      aiClassification: null,
    }
  }
}

describe('processInboxItem — pipeline logic', () => {
  const mockItem: MockInboxItem = {
    id: 'item-1',
    userId: 'user-1',
    rawText: 'Llamar al médico para revisión anual',
    status: 'pending',
    aiClassification: null,
    aiSuggestedAreaId: null,
    aiSuggestedOkrId: null,
    aiError: null,
    processedAt: null,
  }

  it('happy path: AI returns valid classification → status = processed', async () => {
    const item = { ...mockItem }
    const mockProvider: MockProvider = {
      classifyInboxItem: async () => ({
        classification: 'task',
        suggestedAreaId: 'area-uuid-fisiologica',
        suggestedOkrId: undefined,
        suggestedSlot: '2026-02-27T09:00:00.000Z',
        suggestedTitle: 'Llamar al médico',
        estimatedDurationMinutes: 30,
      }),
    }

    const result = await simulateProcessInboxItem(item, mockProvider)

    expect(result.success).toBe(true)
    expect(result.manual).toBe(false)
    expect(result.status).toBe('processed')
    expect(result.aiClassification).toBe('task')
    expect(result.aiError).toBeNull()
  })

  it('fallback FR22: AI throws error → status = manual with aiError', async () => {
    const item = { ...mockItem }
    const mockProvider: MockProvider = {
      classifyInboxItem: async () => {
        throw new Error('ANTHROPIC_API_KEY no configurada')
      },
    }

    const result = await simulateProcessInboxItem(item, mockProvider)

    expect(result.success).toBe(true)
    expect(result.manual).toBe(true)
    expect(result.status).toBe('manual')
    expect(result.aiError).toBe('ANTHROPIC_API_KEY no configurada')
    expect(result.aiClassification).toBeNull()
  })

  it('fallback FR22: AI timeout → status = manual', async () => {
    const item = { ...mockItem }
    const mockProvider: MockProvider = {
      classifyInboxItem: async () => {
        throw new Error('Request timed out after 30000ms')
      },
    }

    const result = await simulateProcessInboxItem(item, mockProvider)

    expect(result.success).toBe(true)
    expect(result.manual).toBe(true)
    expect(result.status).toBe('manual')
    expect(result.aiError).toContain('timed out')
  })

  it('AI response with OKR: suggestedOkrId is stored', async () => {
    const item = { ...mockItem }
    const mockProvider: MockProvider = {
      classifyInboxItem: async () => ({
        classification: 'task',
        suggestedAreaId: 'area-uuid',
        suggestedOkrId: 'okr-uuid-salud',
        suggestedSlot: '2026-02-27T10:00:00.000Z',
        suggestedTitle: 'Revisión médica anual',
        estimatedDurationMinutes: 60,
      }),
    }

    const resultItem = { ...item }
    await simulateProcessInboxItem(resultItem, mockProvider)

    expect(resultItem.aiSuggestedOkrId).toBe('okr-uuid-salud')
    expect(resultItem.status).toBe('processed')
  })
})

// ─── parseClassifyResult — validation logic ───────────────────────────────────

const VALID_CLASSIFICATIONS = ['task', 'event', 'project', 'habit', 'idea', 'reference'] as const

function validateClassifyResult(parsed: Record<string, unknown>): ClassifyInboxResult {
  const classification = parsed.classification as string
  if (!VALID_CLASSIFICATIONS.includes(classification as (typeof VALID_CLASSIFICATIONS)[number])) {
    throw new Error(`Clasificación inválida: ${classification}`)
  }

  const suggestedAreaId = parsed.suggestedAreaId
  if (typeof suggestedAreaId !== 'string' || !suggestedAreaId) {
    throw new Error('suggestedAreaId inválido')
  }

  const suggestedSlot = parsed.suggestedSlot
  if (typeof suggestedSlot !== 'string' || !suggestedSlot) {
    throw new Error('suggestedSlot inválido')
  }

  const suggestedTitle = parsed.suggestedTitle
  if (typeof suggestedTitle !== 'string' || !suggestedTitle) {
    throw new Error('suggestedTitle inválido')
  }

  const estimatedDurationMinutes = Number(parsed.estimatedDurationMinutes)
  if (isNaN(estimatedDurationMinutes) || estimatedDurationMinutes <= 0) {
    throw new Error('estimatedDurationMinutes inválido')
  }

  const suggestedOkrId =
    parsed.suggestedOkrId && parsed.suggestedOkrId !== 'null'
      ? (parsed.suggestedOkrId as string)
      : undefined

  return {
    classification: classification as ClassifyInboxResult['classification'],
    suggestedAreaId,
    suggestedOkrId,
    suggestedSlot,
    suggestedTitle: (suggestedTitle as string).slice(0, 60),
    estimatedDurationMinutes: Math.max(15, Math.min(480, Math.round(estimatedDurationMinutes))),
  }
}

describe('parseClassifyResult — validation logic', () => {
  const validRaw = {
    classification: 'task',
    suggestedAreaId: 'area-uuid',
    suggestedOkrId: null,
    suggestedSlot: '2026-02-27T09:00:00.000Z',
    suggestedTitle: 'Título de prueba',
    estimatedDurationMinutes: 30,
  }

  it('accepts valid complete result', () => {
    const result = validateClassifyResult(validRaw as Record<string, unknown>)
    expect(result.classification).toBe('task')
    expect(result.suggestedAreaId).toBe('area-uuid')
    expect(result.suggestedOkrId).toBeUndefined()
    expect(result.estimatedDurationMinutes).toBe(30)
  })

  it('accepts all valid classification types', () => {
    for (const cls of VALID_CLASSIFICATIONS) {
      const raw = { ...validRaw, classification: cls }
      expect(() => validateClassifyResult(raw as Record<string, unknown>)).not.toThrow()
    }
  })

  it('rejects unknown classification', () => {
    const raw = { ...validRaw, classification: 'unknown' }
    expect(() => validateClassifyResult(raw as Record<string, unknown>)).toThrow(
      'Clasificación inválida'
    )
  })

  it('rejects missing suggestedAreaId', () => {
    const raw = { ...validRaw, suggestedAreaId: '' }
    expect(() => validateClassifyResult(raw as Record<string, unknown>)).toThrow(
      'suggestedAreaId inválido'
    )
  })

  it('caps title at 60 characters', () => {
    const raw = { ...validRaw, suggestedTitle: 'A'.repeat(100) }
    const result = validateClassifyResult(raw as Record<string, unknown>)
    expect(result.suggestedTitle).toHaveLength(60)
  })

  it('clamps duration to 15-480 range', () => {
    const raw5 = { ...validRaw, estimatedDurationMinutes: 5 }
    expect(validateClassifyResult(raw5 as Record<string, unknown>).estimatedDurationMinutes).toBe(
      15
    )

    const raw1000 = { ...validRaw, estimatedDurationMinutes: 1000 }
    expect(
      validateClassifyResult(raw1000 as Record<string, unknown>).estimatedDurationMinutes
    ).toBe(480)
  })

  it('handles suggestedOkrId as string when present', () => {
    const raw = { ...validRaw, suggestedOkrId: 'okr-uuid' }
    const result = validateClassifyResult(raw as Record<string, unknown>)
    expect(result.suggestedOkrId).toBe('okr-uuid')
  })
})
