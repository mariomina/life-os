import { describe, it, expect } from 'vitest'

// ─── Pure validation helpers (extracted from actions/calendar.ts logic) ───────
// These tests verify the validation rules without hitting the database.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateCreateActivityInput(params: {
  title: string
  date: string
  time: string
  duration: number
  areaId: string
}): string | null {
  const trimmedTitle = params.title.trim()
  if (!trimmedTitle) return 'El título es requerido'
  if (trimmedTitle.length > 100) return 'El título no puede superar 100 caracteres'
  if (!params.areaId || !UUID_REGEX.test(params.areaId)) return 'Selecciona un área válida'
  if (!params.date || !params.time) return 'La fecha y hora son requeridas'
  const scheduledAt = new Date(`${params.date}T${params.time}:00`)
  if (isNaN(scheduledAt.getTime())) return 'Fecha u hora inválida'
  return null
}

function validateDeleteActivityInput(activityId: string): string | null {
  if (!activityId || !UUID_REGEX.test(activityId)) return 'ID de actividad inválido'
  return null
}

function normalizeDuration(raw: unknown): number {
  const n = Number(raw ?? 30)
  return isNaN(n) || n <= 0 ? 30 : n
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// ─── createActivity validation ─────────────────────────────────────────────────

describe('createActivity — input validation', () => {
  it('rejects empty title', () => {
    const result = validateCreateActivityInput({
      title: '   ',
      date: '2024-06-15',
      time: '09:00',
      duration: 30,
      areaId: VALID_UUID,
    })
    expect(result).toBe('El título es requerido')
  })

  it('rejects title exceeding 100 characters', () => {
    const result = validateCreateActivityInput({
      title: 'a'.repeat(101),
      date: '2024-06-15',
      time: '09:00',
      duration: 30,
      areaId: VALID_UUID,
    })
    expect(result).toBe('El título no puede superar 100 caracteres')
  })

  it('accepts title of exactly 100 characters', () => {
    const result = validateCreateActivityInput({
      title: 'a'.repeat(100),
      date: '2024-06-15',
      time: '09:00',
      duration: 30,
      areaId: VALID_UUID,
    })
    expect(result).toBeNull()
  })

  it('rejects missing areaId', () => {
    const result = validateCreateActivityInput({
      title: 'Test',
      date: '2024-06-15',
      time: '09:00',
      duration: 30,
      areaId: '',
    })
    expect(result).toBe('Selecciona un área válida')
  })

  it('rejects invalid UUID format as areaId', () => {
    const result = validateCreateActivityInput({
      title: 'Test',
      date: '2024-06-15',
      time: '09:00',
      duration: 30,
      areaId: 'not-a-uuid',
    })
    expect(result).toBe('Selecciona un área válida')
  })

  it('accepts valid UUID as areaId', () => {
    const result = validateCreateActivityInput({
      title: 'Test',
      date: '2024-06-15',
      time: '09:00',
      duration: 30,
      areaId: VALID_UUID,
    })
    expect(result).toBeNull()
  })

  it('rejects missing date', () => {
    const result = validateCreateActivityInput({
      title: 'Test',
      date: '',
      time: '09:00',
      duration: 30,
      areaId: VALID_UUID,
    })
    expect(result).toBe('La fecha y hora son requeridas')
  })

  it('rejects missing time', () => {
    const result = validateCreateActivityInput({
      title: 'Test',
      date: '2024-06-15',
      time: '',
      duration: 30,
      areaId: VALID_UUID,
    })
    expect(result).toBe('La fecha y hora son requeridas')
  })

  it('accepts valid complete input', () => {
    const result = validateCreateActivityInput({
      title: 'Revisión semanal',
      date: '2024-06-15',
      time: '09:00',
      duration: 60,
      areaId: VALID_UUID,
    })
    expect(result).toBeNull()
  })
})

// ─── deleteActivity validation ─────────────────────────────────────────────────

describe('deleteActivity — input validation', () => {
  it('rejects empty activityId', () => {
    expect(validateDeleteActivityInput('')).toBe('ID de actividad inválido')
  })

  it('rejects non-UUID string', () => {
    expect(validateDeleteActivityInput('not-a-valid-uuid')).toBe('ID de actividad inválido')
  })

  it('accepts valid UUID', () => {
    expect(validateDeleteActivityInput(VALID_UUID)).toBeNull()
  })

  it('accepts UUID with uppercase letters', () => {
    expect(validateDeleteActivityInput(VALID_UUID.toUpperCase())).toBeNull()
  })
})

// ─── Duration normalization ────────────────────────────────────────────────────

describe('duration normalization', () => {
  it('uses 30 as default when value is NaN', () => {
    expect(normalizeDuration(NaN)).toBe(30)
  })

  it('uses 30 as default when value is 0', () => {
    expect(normalizeDuration(0)).toBe(30)
  })

  it('uses 30 as default when value is negative', () => {
    expect(normalizeDuration(-15)).toBe(30)
  })

  it('preserves valid positive duration', () => {
    expect(normalizeDuration(60)).toBe(60)
    expect(normalizeDuration(15)).toBe(15)
    expect(normalizeDuration(120)).toBe(120)
  })

  it('uses 30 as default when null/undefined', () => {
    expect(normalizeDuration(null)).toBe(30)
    expect(normalizeDuration(undefined)).toBe(30)
  })
})
