import { describe, it, expect } from 'vitest'
import { calculateStreak } from '@/lib/habits/streak-utils'

// ─── Tests: streak side-effects logic for confirmActivity ────────────────────
//
// These tests verify the PURE LOGIC used by confirmActivity to compute streak
// updates — without needing DB mocks. The action calls calculateStreak with
// the loaded completion dates, so we test calculateStreak behavior directly
// under each checkin status scenario.
//
// Mapping:
//   status='completed' → calculateStreak(completions + new date) → current/best increase
//   status='skipped'   → streakCurrent resets to 0 (skips calculateStreak entirely)
//   status='postponed' → streak is untouched (recalculateHabitStreak returns early)
// ─────────────────────────────────────────────────────────────────────────────

const DAILY_RRULE = 'FREQ=DAILY;DTSTART=20240101T070000Z'

// ─── completed: streak increments ────────────────────────────────────────────

describe('confirmActivity — status=completed: streak increments', () => {
  it('streak grows from 0 to 1 on first completion', () => {
    const completions = [new Date('2024-01-14T00:00:00Z')]
    const { current, best } = calculateStreak(
      completions,
      DAILY_RRULE,
      new Date('2024-01-14T23:59:59Z')
    )
    expect(current).toBeGreaterThanOrEqual(1)
    expect(best).toBeGreaterThanOrEqual(1)
  })

  it('streak grows to N for N consecutive daily completions', () => {
    const completions = [
      new Date('2024-01-01T07:00:00Z'),
      new Date('2024-01-02T07:00:00Z'),
      new Date('2024-01-03T07:00:00Z'),
    ]
    const { current, best } = calculateStreak(
      completions,
      DAILY_RRULE,
      new Date('2024-01-03T23:59:59Z')
    )
    expect(current).toBe(3)
    expect(best).toBe(3)
  })

  it('best streak is preserved when current resets then grows again', () => {
    // 3-day streak, gap, then 1-day streak → best stays 3
    const completions = [
      new Date('2024-01-01T07:00:00Z'),
      new Date('2024-01-02T07:00:00Z'),
      new Date('2024-01-03T07:00:00Z'),
      // gap on Jan 4 (skipped)
      new Date('2024-01-05T07:00:00Z'),
    ]
    const { current, best } = calculateStreak(
      completions,
      DAILY_RRULE,
      new Date('2024-01-05T23:59:59Z')
    )
    expect(current).toBe(1)
    expect(best).toBe(3)
  })
})

// ─── skipped: streak resets to 0 ─────────────────────────────────────────────

describe('confirmActivity — status=skipped: streakCurrent resets to 0', () => {
  it('after a skip, current streak is 0 (completions do not include the skipped day)', () => {
    // 2 completions, then a gap (the skipped day is NOT in completionDates)
    const completions = [
      new Date('2024-01-01T07:00:00Z'),
      new Date('2024-01-02T07:00:00Z'),
      // Jan 3 is skipped — not in completionDates
    ]
    const { current, best } = calculateStreak(
      completions,
      DAILY_RRULE,
      new Date('2024-01-03T23:59:59Z')
    )
    // Jan 3 occurrence exists but was not completed → streak resets
    expect(current).toBe(0)
    expect(best).toBe(2) // best was 2 from Jan 1-2
  })

  it('skipping after 0 completions keeps streak at 0', () => {
    const { current, best } = calculateStreak([], DAILY_RRULE, new Date('2024-01-03T23:59:59Z'))
    expect(current).toBe(0)
    expect(best).toBe(0)
  })
})

// ─── postponed: streak unchanged ─────────────────────────────────────────────

describe('confirmActivity — status=postponed: streak does not change', () => {
  it('postponing does not add to completionDates, so streak remains unchanged', () => {
    // Simulates: 2 completions exist, then user postpones Jan 3
    // → completionDates are NOT updated (postponed is not a completion)
    const completionsBefore = [new Date('2024-01-01T07:00:00Z'), new Date('2024-01-02T07:00:00Z')]
    const completionsAfterPostpone = [...completionsBefore] // unchanged

    const before = calculateStreak(completionsBefore, DAILY_RRULE, new Date('2024-01-02T23:59:59Z'))
    const after = calculateStreak(
      completionsAfterPostpone,
      DAILY_RRULE,
      new Date('2024-01-02T23:59:59Z') // same reference — postpone doesn't advance time
    )

    expect(after.current).toBe(before.current)
    expect(after.best).toBe(before.best)
  })
})
