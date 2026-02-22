import { describe, it, expect } from 'vitest'
import { MAX_ANNUAL_OKRS } from '@/lib/utils/okr-constants'

// ─── Helper pura que replica la lógica de la Server Action ───────────────────
// La validación en actions/okrs.ts es: activeCount >= MAX_ANNUAL_OKRS → error
// Aquí la testeamos como función pura para aislarla de la DB.

function canCreateAnnualOKR(activeCount: number): boolean {
  return activeCount < MAX_ANNUAL_OKRS
}

function countActiveOKRs(
  okrs: Array<{ status: 'active' | 'completed' | 'cancelled' | 'paused'; year: number }>,
  year: number
): number {
  return okrs.filter((o) => o.status === 'active' && o.year === year).length
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Buffett 5/25 rule — MAX_ANNUAL_OKRS constant', () => {
  it('MAX_ANNUAL_OKRS is 3', () => {
    expect(MAX_ANNUAL_OKRS).toBe(3)
  })
})

describe('canCreateAnnualOKR', () => {
  it('returns true when activeCount is 0', () => {
    expect(canCreateAnnualOKR(0)).toBe(true)
  })

  it('returns true when activeCount is 1', () => {
    expect(canCreateAnnualOKR(1)).toBe(true)
  })

  it('returns true when activeCount is 2 (MAX - 1)', () => {
    expect(canCreateAnnualOKR(2)).toBe(true)
  })

  it('returns false when activeCount equals MAX_ANNUAL_OKRS (3)', () => {
    expect(canCreateAnnualOKR(3)).toBe(false)
  })

  it('returns false when activeCount exceeds MAX_ANNUAL_OKRS', () => {
    expect(canCreateAnnualOKR(4)).toBe(false)
    expect(canCreateAnnualOKR(10)).toBe(false)
  })
})

describe('countActiveOKRs — solo cuenta status=active del año correcto', () => {
  const currentYear = 2026

  it('returns 0 when no OKRs exist', () => {
    expect(countActiveOKRs([], currentYear)).toBe(0)
  })

  it('returns 0 when all OKRs are cancelled', () => {
    const okrs = [
      { status: 'cancelled' as const, year: currentYear },
      { status: 'cancelled' as const, year: currentYear },
      { status: 'cancelled' as const, year: currentYear },
    ]
    expect(countActiveOKRs(okrs, currentYear)).toBe(0)
  })

  it('returns 0 when all OKRs are completed', () => {
    const okrs = [{ status: 'completed' as const, year: currentYear }]
    expect(countActiveOKRs(okrs, currentYear)).toBe(0)
  })

  it('counts only active OKRs', () => {
    const okrs = [
      { status: 'active' as const, year: currentYear },
      { status: 'cancelled' as const, year: currentYear },
      { status: 'active' as const, year: currentYear },
      { status: 'paused' as const, year: currentYear },
    ]
    expect(countActiveOKRs(okrs, currentYear)).toBe(2)
  })

  it('returns 3 when exactly 3 active OKRs → Buffett limit reached', () => {
    const okrs = [
      { status: 'active' as const, year: currentYear },
      { status: 'active' as const, year: currentYear },
      { status: 'active' as const, year: currentYear },
    ]
    expect(countActiveOKRs(okrs, currentYear)).toBe(3)
    expect(canCreateAnnualOKR(countActiveOKRs(okrs, currentYear))).toBe(false)
  })

  it('does NOT count OKRs from a different year', () => {
    const okrs = [
      { status: 'active' as const, year: 2025 },
      { status: 'active' as const, year: 2025 },
      { status: 'active' as const, year: 2025 },
    ]
    expect(countActiveOKRs(okrs, currentYear)).toBe(0)
    expect(canCreateAnnualOKR(0)).toBe(true)
  })

  it('counts correctly with mixed years', () => {
    const okrs = [
      { status: 'active' as const, year: currentYear },
      { status: 'active' as const, year: 2025 }, // diferente año — no cuenta
      { status: 'active' as const, year: currentYear },
    ]
    expect(countActiveOKRs(okrs, currentYear)).toBe(2)
  })
})
