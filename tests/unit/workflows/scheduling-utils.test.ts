// tests/unit/workflows/scheduling-utils.test.ts
// Tests unitarios para getNextBusinessDaySlot().
// Función pura — sin dependencias de DB ni browser.

import { describe, it, expect } from 'vitest'
import { getNextBusinessDaySlot } from '@/lib/workflow/scheduling-utils'

// Helper: crea una fecha UTC en el día de la semana especificado
// Lunes=1, Martes=2, ..., Viernes=5, Sábado=6, Domingo=0
function dateOnWeekday(dayUTC: number): Date {
  // Referencia fija: 2026-02-23 es lunes (getUTCDay() === 1)
  const base = new Date('2026-02-23T10:00:00Z') // lunes
  const diff = (dayUTC - 1 + 7) % 7 // días desde lunes
  const d = new Date(base)
  d.setUTCDate(base.getUTCDate() + diff)
  return d
}

describe('getNextBusinessDaySlot', () => {
  it('lunes → martes a las 09:00 UTC', () => {
    const monday = dateOnWeekday(1) // lunes
    const result = getNextBusinessDaySlot(monday)
    expect(result.getUTCDay()).toBe(2) // martes
    expect(result.getUTCHours()).toBe(9)
    expect(result.getUTCMinutes()).toBe(0)
    expect(result.getUTCSeconds()).toBe(0)
  })

  it('viernes → lunes siguiente a las 09:00 UTC', () => {
    const friday = dateOnWeekday(5) // viernes
    const result = getNextBusinessDaySlot(friday)
    expect(result.getUTCDay()).toBe(1) // lunes
    expect(result.getUTCHours()).toBe(9)
    expect(result.getUTCMinutes()).toBe(0)
  })

  it('sábado → lunes siguiente a las 09:00 UTC', () => {
    const saturday = dateOnWeekday(6) // sábado
    const result = getNextBusinessDaySlot(saturday)
    expect(result.getUTCDay()).toBe(1) // lunes
    expect(result.getUTCHours()).toBe(9)
    expect(result.getUTCMinutes()).toBe(0)
  })

  it('domingo → lunes a las 09:00 UTC', () => {
    const sunday = dateOnWeekday(0) // domingo
    const result = getNextBusinessDaySlot(sunday)
    expect(result.getUTCDay()).toBe(1) // lunes
    expect(result.getUTCHours()).toBe(9)
    expect(result.getUTCMinutes()).toBe(0)
  })

  it('siempre avanza al menos 1 día (no retorna el mismo día)', () => {
    // Probar con lunes en horario 00:00 — podría parecer que "hoy es hábil"
    const monday = new Date('2026-02-23T00:00:00Z') // lunes a medianoche
    const result = getNextBusinessDaySlot(monday)
    // Debe ser martes, no lunes
    expect(result.getUTCDay()).toBe(2)
    expect(result > monday).toBe(true)
  })
})
