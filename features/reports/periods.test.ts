// features/reports/periods.test.ts
// Story 8.1 — Tests para getPeriodRange.

import { describe, it, expect } from 'vitest'
import { getPeriodRange } from './periods'

describe('getPeriodRange', () => {
  const now = new Date('2026-03-01T12:00:00.000Z')

  it('week: from = now - 7 days', () => {
    const { from, to } = getPeriodRange('week', now)
    expect(to).toBe(now)
    const expected = new Date('2026-02-22T12:00:00.000Z')
    expect(from.getTime()).toBe(expected.getTime())
  })

  it('week: to = now exactly', () => {
    const { to } = getPeriodRange('week', now)
    expect(to).toBe(now)
  })

  it('month: from = now - 30 days', () => {
    const { from } = getPeriodRange('month', now)
    const expected = new Date('2026-01-30T12:00:00.000Z')
    expect(from.getTime()).toBe(expected.getTime())
  })

  it('month: to = now exactly', () => {
    const { to } = getPeriodRange('month', now)
    expect(to).toBe(now)
  })

  it('quarter: from = now - 90 days', () => {
    const { from } = getPeriodRange('quarter', now)
    const expected = new Date('2025-12-01T12:00:00.000Z')
    expect(from.getTime()).toBe(expected.getTime())
  })

  it('quarter: to = now exactly', () => {
    const { to } = getPeriodRange('quarter', now)
    expect(to).toBe(now)
  })

  it('does not mutate the now parameter', () => {
    const original = new Date('2026-03-01T12:00:00.000Z')
    const nowCopy = new Date(original.getTime())
    getPeriodRange('quarter', nowCopy)
    expect(nowCopy.getTime()).toBe(original.getTime())
  })

  it('uses current date when now is not provided', () => {
    const before = Date.now()
    const { to } = getPeriodRange('week')
    const after = Date.now()
    expect(to.getTime()).toBeGreaterThanOrEqual(before)
    expect(to.getTime()).toBeLessThanOrEqual(after)
  })
})
