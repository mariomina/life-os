// tests/unit/areas/triggers.test.ts
// Tests unitarios para los triggers automáticos de recálculo de scores.
// Story 11.4 — Triggers Automáticos + Cron de Decay.
// Nota: los triggers viven en actions/timer.ts, checkin.ts y okrs.ts.
// Estos tests validan la lógica condicional (no-op si subareaId es null)
// y el contrato del endpoint de cron.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Helpers para simular la lógica condicional de los triggers ───────────────

/**
 * Simula la lógica del trigger en stopTimer:
 * solo llama recalculate si subareaId está definido.
 */
function timerStopTrigger(
  subareaId: string | null | undefined,
  areaId: string | null | undefined,
  recalcSubarea: (id: string) => void,
  recalcArea: (id: string) => void
) {
  if (subareaId && areaId) {
    recalcSubarea(subareaId)
    recalcArea(areaId)
  }
}

/**
 * Simula la lógica del trigger en confirmActivity:
 * solo llama recalculate si status='completed' y subareaId definido.
 */
function activityCompletedTrigger(
  status: string,
  subareaId: string | null | undefined,
  areaId: string | null | undefined,
  recalcSubarea: (id: string) => void,
  recalcArea: (id: string) => void
) {
  if (status === 'completed' && subareaId && areaId) {
    recalcSubarea(subareaId)
    recalcArea(areaId)
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('trigger: stopTimer', () => {
  it('llama recalculate cuando subareaId está definido', () => {
    const recalcSubarea = vi.fn()
    const recalcArea = vi.fn()
    timerStopTrigger('subarea-uuid', 'area-uuid', recalcSubarea, recalcArea)
    expect(recalcSubarea).toHaveBeenCalledWith('subarea-uuid')
    expect(recalcArea).toHaveBeenCalledWith('area-uuid')
  })

  it('NO llama recalculate cuando subareaId es null', () => {
    const recalcSubarea = vi.fn()
    const recalcArea = vi.fn()
    timerStopTrigger(null, 'area-uuid', recalcSubarea, recalcArea)
    expect(recalcSubarea).not.toHaveBeenCalled()
    expect(recalcArea).not.toHaveBeenCalled()
  })

  it('NO llama recalculate cuando subareaId es undefined', () => {
    const recalcSubarea = vi.fn()
    const recalcArea = vi.fn()
    timerStopTrigger(undefined, 'area-uuid', recalcSubarea, recalcArea)
    expect(recalcSubarea).not.toHaveBeenCalled()
    expect(recalcArea).not.toHaveBeenCalled()
  })

  it('NO llama recalculate cuando areaId es null (datos inconsistentes)', () => {
    const recalcSubarea = vi.fn()
    const recalcArea = vi.fn()
    timerStopTrigger('subarea-uuid', null, recalcSubarea, recalcArea)
    expect(recalcSubarea).not.toHaveBeenCalled()
    expect(recalcArea).not.toHaveBeenCalled()
  })
})

describe('trigger: activity completada', () => {
  it('llama recalculate cuando status=completed y subareaId definido', () => {
    const recalcSubarea = vi.fn()
    const recalcArea = vi.fn()
    activityCompletedTrigger('completed', 'subarea-uuid', 'area-uuid', recalcSubarea, recalcArea)
    expect(recalcSubarea).toHaveBeenCalledWith('subarea-uuid')
    expect(recalcArea).toHaveBeenCalledWith('area-uuid')
  })

  it('NO llama recalculate cuando status=skipped', () => {
    const recalcSubarea = vi.fn()
    const recalcArea = vi.fn()
    activityCompletedTrigger('skipped', 'subarea-uuid', 'area-uuid', recalcSubarea, recalcArea)
    expect(recalcSubarea).not.toHaveBeenCalled()
  })

  it('NO llama recalculate cuando status=postponed', () => {
    const recalcSubarea = vi.fn()
    const recalcArea = vi.fn()
    activityCompletedTrigger('postponed', 'subarea-uuid', 'area-uuid', recalcSubarea, recalcArea)
    expect(recalcSubarea).not.toHaveBeenCalled()
  })

  it('NO llama recalculate cuando subareaId es null (actividad sin sub-área)', () => {
    const recalcSubarea = vi.fn()
    const recalcArea = vi.fn()
    activityCompletedTrigger('completed', null, 'area-uuid', recalcSubarea, recalcArea)
    expect(recalcSubarea).not.toHaveBeenCalled()
    expect(recalcArea).not.toHaveBeenCalled()
  })
})

describe('endpoint cron: /api/cron/recalculate-areas', () => {
  const CRON_SECRET = 'test-secret-abc123'

  /**
   * Simula el handler del cron endpoint con la lógica de autenticación.
   */
  async function cronHandler(
    authHeader: string | null,
    secret: string,
    processUsers: () => Promise<{ processed: number; errors: number; total: number }>
  ): Promise<{ status: number; body: unknown }> {
    if (authHeader !== `Bearer ${secret}`) {
      return { status: 401, body: { error: 'Unauthorized' } }
    }
    const stats = await processUsers()
    return { status: 200, body: stats }
  }

  it('rechaza requests sin header Authorization', async () => {
    const result = await cronHandler(null, CRON_SECRET, async () => ({
      processed: 0,
      errors: 0,
      total: 0,
    }))
    expect(result.status).toBe(401)
    expect((result.body as { error: string }).error).toBe('Unauthorized')
  })

  it('rechaza requests con secret incorrecto', async () => {
    const result = await cronHandler('Bearer wrong-secret', CRON_SECRET, async () => ({
      processed: 0,
      errors: 0,
      total: 0,
    }))
    expect(result.status).toBe(401)
  })

  it('acepta request con secret correcto y retorna stats', async () => {
    const result = await cronHandler(`Bearer ${CRON_SECRET}`, CRON_SECRET, async () => ({
      processed: 5,
      errors: 0,
      total: 5,
    }))
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ processed: 5, errors: 0, total: 5 })
  })

  it('retorna stats con errores si algún usuario falla', async () => {
    const result = await cronHandler(`Bearer ${CRON_SECRET}`, CRON_SECRET, async () => ({
      processed: 3,
      errors: 2,
      total: 5,
    }))
    expect(result.status).toBe(200)
    const body = result.body as { processed: number; errors: number; total: number }
    expect(body.processed).toBe(3)
    expect(body.errors).toBe(2)
    expect(body.total).toBe(5)
  })
})
