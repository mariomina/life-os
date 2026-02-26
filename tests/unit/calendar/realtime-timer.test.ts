import { describe, it, expect } from 'vitest'
import { formatElapsed, calcElapsedSeconds } from '@/app/(app)/calendar/_components/CalendarClient'

// Story 5.9 — Supabase Realtime para timer activo
// Tests for pure helper functions: formatElapsed + calcElapsedSeconds

describe('formatElapsed', () => {
  it('returns "0s" for zero seconds', () => {
    expect(formatElapsed(0)).toBe('0s')
  })

  it('returns "0s" for negative seconds', () => {
    expect(formatElapsed(-5)).toBe('0s')
  })

  it('returns seconds only when under 1 minute', () => {
    expect(formatElapsed(45)).toBe('45s')
  })

  it('returns minutes and seconds for 1m 30s', () => {
    expect(formatElapsed(90)).toBe('1m 30s')
  })

  it('returns hours and minutes for >= 1 hour', () => {
    expect(formatElapsed(3665)).toBe('1h 1m')
  })

  it('returns hours only when minutes are zero', () => {
    expect(formatElapsed(3600)).toBe('1h')
  })

  it('returns "59s" for 59 seconds', () => {
    expect(formatElapsed(59)).toBe('59s')
  })

  it('returns "1m 0s" for exactly 60 seconds', () => {
    expect(formatElapsed(60)).toBe('1m 0s')
  })
})

describe('calcElapsedSeconds', () => {
  it('calculates elapsed seconds correctly', () => {
    const start = new Date('2026-01-01T10:00:00.000Z')
    const now = new Date('2026-01-01T10:00:30.000Z')
    expect(calcElapsedSeconds(start, now)).toBe(30)
  })

  it('returns 0 when now is in the future relative to startedAt (clock skew)', () => {
    const start = new Date('2026-01-01T10:00:30.000Z')
    const now = new Date('2026-01-01T10:00:00.000Z')
    expect(calcElapsedSeconds(start, now)).toBe(0)
  })

  it('returns 0 when start equals now', () => {
    const t = new Date('2026-01-01T10:00:00.000Z')
    expect(calcElapsedSeconds(t, t)).toBe(0)
  })

  it('calculates elapsed for several minutes', () => {
    const start = new Date('2026-01-01T09:00:00.000Z')
    const now = new Date('2026-01-01T09:05:45.000Z')
    expect(calcElapsedSeconds(start, now)).toBe(345) // 5 * 60 + 45
  })

  it('truncates fractional seconds (floor)', () => {
    const start = new Date('2026-01-01T10:00:00.000Z')
    const now = new Date('2026-01-01T10:00:00.999Z')
    expect(calcElapsedSeconds(start, now)).toBe(0) // < 1 second → 0
  })

  it('calculates elapsed for over an hour', () => {
    const start = new Date('2026-01-01T08:00:00.000Z')
    const now = new Date('2026-01-01T09:30:00.000Z')
    expect(calcElapsedSeconds(start, now)).toBe(5400) // 1.5h = 5400s
  })
})
