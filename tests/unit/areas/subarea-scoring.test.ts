// tests/unit/areas/subarea-scoring.test.ts
// Tests unitarios para el motor de cálculo puro de sub-áreas.
// Story 11.3 — Motor de Cálculo.

import { describe, it, expect } from 'vitest'
import {
  calculateBehavioralScore,
  calculateSubareaScore,
  applyDecay,
  DECAY_THRESHOLDS,
  type BehavioralSignals,
} from '@/features/maslow/subarea-scoring'
import { calculateAreaScoreFromSubareas } from '@/features/maslow/scoring'

// Helper para construir señales con defaults
function makeSignals(overrides: Partial<BehavioralSignals> = {}): BehavioralSignals {
  return {
    subareaSlug: 'generic',
    maslowLevel: 3,
    completedHabitDays: 0,
    totalDaysInWindow: 30,
    completedActivities: 0,
    totalTimeSeconds: 0,
    completedKRProgress: -1,
    ...overrides,
  }
}

describe('calculateBehavioralScore', () => {
  it('retorna 0 cuando no hay señales', () => {
    const score = calculateBehavioralScore(makeSignals())
    expect(score).toBe(0)
  })

  it('retorna score entre 0 y 100 con señales reales', () => {
    const score = calculateBehavioralScore(
      makeSignals({ completedActivities: 3, totalTimeSeconds: 7200 })
    )
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('no supera 100 con señales que exceden el target', () => {
    const score = calculateBehavioralScore(
      makeSignals({ completedActivities: 999, totalTimeSeconds: 999999 })
    )
    expect(score).toBe(100)
  })

  it('slug "sueno" usa fórmula de horas + consistencia', () => {
    // 8h/día × 7 días = 201600 segundos, 7/7 días de hábito → debería ser cercano a 100
    const score = calculateBehavioralScore(
      makeSignals({
        subareaSlug: 'sueno',
        maslowLevel: 1,
        totalTimeSeconds: 201600, // 8h × 7 días
        completedHabitDays: 7,
        totalDaysInWindow: 7,
      })
    )
    expect(score).toBe(100)
  })

  it('slug "sueno" con 0 señales retorna 0', () => {
    const score = calculateBehavioralScore(
      makeSignals({ subareaSlug: 'sueno', maslowLevel: 1, totalDaysInWindow: 7 })
    )
    expect(score).toBe(0)
  })

  it('slug "gratitud" con práctica diaria retorna 100', () => {
    const score = calculateBehavioralScore(
      makeSignals({
        subareaSlug: 'gratitud',
        maslowLevel: 7,
        completedHabitDays: 7,
        totalDaysInWindow: 7,
      })
    )
    expect(score).toBe(100)
  })

  it('slug "servicio" con 8h de voluntariado retorna 100', () => {
    const score = calculateBehavioralScore(
      makeSignals({
        subareaSlug: 'servicio',
        maslowLevel: 6,
        totalTimeSeconds: 8 * 3600,
      })
    )
    expect(score).toBe(100)
  })

  it('fórmula genérica: 3 actividades + 2h retorna 100', () => {
    const score = calculateBehavioralScore(
      makeSignals({ completedActivities: 3, totalTimeSeconds: 7200 })
    )
    expect(score).toBe(100)
  })
})

describe('calculateSubareaScore', () => {
  it('combina componentes correctamente para L1 (conductual 60%)', () => {
    // L1: behavioral=0.6, subjective=0.3, progress=0.1
    const score = calculateSubareaScore(100, 0, 0, 1)
    expect(score).toBe(60)
  })

  it('combina componentes correctamente para L8 (subjetivo 70%)', () => {
    // L8: behavioral=0.2, subjective=0.7, progress=0.1
    const score = calculateSubareaScore(0, 100, 0, 8)
    expect(score).toBe(70)
  })

  it('resultado con los 3 componentes al 100% retorna 100', () => {
    const score = calculateSubareaScore(100, 100, 100, 4)
    expect(score).toBe(100)
  })

  it('resultado con los 3 componentes a 0 retorna 0', () => {
    const score = calculateSubareaScore(0, 0, 0, 5)
    expect(score).toBe(0)
  })

  it('nunca supera 100', () => {
    // Valores extremos: verificar cap
    const score = calculateSubareaScore(200, 200, 200, 3)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('nunca baja de 0', () => {
    const score = calculateSubareaScore(-50, -50, -50, 3)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('pesos para todos los niveles suman 1.0', () => {
    // Verificar que los pesos internos son correctos llamando con behavioral=50, subj=50, prog=50
    // L1: 50*0.6 + 50*0.3 + 50*0.1 = 50
    expect(calculateSubareaScore(50, 50, 50, 1)).toBe(50)
    expect(calculateSubareaScore(50, 50, 50, 2)).toBe(50)
    expect(calculateSubareaScore(50, 50, 50, 5)).toBe(50)
    expect(calculateSubareaScore(50, 50, 50, 8)).toBe(50)
  })
})

describe('applyDecay', () => {
  it('no aplica decay antes del umbral', () => {
    // L1 threshold = 3 días: con 2 días no hay decay
    const score = applyDecay(80, 2, 1)
    expect(score).toBe(80)
  })

  it('aplica decay exactamente en el umbral (0 días extra = factor 1.0)', () => {
    const score = applyDecay(80, DECAY_THRESHOLDS[1], 1)
    expect(score).toBe(80)
  })

  it('aplica decay exponencial después del umbral', () => {
    // L1 threshold=3, con 4 días: 1 día extra → 80 * 0.95^1 = 76
    const score = applyDecay(80, 4, 1)
    expect(score).toBe(76)
  })

  it('score se reduce progresivamente con más días', () => {
    const score5 = applyDecay(80, 8, 1) // 5 días extra
    const score10 = applyDecay(80, 13, 1) // 10 días extra
    expect(score5).toBeLessThan(80)
    expect(score10).toBeLessThan(score5)
  })

  it('score no baja de 0', () => {
    // 1000 días de inactividad
    const score = applyDecay(100, 1000, 1)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('L4-L8 tienen threshold de 30 días', () => {
    // Con 29 días no hay decay en L4
    expect(applyDecay(80, 29, 4)).toBe(80)
    // Con 31 días hay decay en L4
    expect(applyDecay(80, 31, 4)).toBeLessThan(80)
  })
})

describe('calculateAreaScoreFromSubareas', () => {
  it('retorna 0 con array vacío', () => {
    expect(calculateAreaScoreFromSubareas([])).toBe(0)
  })

  it('retorna 0 si todos los weights son 0', () => {
    const result = calculateAreaScoreFromSubareas([
      { currentScore: 80, internalWeight: 0 },
      { currentScore: 60, internalWeight: 0 },
    ])
    expect(result).toBe(0)
  })

  it('calcula promedio ponderado correcto', () => {
    // 80*0.6 + 40*0.4 = 48 + 16 = 64, dividido entre 1.0 = 64
    const result = calculateAreaScoreFromSubareas([
      { currentScore: 80, internalWeight: 0.6 },
      { currentScore: 40, internalWeight: 0.4 },
    ])
    expect(result).toBe(64)
  })

  it('con una sola sub-área retorna su score', () => {
    const result = calculateAreaScoreFromSubareas([{ currentScore: 75, internalWeight: 1.0 }])
    expect(result).toBe(75)
  })

  it('score 0 en sub-área no es ignorado', () => {
    const result = calculateAreaScoreFromSubareas([
      { currentScore: 100, internalWeight: 0.5 },
      { currentScore: 0, internalWeight: 0.5 },
    ])
    expect(result).toBe(50)
  })
})
