// tests/unit/areas/checkin-scheduler.test.ts
// Tests unitarios para la lógica de detección de checkins pendientes.
// Story 11.5 — Checkin Periódico por Sub-área.

import { describe, it, expect } from 'vitest'
import { getPendingCheckins, getPeriodStart, normalizeScore } from '@/lib/areas/checkin-scheduler'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'
import type { AreaSubareaScore } from '@/lib/db/schema/area-subarea-scores'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSubarea(overrides: Partial<AreaSubarea> & { slug: string }): AreaSubarea {
  return {
    id: overrides.id ?? `subarea-${overrides.slug}`,
    areaId: 'area-uuid',
    userId: 'user-uuid',
    maslowLevel: overrides.maslowLevel ?? 1,
    name: overrides.name ?? overrides.slug,
    slug: overrides.slug,
    internalWeight: '0.200',
    currentScore: 0,
    displayOrder: 1,
    isOptional: false,
    isActive: true,
    scoreUpdatedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  }
}

function makeScore(
  subareaId: string,
  scoredAt: string
): Pick<AreaSubareaScore, 'subareaId' | 'scoredAt'> {
  return { subareaId, scoredAt }
}

// Reference date: Wednesday 2026-03-11 (mid-week, mid-March, Q1)
const NOW = new Date('2026-03-11T12:00:00Z')

// ─── normalizeScore ───────────────────────────────────────────────────────────

describe('normalizeScore', () => {
  it('1 → 0', () => {
    expect(normalizeScore(1)).toBe(0)
  })

  it('10 → 100', () => {
    expect(normalizeScore(10)).toBe(100)
  })

  it('5 → 44 (rounded)', () => {
    // (5-1)/9*100 = 44.44... → 44
    expect(normalizeScore(5)).toBe(44)
  })

  it('7 → 67 (rounded)', () => {
    // (7-1)/9*100 = 66.66... → 67
    expect(normalizeScore(7)).toBe(67)
  })

  it('throws RangeError for score 0', () => {
    expect(() => normalizeScore(0)).toThrow(RangeError)
  })

  it('throws RangeError for score 11', () => {
    expect(() => normalizeScore(11)).toThrow(RangeError)
  })
})

// ─── getPeriodStart ───────────────────────────────────────────────────────────

describe('getPeriodStart', () => {
  it('daily → returns today at midnight UTC', () => {
    const result = getPeriodStart('daily', NOW)
    expect(result.toISOString()).toBe('2026-03-11T00:00:00.000Z')
  })

  it('weekly → returns Monday of current week', () => {
    // 2026-03-11 is Wednesday → Monday is 2026-03-09
    const result = getPeriodStart('weekly', NOW)
    expect(result.toISOString()).toBe('2026-03-09T00:00:00.000Z')
  })

  it('weekly → Sunday is mapped to Monday of previous week', () => {
    const sunday = new Date('2026-03-08T12:00:00Z') // Sunday
    const result = getPeriodStart('weekly', sunday)
    expect(result.toISOString()).toBe('2026-03-02T00:00:00.000Z')
  })

  it('monthly → returns first day of current month', () => {
    const result = getPeriodStart('monthly', NOW)
    expect(result.toISOString()).toBe('2026-03-01T00:00:00.000Z')
  })

  it('quarterly → returns first day of current quarter (Q1=Jan 1)', () => {
    const result = getPeriodStart('quarterly', NOW) // March → Q1
    expect(result.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('quarterly → Q2 starts April 1', () => {
    const april = new Date('2026-04-15T12:00:00Z')
    const result = getPeriodStart('quarterly', april)
    expect(result.toISOString()).toBe('2026-04-01T00:00:00.000Z')
  })
})

// ─── getPendingCheckins ───────────────────────────────────────────────────────

describe('getPendingCheckins', () => {
  it('sub-área con checkin diario vencido aparece en pendientes', () => {
    const subarea = makeSubarea({ slug: 'sueno', maslowLevel: 1 })
    // Last scored yesterday
    const scores = [makeScore(subarea.id, '2026-03-10')]

    const pending = getPendingCheckins([subarea], scores, NOW)
    expect(pending).toHaveLength(1)
    expect(pending[0].slug).toBe('sueno')
  })

  it('sub-área con checkin respondido hoy NO aparece en pendientes', () => {
    const subarea = makeSubarea({ slug: 'sueno', maslowLevel: 1 })
    const scores = [makeScore(subarea.id, '2026-03-11')]

    const pending = getPendingCheckins([subarea], scores, NOW)
    expect(pending).toHaveLength(0)
  })

  it('sub-área sin ningún score aparece en pendientes', () => {
    const subarea = makeSubarea({ slug: 'ejercicio', maslowLevel: 1 })

    const pending = getPendingCheckins([subarea], [], NOW)
    expect(pending).toHaveLength(1)
  })

  it('sub-área weekly respondida esta semana NO aparece en pendientes', () => {
    const subarea = makeSubarea({ slug: 'pareja', maslowLevel: 3 })
    // Monday this week = 2026-03-09
    const scores = [makeScore(subarea.id, '2026-03-09')]

    const pending = getPendingCheckins([subarea], scores, NOW)
    expect(pending).toHaveLength(0)
  })

  it('sub-área weekly respondida la semana pasada aparece en pendientes', () => {
    const subarea = makeSubarea({ slug: 'pareja', maslowLevel: 3 })
    const scores = [makeScore(subarea.id, '2026-03-07')] // Saturday previous week

    const pending = getPendingCheckins([subarea], scores, NOW)
    expect(pending).toHaveLength(1)
  })

  it('sub-área monthly respondida este mes NO aparece en pendientes', () => {
    const subarea = makeSubarea({ slug: 'autoeficacia', maslowLevel: 4 })
    const scores = [makeScore(subarea.id, '2026-03-01')]

    const pending = getPendingCheckins([subarea], scores, NOW)
    expect(pending).toHaveLength(0)
  })

  it('sub-área quarterly respondida este trimestre NO aparece en pendientes', () => {
    const subarea = makeSubarea({ slug: 'proposito', maslowLevel: 7 })
    const scores = [makeScore(subarea.id, '2026-01-15')] // Q1

    const pending = getPendingCheckins([subarea], scores, NOW)
    expect(pending).toHaveLength(0)
  })

  it('sub-área sin pregunta definida NO aparece en pendientes', () => {
    const subarea = makeSubarea({ slug: 'slug-sin-pregunta', maslowLevel: 1 })

    const pending = getPendingCheckins([subarea], [], NOW)
    expect(pending).toHaveLength(0)
  })

  it('filtra correctamente múltiples sub-áreas mixtas', () => {
    const suenoSubarea = makeSubarea({ id: 'id-sueno', slug: 'sueno', maslowLevel: 1 })
    const ejercicioSubarea = makeSubarea({ id: 'id-ejercicio', slug: 'ejercicio', maslowLevel: 1 })
    const parejaSubarea = makeSubarea({ id: 'id-pareja', slug: 'pareja', maslowLevel: 3 })

    const scores = [
      makeScore('id-sueno', '2026-03-11'), // today → not pending
      // ejercicio: no scores → pending
      makeScore('id-pareja', '2026-03-02'), // before this week → pending
    ]

    const pending = getPendingCheckins([suenoSubarea, ejercicioSubarea, parejaSubarea], scores, NOW)

    expect(pending).toHaveLength(2)
    const slugs = pending.map((s) => s.slug)
    expect(slugs).toContain('ejercicio')
    expect(slugs).toContain('pareja')
    expect(slugs).not.toContain('sueno')
  })
})
