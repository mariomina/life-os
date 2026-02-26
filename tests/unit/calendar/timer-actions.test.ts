import { describe, it, expect } from 'vitest'

// ─── Pure validation helpers (extracted from actions/timer.ts logic) ──────────
// These tests verify the validation rules without hitting the database.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateStartTimerInput(activityId: string): string | null {
  if (!activityId || !UUID_REGEX.test(activityId)) return 'ID de actividad inválido'
  return null
}

function validateStopTimerInput(entryId: string): string | null {
  if (!entryId || !UUID_REGEX.test(entryId)) return 'ID de entrada inválido'
  return null
}

function validatePauseTimerInput(entryId: string, reason: string): string | null {
  if (!entryId || !UUID_REGEX.test(entryId)) return 'ID de entrada inválido'
  const trimmed = reason.trim()
  if (!trimmed) return 'La razón de la pausa es requerida'
  if (trimmed.length > 200) return 'La razón no puede superar 200 caracteres'
  return null
}

function validateResumeTimerInput(entryId: string): string | null {
  if (!entryId || !UUID_REGEX.test(entryId)) return 'ID de entrada inválido'
  return null
}

function calcTotalSeconds(entries: Array<{ durationSeconds: number | null }>): number {
  return entries.reduce((acc, e) => acc + (e.durationSeconds ?? 0), 0)
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// ─── startTimer validation ────────────────────────────────────────────────────

describe('startTimer — input validation', () => {
  it('rejects empty activityId', () => {
    expect(validateStartTimerInput('')).toBe('ID de actividad inválido')
  })

  it('rejects non-UUID activityId', () => {
    expect(validateStartTimerInput('not-a-uuid')).toBe('ID de actividad inválido')
  })

  it('accepts valid UUID activityId', () => {
    expect(validateStartTimerInput(VALID_UUID)).toBeNull()
  })

  it('accepts UUID with uppercase letters', () => {
    expect(validateStartTimerInput(VALID_UUID.toUpperCase())).toBeNull()
  })
})

// ─── stopTimer validation ─────────────────────────────────────────────────────

describe('stopTimer — input validation', () => {
  it('rejects empty entryId', () => {
    expect(validateStopTimerInput('')).toBe('ID de entrada inválido')
  })

  it('rejects non-UUID entryId', () => {
    expect(validateStopTimerInput('bad-id')).toBe('ID de entrada inválido')
  })

  it('accepts valid UUID entryId', () => {
    expect(validateStopTimerInput(VALID_UUID)).toBeNull()
  })
})

// ─── pauseTimer validation ────────────────────────────────────────────────────

describe('pauseTimer — input validation', () => {
  it('rejects empty entryId', () => {
    expect(validatePauseTimerInput('', 'razón válida')).toBe('ID de entrada inválido')
  })

  it('rejects non-UUID entryId', () => {
    expect(validatePauseTimerInput('not-uuid', 'razón válida')).toBe('ID de entrada inválido')
  })

  it('rejects empty reason (empty string)', () => {
    expect(validatePauseTimerInput(VALID_UUID, '')).toBe('La razón de la pausa es requerida')
  })

  it('rejects reason with only whitespace', () => {
    expect(validatePauseTimerInput(VALID_UUID, '   ')).toBe('La razón de la pausa es requerida')
  })

  it('rejects reason exceeding 200 characters', () => {
    expect(validatePauseTimerInput(VALID_UUID, 'a'.repeat(201))).toBe(
      'La razón no puede superar 200 caracteres'
    )
  })

  it('accepts reason of exactly 200 characters', () => {
    expect(validatePauseTimerInput(VALID_UUID, 'a'.repeat(200))).toBeNull()
  })

  it('accepts valid entryId and reason', () => {
    expect(validatePauseTimerInput(VALID_UUID, 'Reunión inesperada')).toBeNull()
  })
})

// ─── resumeTimer validation ───────────────────────────────────────────────────

describe('resumeTimer — input validation', () => {
  it('rejects empty entryId', () => {
    expect(validateResumeTimerInput('')).toBe('ID de entrada inválido')
  })

  it('rejects non-UUID entryId', () => {
    expect(validateResumeTimerInput('bad')).toBe('ID de entrada inválido')
  })

  it('accepts valid UUID entryId', () => {
    expect(validateResumeTimerInput(VALID_UUID)).toBeNull()
  })
})

// ─── calcTotalSeconds ─────────────────────────────────────────────────────────

describe('calcTotalSeconds', () => {
  it('sums multiple completed entries correctly', () => {
    const entries = [{ durationSeconds: 300 }, { durationSeconds: 600 }, { durationSeconds: 120 }]
    expect(calcTotalSeconds(entries)).toBe(1020)
  })

  it('treats null durationSeconds as 0 (active timer without endedAt)', () => {
    const entries = [{ durationSeconds: 300 }, { durationSeconds: null }]
    expect(calcTotalSeconds(entries)).toBe(300)
  })

  it('returns 0 for empty entries array', () => {
    expect(calcTotalSeconds([])).toBe(0)
  })

  it('returns 0 for all-null entries', () => {
    const entries = [{ durationSeconds: null }, { durationSeconds: null }]
    expect(calcTotalSeconds(entries)).toBe(0)
  })

  it('handles single completed entry', () => {
    expect(calcTotalSeconds([{ durationSeconds: 3600 }])).toBe(3600)
  })
})
