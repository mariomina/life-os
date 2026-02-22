import { describe, it, expect } from 'vitest'
import { getAlerts, daysSince } from '@/features/maslow/alerts'
import type { Area } from '@/lib/db/schema/areas'

// Helper to build a minimal Area object for testing
function makeArea(overrides: Partial<Area> & { maslowLevel: number; name: string }): Area {
  const { maslowLevel, name, lastActivityAt = null, ...rest } = overrides
  return {
    id: `area-${maslowLevel}`,
    userId: 'user-1',
    maslowLevel,
    group: maslowLevel <= 4 ? 'd_needs' : 'b_needs',
    name,
    defaultName: name,
    weightMultiplier: '1.0',
    currentScore: 70,
    lastActivityAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
  }
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

describe('daysSince', () => {
  it('returns Infinity for null', () => {
    expect(daysSince(null)).toBe(Infinity)
  })

  it('returns 0 for today', () => {
    expect(daysSince(new Date())).toBe(0)
  })

  it('returns approximate days for past dates', () => {
    expect(daysSince(daysAgo(5))).toBe(5)
    expect(daysSince(daysAgo(10))).toBe(10)
  })
})

describe('getAlerts', () => {
  it('returns empty array when no areas', () => {
    expect(getAlerts([], {})).toEqual([])
  })

  it('returns no alerts when level 1-2 area has recent activity', () => {
    const area = makeArea({ maslowLevel: 1, name: 'Fisiológica', lastActivityAt: daysAgo(3) })
    expect(getAlerts([area], {})).toEqual([])
  })

  it('returns critical alert when level 1 area has null last_activity_at', () => {
    const area = makeArea({ maslowLevel: 1, name: 'Fisiológica', lastActivityAt: null })
    const alerts = getAlerts([area], {})
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('critical')
    expect(alerts[0].maslowLevel).toBe(1)
    expect(alerts[0].areaName).toBe('Fisiológica')
    expect(alerts[0].message).toContain('nunca')
  })

  it('returns critical alert when level 2 area has >7 days inactivity', () => {
    const area = makeArea({ maslowLevel: 2, name: 'Seguridad', lastActivityAt: daysAgo(10) })
    const alerts = getAlerts([area], {})
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('critical')
    expect(alerts[0].message).toContain('10 días')
  })

  it('returns NO critical alert for level 3-8 areas without activity', () => {
    const area3 = makeArea({ maslowLevel: 3, name: 'Conexión Social', lastActivityAt: null })
    const area8 = makeArea({
      maslowLevel: 8,
      name: 'Autotrascendencia',
      lastActivityAt: daysAgo(30),
    })
    expect(getAlerts([area3, area8], {})).toEqual([])
  })

  it('returns multiple critical alerts for multiple level 1-2 areas', () => {
    const area1 = makeArea({ maslowLevel: 1, name: 'Fisiológica', lastActivityAt: null })
    const area2 = makeArea({ maslowLevel: 2, name: 'Seguridad', lastActivityAt: daysAgo(8) })
    const alerts = getAlerts([area1, area2], {})
    expect(alerts.filter((a) => a.type === 'critical')).toHaveLength(2)
  })

  it('returns no imbalance warning when total time < 60 min', () => {
    const area1 = makeArea({ maslowLevel: 1, name: 'Fisiológica', lastActivityAt: daysAgo(1) })
    const area2 = makeArea({ maslowLevel: 2, name: 'Seguridad', lastActivityAt: daysAgo(1) })
    const timeMap = { 'area-1': 1000, 'area-2': 500 } // < 3600s total
    expect(getAlerts([area1, area2], timeMap).filter((a) => a.type === 'warning')).toHaveLength(0)
  })

  it('returns no imbalance warning when total time = 0', () => {
    const areas = [1, 2, 3, 4].map((l) =>
      makeArea({ maslowLevel: l, name: `Área ${l}`, lastActivityAt: daysAgo(1) })
    )
    expect(getAlerts(areas, {}).filter((a) => a.type === 'warning')).toHaveLength(0)
  })

  it('returns warning when >80% time in ≤2 areas with sufficient total', () => {
    const areas = [1, 2, 3, 4].map((l) =>
      makeArea({ maslowLevel: l, name: `Área ${l}`, lastActivityAt: daysAgo(1) })
    )
    const timeMap = {
      'area-1': 7200, // 2h — 90% of total
      'area-2': 800,
      'area-3': 0,
      'area-4': 0,
    }
    const alerts = getAlerts(areas, timeMap)
    const warnings = alerts.filter((a) => a.type === 'warning')
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toContain('%')
  })

  it('returns NO warning when time is balanced across areas', () => {
    const areas = [1, 2, 3, 4].map((l) =>
      makeArea({ maslowLevel: l, name: `Área ${l}`, lastActivityAt: daysAgo(1) })
    )
    const timeMap = {
      'area-1': 3600,
      'area-2': 3600,
      'area-3': 3600,
      'area-4': 3600,
    }
    expect(getAlerts(areas, timeMap).filter((a) => a.type === 'warning')).toHaveLength(0)
  })
})
