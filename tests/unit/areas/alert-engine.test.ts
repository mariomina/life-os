// tests/unit/areas/alert-engine.test.ts
// Unit tests for Maslow alert rule engine — pure function, no DB.
// Story 11.8 — AlertBanner rules: cascada, balance, crisis_sueno, progresion.

import { describe, it, expect } from 'vitest'
import { evaluateAlertRules } from '@/features/maslow/alert-engine'
import type { RecentActivityStats } from '@/features/maslow/alert-engine'
import type { Area } from '@/lib/db/schema/areas'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeArea(overrides: Partial<Area> & { maslowLevel: number }): Area {
  const { maslowLevel, ...rest } = overrides
  return {
    id: `area-${maslowLevel}`,
    userId: 'user-1',
    maslowLevel,
    group: maslowLevel <= 4 ? 'd_needs' : 'b_needs',
    name: `Area L${maslowLevel}`,
    defaultName: `Area L${maslowLevel}`,
    slug: `slug-l${maslowLevel}`,
    weightMultiplier: '1.0',
    currentScore: 70,
    lastActivityAt: null,
    scoreUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
  }
}

function makeSubarea(
  overrides: Partial<AreaSubarea> & { id: string; name: string; slug: string }
): AreaSubarea {
  return {
    userId: 'user-1',
    areaId: 'area-1',
    maslowLevel: 1,
    internalWeight: '0.5',
    currentScore: 50,
    displayOrder: 1,
    isActive: true,
    isOptional: false,
    scoreUpdatedAt: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function emptyStats(): RecentActivityStats {
  return {
    activitiesBySubarea: {},
    totalActivities: 0,
    l1l2ScoreHistory: {},
    sleepScores: [],
  }
}

/** Generates N days of score history at a given score value */
function scoreHistory(
  areaId: string,
  days: number,
  score: number
): Record<string, { score: number; date: string }[]> {
  const history: { score: number; date: string }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    history.push({ score, date: d.toISOString().slice(0, 10) })
  }
  return { [areaId]: history }
}

// ─── Tests: Cascada ───────────────────────────────────────────────────────────

describe('evaluateAlertRules — cascada', () => {
  it('triggers CRITICAL when L1 area score < 40 for 14+ days', () => {
    const l1 = makeArea({ maslowLevel: 1, currentScore: 30 })
    const stats: RecentActivityStats = {
      ...emptyStats(),
      l1l2ScoreHistory: scoreHistory(l1.id, 14, 25),
    }
    const alerts = evaluateAlertRules([l1], [], stats)
    const cascada = alerts.find((a) => a.rule === 'cascada')
    expect(cascada).toBeDefined()
    expect(cascada?.type).toBe('critical')
    expect(cascada?.canDismiss).toBe(false)
    expect(cascada?.affectedAreas).toContain(l1.slug)
  })

  it('does NOT trigger when L1 score is above threshold', () => {
    const l1 = makeArea({ maslowLevel: 1, currentScore: 50 })
    const stats: RecentActivityStats = {
      ...emptyStats(),
      l1l2ScoreHistory: scoreHistory(l1.id, 14, 50),
    }
    const alerts = evaluateAlertRules([l1], [], stats)
    expect(alerts.find((a) => a.rule === 'cascada')).toBeUndefined()
  })

  it('does NOT trigger when score is low but history is < 14 days', () => {
    const l1 = makeArea({ maslowLevel: 1, currentScore: 30 })
    const stats: RecentActivityStats = {
      ...emptyStats(),
      l1l2ScoreHistory: scoreHistory(l1.id, 10, 25),
    }
    const alerts = evaluateAlertRules([l1], [], stats)
    expect(alerts.find((a) => a.rule === 'cascada')).toBeUndefined()
  })

  it('does NOT trigger for L3+ areas (only L1/L2)', () => {
    const l3 = makeArea({ maslowLevel: 3, currentScore: 20 })
    const stats: RecentActivityStats = {
      ...emptyStats(),
      l1l2ScoreHistory: scoreHistory(l3.id, 14, 20),
    }
    const alerts = evaluateAlertRules([l3], [], stats)
    expect(alerts.find((a) => a.rule === 'cascada')).toBeUndefined()
  })
})

// ─── Tests: Balance ───────────────────────────────────────────────────────────

describe('evaluateAlertRules — balance', () => {
  it('triggers WARNING when >80% activities concentrated in 2 subareas', () => {
    const stats: RecentActivityStats = {
      ...emptyStats(),
      activitiesBySubarea: { 'sub-a': 9, 'sub-b': 1, 'sub-c': 1 },
      totalActivities: 11,
    }
    const subareas = [
      makeSubarea({ id: 'sub-a', name: 'Ejercicio', slug: 'ejercicio' }),
      makeSubarea({ id: 'sub-b', name: 'Nutrición', slug: 'nutricion' }),
      makeSubarea({ id: 'sub-c', name: 'Sueño', slug: 'sueno' }),
    ]
    const alerts = evaluateAlertRules([], subareas, stats)
    const balance = alerts.find((a) => a.rule === 'balance')
    expect(balance).toBeDefined()
    expect(balance?.type).toBe('warning')
    expect(balance?.canDismiss).toBe(true)
  })

  it('does NOT trigger when activities are well distributed', () => {
    const stats: RecentActivityStats = {
      ...emptyStats(),
      activitiesBySubarea: { 'sub-a': 4, 'sub-b': 3, 'sub-c': 3 },
      totalActivities: 10,
    }
    const alerts = evaluateAlertRules([], [], stats)
    expect(alerts.find((a) => a.rule === 'balance')).toBeUndefined()
  })

  it('does NOT trigger when total activities < minimum (5)', () => {
    const stats: RecentActivityStats = {
      ...emptyStats(),
      activitiesBySubarea: { 'sub-a': 4 },
      totalActivities: 4,
    }
    const alerts = evaluateAlertRules([], [], stats)
    expect(alerts.find((a) => a.rule === 'balance')).toBeUndefined()
  })
})

// ─── Tests: Crisis Sueño ──────────────────────────────────────────────────────

describe('evaluateAlertRules — crisis_sueno', () => {
  it('triggers CRITICAL when sleep behavioral score < 30 for 3 consecutive days', () => {
    const stats: RecentActivityStats = {
      ...emptyStats(),
      sleepScores: [
        { behavioralScore: 20, scoredAt: '2026-03-10' },
        { behavioralScore: 15, scoredAt: '2026-03-11' },
        { behavioralScore: 10, scoredAt: '2026-03-12' },
      ],
    }
    const alerts = evaluateAlertRules([], [], stats)
    const crisis = alerts.find((a) => a.rule === 'crisis_sueno')
    expect(crisis).toBeDefined()
    expect(crisis?.type).toBe('critical')
    expect(crisis?.canDismiss).toBe(false)
  })

  it('does NOT trigger when only 2 days of poor sleep data', () => {
    const stats: RecentActivityStats = {
      ...emptyStats(),
      sleepScores: [
        { behavioralScore: 20, scoredAt: '2026-03-11' },
        { behavioralScore: 15, scoredAt: '2026-03-12' },
      ],
    }
    const alerts = evaluateAlertRules([], [], stats)
    expect(alerts.find((a) => a.rule === 'crisis_sueno')).toBeUndefined()
  })

  it('does NOT trigger when at least one day has good sleep score', () => {
    const stats: RecentActivityStats = {
      ...emptyStats(),
      sleepScores: [
        { behavioralScore: 20, scoredAt: '2026-03-10' },
        { behavioralScore: 60, scoredAt: '2026-03-11' }, // good
        { behavioralScore: 10, scoredAt: '2026-03-12' },
      ],
    }
    const alerts = evaluateAlertRules([], [], stats)
    expect(alerts.find((a) => a.rule === 'crisis_sueno')).toBeUndefined()
  })
})

// ─── Tests: Progresión ────────────────────────────────────────────────────────

describe('evaluateAlertRules — progresion', () => {
  it('triggers INFO when L1+L2 areas have avg > 80 for 90 days', () => {
    const l1 = makeArea({ maslowLevel: 1, currentScore: 90 })
    const l2 = makeArea({ maslowLevel: 2, currentScore: 85 })
    const stats: RecentActivityStats = {
      ...emptyStats(),
      l1l2ScoreHistory: {
        ...scoreHistory(l1.id, 90, 85),
        ...scoreHistory(l2.id, 90, 82),
      },
    }
    const alerts = evaluateAlertRules([l1, l2], [], stats)
    const prog = alerts.find((a) => a.rule === 'progresion')
    expect(prog).toBeDefined()
    expect(prog?.type).toBe('info')
    expect(prog?.canDismiss).toBe(true)
  })

  it('does NOT trigger when history is < 90 days', () => {
    const l1 = makeArea({ maslowLevel: 1, currentScore: 90 })
    const l2 = makeArea({ maslowLevel: 2, currentScore: 85 })
    const stats: RecentActivityStats = {
      ...emptyStats(),
      l1l2ScoreHistory: {
        ...scoreHistory(l1.id, 30, 85),
        ...scoreHistory(l2.id, 30, 82),
      },
    }
    const alerts = evaluateAlertRules([l1, l2], [], stats)
    expect(alerts.find((a) => a.rule === 'progresion')).toBeUndefined()
  })

  it('does NOT trigger when there is only 1 L1/L2 area', () => {
    const l1 = makeArea({ maslowLevel: 1, currentScore: 90 })
    const stats: RecentActivityStats = {
      ...emptyStats(),
      l1l2ScoreHistory: scoreHistory(l1.id, 90, 85),
    }
    const alerts = evaluateAlertRules([l1], [], stats)
    expect(alerts.find((a) => a.rule === 'progresion')).toBeUndefined()
  })
})

// ─── Tests: Ordering ──────────────────────────────────────────────────────────

describe('evaluateAlertRules — ordering', () => {
  it('sorts alerts: critical → warning → info', () => {
    const l1 = makeArea({ maslowLevel: 1, currentScore: 30 })
    const l2 = makeArea({ maslowLevel: 2, currentScore: 85 })
    const subareas = [makeSubarea({ id: 'sub-a', name: 'A', slug: 'a' })]

    const stats: RecentActivityStats = {
      activitiesBySubarea: { 'sub-a': 9, 'sub-b': 1 },
      totalActivities: 10,
      l1l2ScoreHistory: {
        ...scoreHistory(l1.id, 14, 25),
        ...scoreHistory(l2.id, 90, 85),
      },
      sleepScores: [],
    }

    const alerts = evaluateAlertRules([l1, l2], subareas, stats)
    const typeOrder = alerts.map((a) => a.type)
    const critIdx = typeOrder.indexOf('critical')
    const warnIdx = typeOrder.indexOf('warning')
    const infoIdx = typeOrder.indexOf('info')

    // critical must come before warning (if both present)
    if (critIdx !== -1 && warnIdx !== -1) expect(critIdx).toBeLessThan(warnIdx)
    // warning must come before info (if both present)
    if (warnIdx !== -1 && infoIdx !== -1) expect(warnIdx).toBeLessThan(infoIdx)
  })
})
