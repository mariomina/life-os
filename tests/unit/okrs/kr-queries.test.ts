import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getKRsByAnnualOKR, getKRsByYear } from '@/lib/db/queries/okrs'
import type { OKR } from '@/lib/db/schema/okrs'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db/client', () => ({
  assertDatabaseUrl: vi.fn(),
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

import { db, assertDatabaseUrl } from '@/lib/db/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeKR(overrides: Partial<OKR> = {}): OKR {
  return {
    id: 'kr-1',
    userId: 'user-1',
    type: 'key_result',
    parentId: 'annual-1',
    areaId: null,
    title: 'Mi KR',
    description: null,
    year: 2026,
    quarter: 'Q1',
    progress: 0,
    krType: 'time_based',
    targetValue: 50,
    targetUnit: 'h',
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

// ─── getKRsByAnnualOKR ────────────────────────────────────────────────────────

describe('getKRsByAnnualOKR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no KRs exist for the annual OKR', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await getKRsByAnnualOKR('user-1', 'annual-1')
    expect(result).toEqual([])
  })

  it('returns KRs for the given annual OKR ordered by quarter', async () => {
    const kr1 = makeKR({ id: 'kr-1', quarter: 'Q1' })
    const kr2 = makeKR({ id: 'kr-2', quarter: 'Q2' })
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([kr1, kr2]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await getKRsByAnnualOKR('user-1', 'annual-1')
    expect(result).toHaveLength(2)
    expect(result[0].quarter).toBe('Q1')
    expect(result[1].quarter).toBe('Q2')
  })

  it('calls assertDatabaseUrl', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getKRsByAnnualOKR('user-1', 'annual-1')
    expect(assertDatabaseUrl).toHaveBeenCalledOnce()
  })
})

// ─── getKRsByYear ─────────────────────────────────────────────────────────────

describe('getKRsByYear', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns KRs for the given year', async () => {
    const kr1 = makeKR({ id: 'kr-1', year: 2026, quarter: 'Q1' })
    const kr2 = makeKR({ id: 'kr-2', year: 2026, quarter: 'Q3' })
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([kr1, kr2]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await getKRsByYear('user-1', 2026)
    expect(result).toHaveLength(2)
    expect(result[0].year).toBe(2026)
    expect(result[1].year).toBe(2026)
  })

  it('calls assertDatabaseUrl', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getKRsByYear('user-1', 2026)
    expect(assertDatabaseUrl).toHaveBeenCalledOnce()
  })
})
