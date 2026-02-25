import { describe, it, expect } from 'vitest'
import { calculateStreak } from '@/lib/habits/streak-utils'

// rrule daily at 07:00 UTC — used as base for all tests
const DAILY_RRULE = 'FREQ=DAILY;DTSTART=20240101T070000Z;BYHOUR=7;BYMINUTE=0;BYSECOND=0'

// ─── Tests: calculateStreak ───────────────────────────────────────────────────

describe('calculateStreak — consecutive completions', () => {
  it('3 consecutive completions yield streak=3', () => {
    const completions = [
      new Date('2024-01-01T07:00:00Z'),
      new Date('2024-01-02T07:00:00Z'),
      new Date('2024-01-03T07:00:00Z'),
    ]
    const reference = new Date('2024-01-03T23:59:59Z')

    const result = calculateStreak(completions, DAILY_RRULE, reference)

    expect(result.current).toBe(3)
    expect(result.best).toBe(3)
  })
})

describe('calculateStreak — streak resets on gap', () => {
  it('resets streak to 0 when an occurrence is missed', () => {
    // Complete Jan 1, skip Jan 2, complete Jan 3
    const completions = [new Date('2024-01-01T07:00:00Z'), new Date('2024-01-03T07:00:00Z')]
    const reference = new Date('2024-01-03T23:59:59Z')

    const result = calculateStreak(completions, DAILY_RRULE, reference)

    // After the gap on Jan 2, streak resets; Jan 3 alone = 1
    expect(result.current).toBe(1)
    // Best was 1 (only Jan 1 before the reset)
    expect(result.best).toBe(1)
  })
})

describe('calculateStreak — streakBest never decreases', () => {
  it('streakBest stays at 3 even after streak drops back to 1', () => {
    // Complete Jan 1-3, skip Jan 4, complete Jan 5
    const completions = [
      new Date('2024-01-01T07:00:00Z'),
      new Date('2024-01-02T07:00:00Z'),
      new Date('2024-01-03T07:00:00Z'),
      new Date('2024-01-05T07:00:00Z'),
    ]
    const reference = new Date('2024-01-05T23:59:59Z')

    const result = calculateStreak(completions, DAILY_RRULE, reference)

    expect(result.current).toBe(1)
    expect(result.best).toBe(3)
  })

  it('returns { current: 0, best: 0 } when no completions exist', () => {
    const result = calculateStreak([], DAILY_RRULE, new Date('2024-01-07T23:59:59Z'))

    expect(result.current).toBe(0)
    expect(result.best).toBe(0)
  })
})
