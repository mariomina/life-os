import { describe, it, expect } from 'vitest'

// ── Pure validation logic — tests without DB ──────────────────────────────────
// These tests mirror the validation logic in actions/calendar.ts and actions/habits.ts.
// We test the logic in isolation using plain data structures.

interface SubareaDef {
  id: string
  areaId: string
  name: string
  isActive: boolean
}

/**
 * Simulates the subareaId validation logic used in server actions.
 * Returns error string or null.
 */
function validateSubareaOwnership(
  subareaId: string | null | undefined,
  areaId: string | null | undefined,
  subareas: SubareaDef[]
): string | null {
  if (!subareaId || !areaId) return null
  const subarea = subareas.find((s) => s.id === subareaId && s.areaId === areaId)
  if (!subarea) return 'Sub-área no pertenece al área seleccionada'
  return null
}

/** Simulates the payload builder used in createActivity. */
function buildActivityPayload(
  areaId: string | null,
  subareaId: string | null,
  subareas: SubareaDef[]
) {
  const error = validateSubareaOwnership(subareaId, areaId, subareas)
  if (error) throw new Error(error)
  return { areaId, subareaId }
}

/** Simulates the payload builder used in createHabit. */
function buildHabitPayload(
  areaId: string | null,
  subareaId: string | undefined,
  subareas: SubareaDef[]
) {
  const error = validateSubareaOwnership(subareaId, areaId, subareas)
  if (error) throw new Error(error)
  return { areaId, subareaId: subareaId ?? null }
}

// ── Test data ─────────────────────────────────────────────────────────────────

const AREA_1 = 'area-uuid-1'
const AREA_2 = 'area-uuid-2'

const SUBAREAS: SubareaDef[] = [
  { id: 'sub-1-1', areaId: AREA_1, name: 'Sueño y Descanso', isActive: true },
  { id: 'sub-1-2', areaId: AREA_1, name: 'Ejercicio y Movimiento', isActive: true },
  { id: 'sub-2-1', areaId: AREA_2, name: 'Seguridad Financiera', isActive: true },
]

// ── Tests: createActivity subareaId handling ───────────────────────────────────

describe('createActivity — subareaId linking', () => {
  it('accepts a valid subareaId that belongs to the selected areaId', () => {
    const payload = buildActivityPayload(AREA_1, 'sub-1-1', SUBAREAS)
    expect(payload.subareaId).toBe('sub-1-1')
    expect(payload.areaId).toBe(AREA_1)
  })

  it('rejects subareaId from a different area', () => {
    expect(() => buildActivityPayload(AREA_1, 'sub-2-1', SUBAREAS)).toThrow(
      'Sub-área no pertenece al área seleccionada'
    )
  })

  it('accepts null subareaId — fallback defensivo funciona', () => {
    const payload = buildActivityPayload(AREA_1, null, SUBAREAS)
    expect(payload.subareaId).toBeNull()
  })

  it('accepts subareaId = null when areaId is also null', () => {
    const payload = buildActivityPayload(null, null, SUBAREAS)
    expect(payload.subareaId).toBeNull()
    expect(payload.areaId).toBeNull()
  })

  it('rejects completely unknown subareaId', () => {
    expect(() => buildActivityPayload(AREA_1, 'non-existent-uuid', SUBAREAS)).toThrow(
      'Sub-área no pertenece al área seleccionada'
    )
  })
})

// ── Tests: createHabit subareaId handling ─────────────────────────────────────

describe('createHabit — subareaId linking', () => {
  it('accepts a valid subareaId that belongs to the selected areaId', () => {
    const payload = buildHabitPayload(AREA_2, 'sub-2-1', SUBAREAS)
    expect(payload.subareaId).toBe('sub-2-1')
  })

  it('rejects subareaId of a different area', () => {
    expect(() => buildHabitPayload(AREA_2, 'sub-1-1', SUBAREAS)).toThrow(
      'Sub-área no pertenece al área seleccionada'
    )
  })

  it('accepts undefined subareaId (not provided by user)', () => {
    const payload = buildHabitPayload(AREA_1, undefined, SUBAREAS)
    expect(payload.subareaId).toBeNull()
  })

  it('persists subareaId correctly when valid', () => {
    const payload = buildHabitPayload(AREA_1, 'sub-1-2', SUBAREAS)
    expect(payload.subareaId).toBe('sub-1-2')
    expect(payload.areaId).toBe(AREA_1)
  })
})

// ── Tests: backward compatibility ─────────────────────────────────────────────

describe('backward compatibility — null subareaId', () => {
  it('activities with subareaId = null are valid and do not throw', () => {
    expect(() => buildActivityPayload(AREA_1, null, SUBAREAS)).not.toThrow()
  })

  it('habits with subareaId = undefined are valid and persist null', () => {
    const payload = buildHabitPayload(AREA_1, undefined, SUBAREAS)
    expect(payload.subareaId).toBeNull()
  })

  it('no subareaId needed when areaId is also absent', () => {
    const payload = buildActivityPayload(null, null, SUBAREAS)
    expect(payload.areaId).toBeNull()
    expect(payload.subareaId).toBeNull()
  })
})
