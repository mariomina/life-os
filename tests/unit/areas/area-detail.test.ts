// tests/unit/areas/area-detail.test.ts
// Tests unitarios para Story 11.7 — Detalle de área /areas/[slug].
// Valida: slug slugs, source type classification, days since activity, decay detection.

import { describe, it, expect } from 'vitest'

// ─── Slug values (from migration 20260312) ────────────────────────────────────

const AREA_SLUGS: Record<number, string> = {
  1: 'fisiologica',
  2: 'seguridad',
  3: 'pertenencia',
  4: 'estima',
  5: 'cognitiva',
  6: 'estetica',
  7: 'autorrealizacion',
  8: 'autotrascendencia',
}

describe('AREA_SLUGS', () => {
  it('hay exactamente 8 slugs', () => {
    expect(Object.keys(AREA_SLUGS)).toHaveLength(8)
  })

  it('todos los slugs son lowercase y sin espacios', () => {
    for (const slug of Object.values(AREA_SLUGS)) {
      expect(slug).toBe(slug.toLowerCase())
      expect(slug).not.toContain(' ')
    }
  })

  it('los slugs cubren niveles 1-8', () => {
    for (let level = 1; level <= 8; level++) {
      expect(AREA_SLUGS[level]).toBeDefined()
    }
  })

  it('slug L1 es fisiologica', () => {
    expect(AREA_SLUGS[1]).toBe('fisiologica')
  })

  it('slug L8 es autotrascendencia', () => {
    expect(AREA_SLUGS[8]).toBe('autotrascendencia')
  })
})

// ─── Source type classification ───────────────────────────────────────────────

type SourceType = 'habit' | 'activity' | 'project'

interface AreaSource {
  id: string
  type: SourceType
  title: string
  streak?: number
  lastCompletedAt?: string | null
  completedAt?: Date | null
  progress?: number
  href: string
}

function classifyHref(source: AreaSource): string {
  if (source.type === 'habit') return '/habits'
  if (source.type === 'activity') return '/calendar'
  return `/projects/${source.id}`
}

describe('source href classification', () => {
  it('habit → /habits', () => {
    const s: AreaSource = { id: 'h1', type: 'habit', title: 'Correr', href: '/habits' }
    expect(classifyHref(s)).toBe('/habits')
  })

  it('activity → /calendar', () => {
    const s: AreaSource = { id: 'a1', type: 'activity', title: 'Yoga', href: '/calendar' }
    expect(classifyHref(s)).toBe('/calendar')
  })

  it('project → /projects/:id', () => {
    const s: AreaSource = {
      id: 'p-uuid',
      type: 'project',
      title: 'Maratón Q1',
      href: '/projects/p-uuid',
    }
    expect(classifyHref(s)).toBe('/projects/p-uuid')
  })
})

// ─── Days since activity ──────────────────────────────────────────────────────

function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

describe('daysSince', () => {
  it('retorna null para fecha nula', () => {
    expect(daysSince(null)).toBeNull()
  })

  it('retorna null para undefined', () => {
    expect(daysSince(undefined)).toBeNull()
  })

  it('retorna null para fecha inválida', () => {
    expect(daysSince('not-a-date')).toBeNull()
  })

  it('retorna 0 para hoy', () => {
    const today = new Date()
    expect(daysSince(today)).toBe(0)
  })

  it('retorna 1 para ayer', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(daysSince(yesterday)).toBe(1)
  })

  it('retorna 7 para hace 7 días', () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    expect(daysSince(sevenDaysAgo)).toBe(7)
  })

  it('acepta string ISO', () => {
    const d = new Date()
    d.setDate(d.getDate() - 3)
    expect(daysSince(d.toISOString().slice(0, 10))).toBe(3)
  })
})

// ─── Decay detection ──────────────────────────────────────────────────────────

function hasDecay(sources: AreaSource[], thresholdDays = 7): boolean {
  const dates: (Date | string | null | undefined)[] = [
    ...sources.filter((s) => s.type === 'habit').map((s) => s.lastCompletedAt),
    ...sources.filter((s) => s.type === 'activity').map((s) => s.completedAt),
  ]
  const validDays = dates.map((d) => daysSince(d)).filter((d): d is number => d !== null)
  if (validDays.length === 0) return false
  return Math.min(...validDays) >= thresholdDays
}

describe('hasDecay', () => {
  it('false cuando no hay fuentes', () => {
    expect(hasDecay([])).toBe(false)
  })

  it('false cuando hábito completado hoy', () => {
    const today = new Date().toISOString().slice(0, 10)
    const sources: AreaSource[] = [
      { id: 'h1', type: 'habit', title: 'Correr', lastCompletedAt: today, href: '/habits' },
    ]
    expect(hasDecay(sources)).toBe(false)
  })

  it('true cuando hábito no completado en más de 7 días', () => {
    const old = new Date()
    old.setDate(old.getDate() - 10)
    const sources: AreaSource[] = [
      {
        id: 'h1',
        type: 'habit',
        title: 'Correr',
        lastCompletedAt: old.toISOString().slice(0, 10),
        href: '/habits',
      },
    ]
    expect(hasDecay(sources)).toBe(true)
  })

  it('false cuando actividad completada hace 3 días (bajo umbral)', () => {
    const recent = new Date()
    recent.setDate(recent.getDate() - 3)
    const sources: AreaSource[] = [
      { id: 'a1', type: 'activity', title: 'Yoga', completedAt: recent, href: '/calendar' },
    ]
    expect(hasDecay(sources)).toBe(false)
  })

  it('false cuando hay proyectos sin hábitos/actividades (proyectos no cuentan para decay)', () => {
    const sources: AreaSource[] = [
      { id: 'p1', type: 'project', title: 'Proyecto X', progress: 50, href: '/projects/p1' },
    ]
    expect(hasDecay(sources)).toBe(false)
  })

  it('false cuando una fuente es reciente aunque otra sea antigua', () => {
    const old = new Date()
    old.setDate(old.getDate() - 20)
    const recent = new Date()
    recent.setDate(recent.getDate() - 1)
    const sources: AreaSource[] = [
      {
        id: 'h1',
        type: 'habit',
        title: 'Meditación',
        lastCompletedAt: old.toISOString().slice(0, 10),
        href: '/habits',
      },
      { id: 'a1', type: 'activity', title: 'Yoga', completedAt: recent, href: '/calendar' },
    ]
    expect(hasDecay(sources)).toBe(false)
  })
})

// ─── Score display helpers ────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'green'
  if (score >= 60) return 'yellow'
  if (score >= 40) return 'orange'
  return 'red'
}

describe('scoreColor', () => {
  it('≥80 → green', () => expect(scoreColor(80)).toBe('green'))
  it('≥60 → yellow', () => expect(scoreColor(60)).toBe('yellow'))
  it('≥40 → orange', () => expect(scoreColor(40)).toBe('orange'))
  it('<40 → red', () => expect(scoreColor(39)).toBe('red'))
  it('0 → red', () => expect(scoreColor(0)).toBe('red'))
  it('100 → green', () => expect(scoreColor(100)).toBe('green'))
})
